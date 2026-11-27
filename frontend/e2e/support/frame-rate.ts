import type { Page } from '@playwright/test';

/**
 * Gives every animation frame a time of the spec's choosing: 40 frames a second until
 * `slowDown` is called, then 20, one frame after another, whatever the machine running the spec
 * can draw. It also records how many indices each draw call drew, so a spec can tell the models
 * apart.
 */
export async function watchFrames(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const frames = { slow: false, count: 0, drawn: [] as number[] };
    Object.assign(window, { __frames: frames });
    const requestAnimationFrame = window.requestAnimationFrame.bind(window);
    let time: number | undefined;
    let pending: { frame: number; callbacks: FrameRequestCallback[] } | undefined;
    // Callbacks asked for in one frame share the next frame and its time, as the browser's do.
    window.requestAnimationFrame = (callback) => {
      if (!pending) {
        const batch = { frame: 0, callbacks: [] as FrameRequestCallback[] };
        batch.frame = requestAnimationFrame((now) => {
          pending = undefined;
          time = time === undefined ? now : time + (frames.slow ? 50 : 25);
          frames.count++;
          for (const each of batch.callbacks) each(time);
        });
        pending = batch;
      }
      pending.callbacks.push(callback);
      return pending.frame * 1000 + pending.callbacks.length;
    };
    window.cancelAnimationFrame = (id) => {
      if (!pending || Math.floor(id / 1000) !== pending.frame) return;
      pending.callbacks[(id % 1000) - 1] = () => undefined;
    };
    const drawElements = WebGL2RenderingContext.prototype.drawElements;
    WebGL2RenderingContext.prototype.drawElements = function (
      this: WebGL2RenderingContext,
      mode: number,
      count: number,
      type: number,
      offset: number,
    ) {
      frames.drawn.push(count);
      if (frames.drawn.length > 64) frames.drawn.shift();
      return drawElements.call(this, mode, count, type, offset);
    };
  });
}

/** From now on, frames come 20 a second. */
export async function slowDown(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __frames: { slow: boolean } }).__frames.slow = true;
  });
}

/** The most indices one draw call drew in the latest frames: the surface's model. */
export async function largestDrawn(page: Page): Promise<number> {
  return page.evaluate(() =>
    Math.max(...(window as unknown as { __frames: { drawn: number[] } }).__frames.drawn.slice(-8)),
  );
}

/** How many frames the page has had. */
export async function frameCount(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __frames: { count: number } }).__frames.count);
}
