// Acceptance Test
// Traces to: L2-010
// Description: The half of the 3D globe where it is night is shaded from the sun's position at the clock's time, and the shading moves west as time passes

import { expect, test } from '../fixtures/test';
import { NOW } from '../fixtures/now';
import { brightness, coloursAt, placeOnGlobe } from '../support/globe-pixels';
import { rememberTeam } from '../support/membership';

test.describe('Globe: the night side', () => {
  test.beforeEach(async ({ page }) => {
    await rememberTeam(page);
  });

  test('the half facing away from the sun is shaded, and lit when the sun is over it', async ({
    page,
    globePage,
  }) => {
    // The Arabian Sea, where it is 19:05 at the cast's "now", and 07:05 twelve hours later
    const arabianSea = placeOnGlobe(15, 65)!;

    // Given it is 14:05 UTC on 27 October
    await globePage.open();
    await expect(globePage.canvas).toBeVisible();
    const [evening] = await coloursAt(globePage.canvas, [arabianSea]);

    // When it is twelve hours later
    await page.clock.setSystemTime(NOW.getTime() + 12 * 3_600_000);
    await page.reload();
    await expect(globePage.canvas).toBeVisible();
    const [morning] = await coloursAt(globePage.canvas, [arabianSea]);

    // Then the sea that was shaded in the evening is lit in the morning
    expect(brightness(evening)).toBeLessThan(brightness(morning) * 0.75);
  });

  test('when an hour passes, the edge of the shading has moved west', async ({
    page,
    globePage,
  }) => {
    // Off the Horn of Africa the sun sets between 14:05 and 15:05 UTC on 27 October
    const hornOfAfrica = placeOnGlobe(0, 50)!;
    // And west of it, in Kenya, it is still day at 15:05
    const kenya = placeOnGlobe(0, 37)!;

    // Given the Globe screen open at 14:05 UTC
    await globePage.open();
    await expect(globePage.canvas).toBeVisible();
    const [before, kenyaBefore] = await coloursAt(globePage.canvas, [hornOfAfrica, kenya]);

    // When an hour passes with the screen open
    await page.clock.fastForward('01:00:00');

    // Then the shading has reached the Horn of Africa, and not yet Kenya
    await expect
      .poll(async () => brightness((await coloursAt(globePage.canvas, [hornOfAfrica]))[0]))
      .toBeLessThan(brightness(before) * 0.75);
    const [kenyaAfter] = await coloursAt(globePage.canvas, [kenya]);
    expect(brightness(kenyaAfter)).toBeGreaterThan(brightness(kenyaBefore) * 0.9);
  });
});
