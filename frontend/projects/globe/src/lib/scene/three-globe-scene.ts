import {
  ClampToEdgeWrapping,
  Color,
  GLSL3,
  Group,
  LinearMipmapLinearFilter,
  LinearSRGBColorSpace,
  type Material,
  Mesh,
  NoColorSpace,
  PerspectiveCamera,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  Texture,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Position } from '@mondino/api';
import modelUrl from '../assets/globe.glb';
import surfaceUrl from '../assets/surface.png';
import cloudsUrl from '../assets/clouds.png';
import { directionOf } from '../sun/sun-position';
import {
  type DetailStep,
  type GlobePalette,
  type GlobeScene,
  type GlobeSceneOptions,
  GlobeUnavailableError,
  type ProjectedPoint,
  STARTING_ORIENTATION,
} from './globe-scene';

/** The camera's distance from the centre, in globe radii: a gentle perspective. */
const cameraDistance = 5;
/** The share of the box the globe's disc fills, as the mocks' circle of radius 264 in 600 does. */
const discShare = 0.88;
/** Pins fade towards the rim: fully drawn where the surface faces the viewer this much or more. */
const fullDepth = 0.625;

const vertexShader = /* glsl */ `
out vec3 vObject;
out vec3 vNormal;
out vec3 vView;
void main() {
  vObject = position;
  vNormal = normalize(normalMatrix * normal);
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  vView = normalize(-viewPosition.xyz);
  gl_Position = projectionMatrix * viewPosition;
}`;

// Shared by the surface and the clouds: where a point is on the map, the studio light, the night.
const common = /* glsl */ `
layout(location = 0) out highp vec4 fragColour;
in vec3 vObject;
in vec3 vNormal;
in vec3 vView;
uniform vec3 sun;
uniform vec3 night;
const vec3 light = vec3(-0.5, 0.62, 0.6);
const float PI = 3.14159265359;

// The equirectangular map is looked up from the point's direction, so the model needs no
// texture coordinates. The derivatives are wrapped so the date line shows no seam.
vec4 lookup(sampler2D map) {
  vec3 d = normalize(vObject);
  vec2 uv = vec2(atan(d.x, d.z) / (2.0 * PI) + 0.5, 0.5 - asin(clamp(d.y, -1.0, 1.0)) / PI);
  vec2 dx = dFdx(uv);
  vec2 dy = dFdy(uv);
  dx.x -= floor(dx.x + 0.5);
  dy.x -= floor(dy.x + 0.5);
  return textureGrad(map, uv, dx, dy);
}

// Soft, toy-like light from the top left: never black, a little bright where it faces the light.
vec3 lit(vec3 colour, vec3 n) {
  float wrap = dot(n, normalize(light)) * 0.5 + 0.5;
  return colour * mix(0.8, 1.08, wrap);
}

// The half facing away from the sun is shaded in dusk, with a short twilight at its edge.
vec3 shaded(vec3 colour) {
  float dusk = smoothstep(0.06, -0.06, dot(normalize(vObject), sun));
  return mix(colour, night, dusk * 0.55);
}`;

const surfaceShader = /* glsl */ `
${common}
uniform sampler2D surface;
uniform vec3 ocean;
uniform vec3 oceanDeep;
uniform vec3 land;
uniform vec3 landDeep;
uniform vec3 sand;
uniform vec3 ice;
void main() {
  vec4 mask = lookup(surface);
  vec3 n = normalize(vNormal);
  float rim = 1.0 - max(dot(n, vView), 0.0);
  vec3 sea = mix(ocean, oceanDeep, smoothstep(0.3, 0.95, rim) * 0.85);
  vec3 colour = mix(sea, land, mask.r);
  colour = mix(colour, landDeep, mask.g * 0.6);
  colour = mix(colour, sand, mask.b);
  colour = mix(colour, ice, mask.a);
  colour = lit(colour, n);
  // A glossy shine on the sea, top left.
  vec3 halfway = normalize(normalize(light) + vView);
  colour += pow(max(dot(n, halfway), 0.0), 48.0) * 0.35 * (1.0 - mask.r * 0.75);
  fragColour = vec4(shaded(colour), 1.0);
}`;

const cloudShader = /* glsl */ `
${common}
uniform sampler2D clouds;
uniform vec3 cloud;
void main() {
  float amount = lookup(clouds).r;
  if (amount < 0.01) discard;
  vec3 colour = shaded(lit(cloud, normalize(vNormal)));
  fragColour = vec4(colour, amount * 0.92);
}`;

async function fetched(url: string, signal: AbortSignal): Promise<Response> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return response;
}

/** Decodes an image from fetched bytes, so no `blob:` address is made (the CSP allows none). */
async function bitmap(url: string, signal: AbortSignal): Promise<ImageBitmap> {
  const blob = await (await fetched(url, signal)).blob();
  return createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
}

function mask(image: ImageBitmap): Texture {
  const texture = new Texture(image);
  texture.colorSpace = NoColorSpace;
  texture.flipY = false;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/** A colour as written in the token, with no colour-space conversion: the mocks' own values. */
const colour = (css: string) => new Color().setStyle(css.trim(), LinearSRGBColorSpace);

/** The scene, drawn by three.js (ADR 0012). Only `createGlobeScene` imports this module. */
export class ThreeGlobeScene implements GlobeScene {
  private readonly scene = new Scene();
  private readonly globe = new Group();
  private readonly camera: PerspectiveCamera;
  private readonly frameListeners: ((elapsedMs: number) => void)[] = [];
  private frame: number | undefined;
  private running = false;
  private disposed = false;

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly renderer: WebGLRenderer,
    private readonly meshes: { high: Mesh; low: Mesh; clouds: Mesh },
    private readonly surfaceMaterial: ShaderMaterial,
    private readonly cloudMaterial: ShaderMaterial,
    private readonly images: ImageBitmap[],
    private readonly onContextLost: (event: Event) => void,
  ) {
    const halfAngle = Math.atan(Math.tan(Math.asin(1 / cameraDistance)) / discShare);
    this.camera = new PerspectiveCamera((2 * halfAngle * 180) / Math.PI, 1, 0.1, 20);
    this.camera.position.set(0, 0, cameraDistance);
    this.globe.rotation.order = 'XYZ';
    this.globe.rotation.y = (-STARTING_ORIENTATION.longitude * Math.PI) / 180;
    this.globe.rotation.x = (STARTING_ORIENTATION.latitude * Math.PI) / 180;
    this.globe.add(meshes.high, meshes.low, meshes.clouds);
    this.scene.add(this.globe);
    this.globe.updateMatrixWorld();
  }

  static async create(
    canvas: HTMLCanvasElement,
    context: WebGL2RenderingContext,
    options: GlobeSceneOptions,
  ): Promise<ThreeGlobeScene> {
    const { signal } = options;
    const images: ImageBitmap[] = [];
    let meshes: { high: Mesh; low: Mesh; clouds: Mesh };
    try {
      const [model, surface, clouds] = await Promise.all([
        fetched(modelUrl, signal).then((response) => response.arrayBuffer()),
        bitmap(surfaceUrl, signal).then((image) => (images.push(image), image)),
        bitmap(cloudsUrl, signal).then((image) => (images.push(image), image)),
      ]);
      const gltf = await new GLTFLoader().parseAsync(model, '');
      const mesh = (name: string) => {
        const found = gltf.scene.getObjectByName(name);
        if (!(found instanceof Mesh)) throw new Error(`The model has no ${name}`);
        return found;
      };
      meshes = { high: mesh('GlobeHigh'), low: mesh('GlobeLow'), clouds: mesh('Clouds') };
      // The model's own materials are placeholders; Mondino's shader colours it.
      for (const each of Object.values(meshes)) (each.material as Material).dispose();
      if (signal.aborted) throw signal.reason;
      return ThreeGlobeScene.assemble(canvas, context, options, meshes, surface, clouds, images);
    } catch (error) {
      images.forEach((image) => image.close());
      if (signal.aborted) throw signal.reason;
      if (error instanceof GlobeUnavailableError) throw error;
      throw new GlobeUnavailableError('AssetsFailed');
    }
  }

  private static assemble(
    canvas: HTMLCanvasElement,
    context: WebGL2RenderingContext,
    options: GlobeSceneOptions,
    meshes: { high: Mesh; low: Mesh; clouds: Mesh },
    surface: ImageBitmap,
    clouds: ImageBitmap,
    images: ImageBitmap[],
  ): ThreeGlobeScene {
    const renderer = new WebGLRenderer({ canvas, context, antialias: true, alpha: true });
    renderer.outputColorSpace = LinearSRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    const night = { value: new Color() };
    const sun = { value: new Vector3(0, 0, 1) };
    const surfaceMaterial = new ShaderMaterial({
      glslVersion: GLSL3,
      vertexShader,
      fragmentShader: surfaceShader,
      uniforms: {
        surface: { value: mask(surface) },
        ocean: { value: new Color() },
        oceanDeep: { value: new Color() },
        land: { value: new Color() },
        landDeep: { value: new Color() },
        sand: { value: new Color() },
        ice: { value: new Color() },
        night,
        sun,
      },
    });
    const cloudMaterial = new ShaderMaterial({
      glslVersion: GLSL3,
      vertexShader,
      fragmentShader: cloudShader,
      transparent: true,
      depthWrite: false,
      uniforms: { clouds: { value: mask(clouds) }, cloud: { value: new Color() }, night, sun },
    });
    meshes.high.material = surfaceMaterial;
    meshes.low.material = surfaceMaterial;
    meshes.clouds.material = cloudMaterial;
    meshes.clouds.renderOrder = 1;

    const onContextLost = () => options.onContextLost();
    canvas.addEventListener('webglcontextlost', onContextLost);
    const scene = new ThreeGlobeScene(
      canvas,
      renderer,
      meshes,
      surfaceMaterial,
      cloudMaterial,
      images,
      onContextLost,
    );
    scene.setDetail(options.detail);
    return scene;
  }

  resize(width: number, height: number): void {
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }

  setSun(subsolar: Position): void {
    (this.surfaceMaterial.uniforms['sun'].value as Vector3).set(...directionOf(subsolar));
    this.invalidate();
  }

  setDetail(step: DetailStep): void {
    this.renderer.setPixelRatio(step.pixelRatio);
    this.meshes.high.visible = step.modelDetail === 'High';
    this.meshes.low.visible = step.modelDetail === 'Low';
    this.invalidate();
  }

  setPalette(palette: GlobePalette): void {
    const surface = this.surfaceMaterial.uniforms;
    surface['ocean'].value = colour(palette.ocean);
    surface['oceanDeep'].value = colour(palette.oceanDeep);
    surface['land'].value = colour(palette.land);
    surface['landDeep'].value = colour(palette.landDeep);
    surface['sand'].value = colour(palette.sand);
    surface['ice'].value = colour(palette.ice);
    (surface['night'].value as Color).copy(colour(palette.night));
    this.cloudMaterial.uniforms['cloud'].value = colour(palette.cloud);
    this.invalidate();
  }

  project(position: Position): ProjectedPoint | null {
    const point = new Vector3(...directionOf(position)).applyMatrix4(this.globe.matrixWorld);
    const toCamera = this.camera.position.clone().sub(point);
    if (point.dot(toCamera) <= 0) return null;
    const facing = point.z;
    const ndc = point.project(this.camera);
    const round = (value: number, places: number) => Number(value.toFixed(places));
    return {
      x: round(((ndc.x + 1) / 2) * 100, 2),
      y: round(((1 - ndc.y) / 2) * 100, 2),
      depth: round(Math.min(1, facing / fullDepth), 3),
    };
  }

  onFrame(listener: (elapsedMs: number) => void): void {
    this.frameListeners.push(listener);
  }

  start(): void {
    this.running = true;
    this.invalidate();
  }

  stop(): void {
    this.running = false;
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.frameListeners.length = 0;
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    for (const mesh of Object.values(this.meshes)) mesh.geometry.dispose();
    for (const material of [this.surfaceMaterial, this.cloudMaterial]) {
      (material.uniforms['surface']?.value as Texture | undefined)?.dispose();
      (material.uniforms['clouds']?.value as Texture | undefined)?.dispose();
      material.dispose();
    }
    this.images.forEach((image) => image.close());
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  /** Draws one frame when the next one comes, if the scene is running; on demand, never in a loop. */
  private invalidate(): void {
    if (!this.running || this.frame !== undefined) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = undefined;
      const started = performance.now();
      this.renderer.render(this.scene, this.camera);
      const elapsed = performance.now() - started;
      for (const listener of [...this.frameListeners]) listener(elapsed);
    });
  }
}
