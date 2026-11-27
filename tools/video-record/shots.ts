import { mkdirSync } from "node:fs";
import path from "node:path";
import type { Locator, Page } from "@playwright/test";

/**
 * Helpers for a video's `shots.ts`. A shot is a PNG of the running app at double density, saved
 * in the video folder's `shots/`; `film.js` then draws a phone, a tablet or a browser window
 * around it. See docs/videos/README.md, "Screenshots".
 */

/** Where the pictures go: `<video folder>/shots`. */
export const shotsDir = path.resolve(
  process.env["MO_VIDEO_DIR"] ?? ".",
  "shots",
);

/** The four form factors a film shows. */
export const SIZES = {
  XS: { width: 390, height: 780 },
  M: { width: 768, height: 1024 },
  L: { width: 1024, height: 768 },
  XL: { width: 1440, height: 900 },
} as const;
export type Size = keyof typeof SIZES;
export type Theme = "light" | "dark";

/**
 * Sets the window and the colour scheme before a state is opened. Motion stays on: the globe is
 * the 3D one, and it is drawn before a picture is taken.
 */
export async function frame(
  page: Page,
  size: Size,
  theme: Theme = "light",
): Promise<void> {
  await page.setViewportSize(SIZES[size]);
  await page.emulateMedia({ colorScheme: theme });
}

/** Waits until the bundled faces are drawn and stops whatever still moves. */
async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(
    () =>
      new Promise((done) =>
        requestAnimationFrame(() => requestAnimationFrame(done)),
      ),
  );
}

function file(name: string): string {
  mkdirSync(shotsDir, { recursive: true });
  return path.join(shotsDir, `${name}.png`);
}

/** Saves what the window shows as `shots/<name>.png`. */
export async function shot(page: Page, name: string): Promise<void> {
  await settle(page);
  await page.screenshot({
    path: file(name),
    animations: "disabled",
    caret: "hide",
  });
}

/** Saves one region with `pad` CSS pixels of air around it: the close-up of a scene. */
export async function detail(
  region: Locator,
  name: string,
  pad = 16,
): Promise<void> {
  const page = region.page();
  await region.scrollIntoViewIfNeeded();
  await settle(page);
  const box = await region.boundingBox();
  if (!box) throw new Error(`The region of "${name}" is not on the page.`);
  const view = page.viewportSize()!;
  const x = Math.max(0, box.x - pad);
  const y = Math.max(0, box.y - pad);
  await page.screenshot({
    path: file(name),
    animations: "disabled",
    caret: "hide",
    clip: {
      x,
      y,
      width: Math.min(view.width - x, box.x + box.width + pad - x),
      height: Math.min(view.height - y, box.y + box.height + pad - y),
    },
  });
}

/** Brings a region to the top of the window, `offset` pixels down, before a shot. */
export async function bringToTop(region: Locator, offset = 96): Promise<void> {
  await region.evaluate((el, by) => {
    const top = el.getBoundingClientRect().top + window.scrollY - by;
    window.scrollTo({ top, behavior: "instant" as ScrollBehavior });
  }, offset);
}

/** Waits until every picture on the page has arrived. */
export async function pictures(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map(
        (image) => image.complete || image.decode().catch(() => undefined),
      ),
    ),
  );
}

/** Saves the smallest region holding every one of `regions`, with `pad` CSS pixels of air. */
export async function detailAll(
  regions: Locator[],
  name: string,
  pad = 16,
): Promise<void> {
  const page = regions[0].page();
  await regions[0].scrollIntoViewIfNeeded();
  await settle(page);
  const boxes = await Promise.all(regions.map((r) => r.boundingBox()));
  if (boxes.some((b) => !b))
    throw new Error(`A region of "${name}" is not on the page.`);
  const b = boxes as { x: number; y: number; width: number; height: number }[];
  const view = page.viewportSize()!;
  const x = Math.max(0, Math.min(...b.map((r) => r.x)) - pad);
  const y = Math.max(0, Math.min(...b.map((r) => r.y)) - pad);
  const right = Math.min(
    view.width,
    Math.max(...b.map((r) => r.x + r.width)) + pad,
  );
  const bottom = Math.min(
    view.height,
    Math.max(...b.map((r) => r.y + r.height)) + pad,
  );
  await page.screenshot({
    path: file(name),
    animations: "disabled",
    caret: "hide",
    clip: { x, y, width: right - x, height: bottom - y },
  });
}
