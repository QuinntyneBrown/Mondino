"""Builds the globe's assets in Blender, headless, so the build is repeatable (docs/adr/0012).

    /opt/homebrew/bin/blender --background --factory-startup --python projects/globe/blender/build_globe.py

Run it from `frontend/` after `npm ci` (it reads Natural Earth's land from `world-atlas`). It writes:

- `projects/globe/src/lib/assets/globe-low.glb` and `globe-high.glb`: the model, in two files so
  the globe is drawn from the lighter one first (docs/adr/0030). `GlobeLow` and `GlobeHigh` are the
  sphere at two levels of detail with the land raised from the sea; `Clouds`, in the low file, is
  the smooth shell the clouds are drawn on (and the outline drawn from). Positions and normals
  only: the surface is looked up from the direction of each point, so the model carries no
  texture coordinates.
- `projects/globe/src/lib/assets/surface.png`: where the land is (red), its forest (green), its
  sand (blue) and its ice (alpha), equirectangular, north at the top, 2048 x 1024.
- `projects/globe/src/lib/assets/clouds.png`: where the clouds are (red), 1024 x 512.
- `projects/globe/blender/globe.blend`: the scene the model is exported from.

The masks hold no colour: the scene colours them from the `--color-globe-*` tokens. Everything is
seeded, so a second run writes the same files.
"""

import json
import math
import os
import sys

import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
FRONTEND = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
ASSETS = os.path.join(FRONTEND, "projects", "globe", "src", "lib", "assets")
LAND = os.path.join(FRONTEND, "node_modules", "world-atlas", "land-50m.json")

SURFACE_SIZE = (2048, 1024)
CLOUDS_SIZE = (1024, 512)
# How far the land stands out of the sea, as a share of the globe's radius: enough to read as
# raised and rounded, small enough that the globe stays a ball.
LAND_HEIGHT = 0.012
CLOUD_RADIUS = 1.02
# Longitude and latitude segments of each level of detail.
HIGH = (144, 72)
LOW = (72, 36)
SHELL = (72, 36)

rng = np.random.default_rng(20251027)


# ---------- Natural Earth land, from world-atlas's TopoJSON ----------

def land_rings():
    with open(LAND, encoding="utf-8") as file:
        topology = json.load(file)
    sx, sy = topology["transform"]["scale"]
    tx, ty = topology["transform"]["translate"]
    arcs = []
    for arc in topology["arcs"]:
        points = np.cumsum(np.array(arc, dtype=np.float64), axis=0)
        points[:, 0] = points[:, 0] * sx + tx
        points[:, 1] = points[:, 1] * sy + ty
        arcs.append(points)

    def ring(indices):
        out = []
        for index in indices:
            points = arcs[index] if index >= 0 else arcs[~index][::-1]
            out.append(points if not out else points[1:])
        return np.concatenate(out)

    rings = []
    land = topology["objects"]["land"]
    geometries = land["geometries"] if land["type"] == "GeometryCollection" else [land]
    for geometry in geometries:
        polygons = geometry["arcs"] if geometry["type"] == "MultiPolygon" else [geometry["arcs"]]
        for polygon in polygons:
            for indices in polygon:
                rings.append(ring(indices))
    return rings


def unwrapped(points):
    """A ring that steps across the date line is made continuous; one that circles a pole is not."""
    lon = points[:, 0]
    if np.abs(np.diff(lon)).max(initial=0.0) <= 180.0:
        return points
    continuous = np.degrees(np.unwrap(np.radians(lon)))
    if abs(continuous[-1] - continuous[0]) > 1.0:
        return points
    return np.stack([continuous, points[:, 1]], axis=1)


def rasterise(rings, width, height):
    """
    Even-odd fill of the rings on an equirectangular grid, one sample per pixel centre. The grid is
    three worlds wide, so a ring that reaches past the date line is filled whole, then folded back.
    """
    starts, ends = [], []
    for points in map(unwrapped, rings):
        x = (points[:, 0] + 180.0) / 360.0 * width + width
        y = (90.0 - points[:, 1]) / 180.0 * height
        xy = np.stack([x, y], axis=1)
        starts.append(xy)
        ends.append(np.roll(xy, -1, axis=0))
    a = np.concatenate(starts)
    b = np.concatenate(ends)
    mask = np.zeros((height, 3 * width), dtype=bool)
    columns = np.arange(3 * width) + 0.5
    for row in range(height):
        yc = row + 0.5
        crosses = ((a[:, 1] <= yc) & (b[:, 1] > yc)) | ((b[:, 1] <= yc) & (a[:, 1] > yc))
        if not crosses.any():
            continue
        p, q = a[crosses], b[crosses]
        xs = np.sort(p[:, 0] + (yc - p[:, 1]) * (q[:, 0] - p[:, 0]) / (q[:, 1] - p[:, 1]))
        inside = (np.searchsorted(xs, columns) % 2) == 1
        mask[row] = inside
    return (mask[:, :width] ^ mask[:, width : 2 * width] ^ mask[:, 2 * width :]).astype(np.float32)


def downsample(mask, factor):
    h, w = mask.shape
    return mask.reshape(h // factor, factor, w // factor, factor).mean(axis=(1, 3))


# ---------- Noise on the sphere, so nothing tears at the date line or stretches at the poles ----------

def grid(width, height):
    lon = (np.arange(width) + 0.5) / width * 360.0 - 180.0
    lat = 90.0 - (np.arange(height) + 0.5) / height * 180.0
    return np.meshgrid(lon, lat)


def unit(lon, lat):
    lo, la = np.radians(lon), np.radians(lat)
    return np.stack([np.cos(la) * np.sin(lo), np.sin(la), np.cos(la) * np.cos(lo)], axis=-1)


LATTICE = rng.random((64, 64, 64)).astype(np.float32)


def value_noise(p):
    q = (p % 64.0 + 64.0) % 64.0
    i = np.floor(q).astype(np.int64)
    f = q - i
    f = f * f * (3.0 - 2.0 * f)
    out = 0.0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                weight = (
                    (f[..., 0] if dx else 1 - f[..., 0])
                    * (f[..., 1] if dy else 1 - f[..., 1])
                    * (f[..., 2] if dz else 1 - f[..., 2])
                )
                out = out + weight * LATTICE[(i[..., 0] + dx) % 64, (i[..., 1] + dy) % 64, (i[..., 2] + dz) % 64]
    return out


def fbm(p, octaves=4):
    total, amplitude, norm = 0.0, 1.0, 0.0
    for octave in range(octaves):
        total = total + amplitude * value_noise(p * (2.0 ** octave) + octave * 17.0)
        norm += amplitude
        amplitude *= 0.5
    return total / norm


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def soft_box(lon, lat, west, east, south, north, edge=5.0):
    return (
        smoothstep(west - edge, west + edge, lon)
        * smoothstep(-east - edge, -east + edge, -lon)
        * smoothstep(south - edge, south + edge, lat)
        * smoothstep(-north - edge, -north + edge, -lat)
    )


def blur(mask, radius):
    """A separable box blur three times over, close to a Gaussian; wraps east to west."""
    out = mask.astype(np.float32)
    kernel = np.ones(2 * radius + 1, dtype=np.float32) / (2 * radius + 1)
    for _ in range(3):
        padded = np.concatenate([out[:, -radius:], out, out[:, :radius]], axis=1)
        out = np.apply_along_axis(lambda r: np.convolve(r, kernel, mode="valid"), 1, padded)
        padded = np.concatenate([np.repeat(out[:1], radius, 0), out, np.repeat(out[-1:], radius, 0)], axis=0)
        out = np.apply_along_axis(lambda c: np.convolve(c, kernel, mode="valid"), 0, padded)
    return out


# ---------- The masks ----------

def surface_masks(land):
    height, width = land.shape
    lon, lat = grid(width, height)
    p = unit(lon, lat)
    detail = fbm(p * 9.0)
    blobs = fbm(p * 4.0 + 5.0)

    deserts = np.maximum.reduce([
        soft_box(lon, lat, -17, 33, 16, 31),    # Sahara
        soft_box(lon, lat, 36, 57, 15, 30),     # Arabia
        soft_box(lon, lat, 52, 72, 25, 38),     # Iran and Thar
        soft_box(lon, lat, 118, 145, -31, -19),  # Australia
        soft_box(lon, lat, 15, 25, -28, -19),   # Kalahari
        soft_box(lon, lat, 92, 112, 38, 46),    # Gobi
        soft_box(lon, lat, -117, -104, 28, 37),  # the American south-west
        soft_box(lon, lat, -71, -68, -27, -18),  # Atacama
    ])
    sand = land * smoothstep(0.5, 0.58, deserts + 1.4 * (detail - 0.5))

    forests = np.maximum.reduce([
        soft_box(lon, lat, -76, -44, -16, 6),    # Amazon
        soft_box(lon, lat, 9, 31, -8, 6),        # Congo
        soft_box(lon, lat, 95, 152, -10, 22),    # South-east Asia
        soft_box(lon, lat, -135, -58, 48, 64),   # Canada
        soft_box(lon, lat, 25, 140, 52, 66),     # Scandinavia to Siberia
    ])
    forest = land * (1.0 - sand) * smoothstep(0.5, 0.58, forests + 1.4 * (blobs - 0.5))

    ice = land * np.maximum.reduce([
        smoothstep(-58.0, -62.0, lat),                     # Antarctica
        soft_box(lon, lat, -55, -25, 59, 71, edge=1.5),    # Greenland, south of Iceland's latitude
        soft_box(lon, lat, -73, -11, 70, 84, edge=1.5),    # and north of it
        smoothstep(77.0, 80.0, lat),                       # the high Arctic
    ])
    forest = forest * (1.0 - ice)
    sand = sand * (1.0 - ice)
    return sand, forest, ice


def cloud_mask(width, height):
    """Puffy cartoon clouds: clusters of round lobes scattered over the globe, none at the poles."""
    lon, lat = grid(width, height)
    p = unit(lon, lat)
    clouds = np.zeros((height, width), dtype=np.float32)
    for _ in range(34):
        c_lat = rng.uniform(-55, 60)
        c_lon = rng.uniform(-180, 180)
        lobes = rng.integers(3, 6)
        for lobe in range(lobes):
            offset = (lobe - (lobes - 1) / 2) * rng.uniform(2.6, 3.4)
            l_lon = c_lon + offset / max(0.3, math.cos(math.radians(c_lat)))
            l_lat = c_lat + rng.uniform(-1.2, 1.2) + (1.4 if 0 < lobe < lobes - 1 else 0)
            radius = math.radians(rng.uniform(2.0, 3.6) * (1.2 if 0 < lobe < lobes - 1 else 1.0))
            centre = unit(np.array(l_lon), np.array(l_lat))
            angle = np.arccos(np.clip(p @ centre, -1.0, 1.0))
            clouds = np.maximum(clouds, smoothstep(radius, radius * 0.9, angle))
    return clouds


def save_png(name, channels, path):
    """Writes the channels (each height x width, 0..1, north at the top) as an 8-bit PNG."""
    height, width = channels[0].shape
    rgba = np.zeros((height, width, 4), dtype=np.float32)
    for i, channel in enumerate(channels):
        rgba[..., i] = channel
    if len(channels) < 4:
        rgba[..., 3] = 1.0
    image = bpy.data.images.new(name, width, height, alpha=True)
    image.colorspace_settings.name = "Non-Color"
    # Blender's rows run from the bottom up.
    image.pixels.foreach_set(np.flipud(rgba).ravel())
    image.filepath_raw = path
    image.file_format = "PNG"
    image.save()


# ---------- The model ----------

def bilinear(field, lon, lat):
    height, width = field.shape
    x = (lon + 180.0) / 360.0 * width - 0.5
    y = (90.0 - lat) / 180.0 * height - 0.5
    x0 = np.floor(x).astype(int)
    y0 = np.clip(np.floor(y).astype(int), 0, height - 1)
    y1 = np.clip(y0 + 1, 0, height - 1)
    fx, fy = x - x0, np.clip(y - y0, 0, 1)
    x0, x1 = x0 % width, (x0 + 1) % width
    return (
        field[y0, x0] * (1 - fx) * (1 - fy) + field[y0, x1] * fx * (1 - fy)
        + field[y1, x0] * (1 - fx) * fy + field[y1, x1] * fx * fy
    )


def sphere(name, segments, radius_at):
    """A sphere with shared vertices all round (no seam), so smooth normals have no crease."""
    n_lon, n_lat = segments
    verts = [(0.0, 0.0, radius_at(np.array([0.0]), np.array([90.0]))[0])]
    lons = np.arange(n_lon) / n_lon * 360.0 - 180.0
    for j in range(1, n_lat):
        lat = 90.0 - j * 180.0 / n_lat
        lats = np.full(n_lon, lat)
        radii = radius_at(lons, lats)
        for lon, r in zip(lons, radii):
            # glTF is Y up and faces +Z; Blender is Z up, and the exporter maps (x, y, z) to (x, z, -y).
            lo, la = math.radians(lon), math.radians(lat)
            gx, gy, gz = math.cos(la) * math.sin(lo), math.sin(la), math.cos(la) * math.cos(lo)
            verts.append((r * gx, -r * gz, r * gy))
    south = len(verts)
    verts.append((0.0, 0.0, -radius_at(np.array([0.0]), np.array([-90.0]))[0]))

    def at(j, i):
        return 1 + (j - 1) * n_lon + (i % n_lon)

    faces = []
    for i in range(n_lon):
        faces.append((0, at(1, i + 1), at(1, i)))
    for j in range(1, n_lat - 1):
        for i in range(n_lon):
            faces.append((at(j, i), at(j, i + 1), at(j + 1, i + 1), at(j + 1, i)))
    for i in range(n_lon):
        faces.append((south, at(n_lat - 1, i), at(n_lat - 1, i + 1)))

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    # Faces wind counter-clockwise seen from outside, so every normal points away from the centre.
    outward = sum(p.normal.dot(p.center) for p in mesh.polygons)
    if outward < 0:
        mesh.flip_normals()
        mesh.update()
    mesh.shade_smooth()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def main():
    os.makedirs(ASSETS, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)

    width, height = SURFACE_SIZE
    print("mondino: rasterising Natural Earth's land")
    land = downsample(rasterise(land_rings(), width * 2, height * 2), 2)
    sand, forest, ice = surface_masks(land)
    save_png("surface", [land, forest, sand, ice], os.path.join(ASSETS, "surface.png"))

    print("mondino: drawing the clouds")
    save_png("clouds", [cloud_mask(*CLOUDS_SIZE)], os.path.join(ASSETS, "clouds.png"))

    print("mondino: modelling the globe")
    relief = blur(downsample(land, 4), 3)
    relief = smoothstep(0.15, 0.85, relief)

    def raised(lons, lats):
        return 1.0 + LAND_HEIGHT * bilinear(relief, lons, lats)

    def smooth(radius):
        return lambda lons, lats: np.full(np.shape(lons), radius)

    high = sphere("GlobeHigh", HIGH, raised)
    low = sphere("GlobeLow", LOW, raised)
    clouds = sphere("Clouds", SHELL, smooth(CLOUD_RADIUS))

    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, "globe.blend"), compress=True)
    # The globe is drawn first from the low file, which every device needs; the high file follows
    # while the device keeps the finer step (docs/adr/0030).
    export("globe-low.glb", [low, clouds])
    export("globe-high.glb", [high])
    print("mondino: done")


def export(name, objects):
    """Exports `objects` alone to `name` in the assets."""
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(ASSETS, name),
        use_selection=True,
        export_format="GLB",
        export_yup=True,
        export_normals=True,
        export_texcoords=False,
        export_materials="NONE",
        export_vertex_color="NONE",
        export_cameras=False,
        export_extras=False,
        export_animations=False,
        export_apply=True,
    )


if __name__ == "__main__":
    try:
        main()
    except Exception:  # Blender keeps running after a script fails; make the build fail.
        import traceback

        traceback.print_exc()
        sys.exit(1)
