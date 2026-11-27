import type { Locator } from '@playwright/test';

/** A colour as red, green and blue, 0 to 255. */
export type Rgb = [number, number, number];

/** How bright a colour looks (relative luminance, 0 to 1, without gamma). */
export function brightness([r, g, b]: Rgb): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Where a place is drawn on the 3D globe before it has turned, as a percentage of the globe's box:
 * the camera of ADR 0012 (five radii away, the disc filling 88% of the box) facing 10.1° E,
 * 17.4° N. Null on the far side.
 */
export function placeOnGlobe(latitude: number, longitude: number): { x: number; y: number } | null {
  const rad = Math.PI / 180;
  const [φ0, λ0] = [17.4 * rad, 10.1 * rad];
  const [φ, λ] = [latitude * rad, longitude * rad - λ0];
  const x = Math.cos(φ) * Math.sin(λ);
  const y0 = Math.sin(φ);
  const z0 = Math.cos(φ) * Math.cos(λ);
  const y = y0 * Math.cos(φ0) - z0 * Math.sin(φ0);
  const z = y0 * Math.sin(φ0) + z0 * Math.cos(φ0);
  const distance = 5;
  if (z * (distance - z) - x * x - y * y <= 0) return null;
  const tanHalf = Math.tan(Math.asin(1 / distance)) / 0.88;
  const scale = 1 / ((distance - z) * tanHalf);
  return { x: 50 + 50 * x * scale, y: 50 - 50 * y * scale };
}

/**
 * The average colour of a small square around each point of a picture of `target` (points in % of
 * its box). The screenshot is decoded in the page from its bytes, so no address is made for it.
 */
export async function coloursAt(
  target: Locator,
  points: readonly { x: number; y: number }[],
): Promise<Rgb[]> {
  const png = (await target.screenshot()).toString('base64');
  return target.page().evaluate(
    async ({ png, points }) => {
      const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
      const image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const canvas = new OffscreenCanvas(image.width, image.height);
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      return points.map(({ x, y }) => {
        const size = 5;
        const left = Math.round((x / 100) * image.width) - 2;
        const top = Math.round((y / 100) * image.height) - 2;
        const { data } = context.getImageData(left, top, size, size);
        const sum = [0, 0, 0];
        for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) sum[c] += data[i + c];
        return sum.map((total) => Math.round(total / (size * size))) as [number, number, number];
      });
    },
    { png, points },
  );
}
