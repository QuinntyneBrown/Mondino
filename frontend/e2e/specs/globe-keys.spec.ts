// Acceptance Test
// Traces to: L2-009, L2-039
// Description: With keyboard focus the globe turns by a fixed step for each arrow key; the still picture takes no focus, key or drag

import { expect, test } from '../fixtures/test';
import { rememberTeam } from '../support/membership';
import { NORTHWIND_PINS, northwindPinsOf } from '../fixtures/pins';
import { openTheGlobe, pauseTheClock } from '../support/turning';

test.describe('Globe: turned with the arrow keys', () => {
  test('each arrow key turns the focused globe by a step that way', async ({
    page,
    api,
    globePage,
  }) => {
    await openTheGlobe(api, globePage);
    await pauseTheClock(page);
    await page.clock.runFor(100);

    // Given the globe has keyboard focus, named for how it is turned
    await globePage.globe.focus();
    await expect(globePage.globe).toBeFocused();
    await expect(globePage.globe).toHaveAccessibleName(
      'The globe, with your pin. Drag to spin, or use the arrow keys.',
    );
    const before = await globePage.sofiaAt();

    // When the left arrow is pressed, the globe's front turns left by a step
    await page.keyboard.press('ArrowLeft');
    await page.clock.runFor(50);
    const left = await globePage.sofiaAt();
    expect(left.x - before.x).toBeLessThan(-30);

    // And the right arrow turns it back
    await page.keyboard.press('ArrowRight');
    await page.clock.runFor(50);
    const back = await globePage.sofiaAt();
    expect(back.x).toBeCloseTo(before.x, 0);

    // And the up arrow turns its front up, and the down arrow back down
    await page.keyboard.press('ArrowUp');
    await page.clock.runFor(50);
    const up = await globePage.sofiaAt();
    expect(up.y - back.y).toBeLessThan(-30);
    await page.keyboard.press('ArrowDown');
    await page.clock.runFor(50);
    expect((await globePage.sofiaAt()).y).toBeCloseTo(back.y, 0);

    // And the page did not scroll for the keys the globe took
    expect(await globePage.scrolled()).toBe(0);
  });

  test.describe('in a browser without WebGL', () => {
    test.use({ webgl: false });

    test('the still picture takes no focus, so no key turns it', async ({
      api,
      page,
      globePage,
    }) => {
      await rememberTeam(page);
      api.answer('GET', NORTHWIND_PINS, northwindPinsOf('Sofia Bianchi'));
      await globePage.open();

      await expect(globePage.stillPicture).toBeVisible();
      await expect(globePage.stillGlobe).not.toHaveAttribute('tabindex');
      await expect(globePage.stillGlobe).toHaveAccessibleName(
        'A still picture of the globe, with your pin.',
      );
    });
  });
});
