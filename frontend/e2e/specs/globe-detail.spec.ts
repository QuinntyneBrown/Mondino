// Acceptance Test
// Traces to: L2-046, L2-008
// Description: A device whose frame rate stays under 30 draws the globe at a lower resolution and a lighter model (one that keeps up is DetailLevel's unit tests')

import { expect, test } from '../fixtures/test';
import { frameCount, largestDrawn, slowDown, watchFrames } from '../support/frame-rate';
import { rememberTeam } from '../support/membership';
import { NORTHWIND_PINS, northwindPinsOf } from '../fixtures/pins';

test.describe('Globe: stepping down on a slow device', () => {
  // A small screen of two device pixels to the CSS pixel, so the frames come quickly
  test.use({ deviceScaleFactor: 2, viewport: { width: 320, height: 480 } });

  test.beforeEach(async ({ api, page, globePage }) => {
    await watchFrames(page);
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPinsOf('Sofia Bianchi'));

    // Given the Globe turning on its own, drawn from the finer model once it has followed the
    // first frame
    const finer = page.waitForResponse(/\/media\/globe-high-\w+\.glb$/);
    await globePage.open();
    await expect(globePage.canvas).toBeVisible();
    await finer;
    await expect.poll(() => largestDrawn(page)).toBeGreaterThan(20_000);
  });

  test('a frame rate under 30 for 3 seconds lowers the resolution and the model', async ({
    page,
    globePage,
  }) => {
    const box = (await globePage.canvas.boundingBox())!;
    await expect(globePage.canvas).toHaveJSProperty('width', Math.floor(box.width * 2));
    const finer = await largestDrawn(page);

    // When its frames come 4 a second for 3 seconds
    await slowDown(page);

    // Then it is drawn at one device pixel to the CSS pixel, from the lighter model
    await expect(globePage.canvas).toHaveJSProperty('width', Math.floor(box.width), {
      timeout: 15_000,
    });
    await expect.poll(() => largestDrawn(page)).toBeLessThan(finer);
    const lighter = await largestDrawn(page);

    // And it stays there while the frames stay slow, still turning
    const count = await frameCount(page);
    await expect.poll(() => frameCount(page), { timeout: 15_000 }).toBeGreaterThan(count + 3);
    await expect(globePage.canvas).toHaveJSProperty('width', Math.floor(box.width));
    expect(await largestDrawn(page)).toBe(lighter);
  });
});
