// Acceptance Test
// Traces to: L2-009, L2-039
// Description: With keyboard focus the globe turns by a fixed step for each arrow key; the still picture takes no focus, key or drag

import { expect, test } from '../fixtures/test';
import { rememberTeam } from '../support/membership';
import { joinFromMilan, pauseTheClock } from '../support/turning';

test.describe('Globe: turned with the arrow keys', () => {
  test.use({ viewport: { width: 800, height: 600 } });

  test('each arrow key turns the focused globe by a step that way', async ({
    page,
    api,
    joinPage,
    globePage,
  }) => {
    await joinFromMilan(api, joinPage, globePage);
    await pauseTheClock(page);
    await page.clock.runFor(100);

    // Given the globe has keyboard focus, named for how it is turned
    await globePage.globe.focus();
    await expect(globePage.globe).toBeFocused();
    await expect(globePage.globe).toHaveAccessibleName(
      'The globe, with your new pin in Milan. Drag to spin, or use the arrow keys.',
    );
    const before = await globePage.youPinAt();

    // When the left arrow is pressed, the globe's front turns left by a step
    await page.keyboard.press('ArrowLeft');
    await page.clock.runFor(50);
    const left = await globePage.youPinAt();
    expect(left.x - before.x).toBeLessThan(-30);

    // And the right arrow turns it back
    await page.keyboard.press('ArrowRight');
    await page.clock.runFor(50);
    const back = await globePage.youPinAt();
    expect(back.x).toBeCloseTo(before.x, 0);

    // And the up arrow turns its front up, and the down arrow back down
    await page.keyboard.press('ArrowUp');
    await page.clock.runFor(50);
    const up = await globePage.youPinAt();
    expect(up.y - back.y).toBeLessThan(-30);
    await page.keyboard.press('ArrowDown');
    await page.clock.runFor(50);
    expect((await globePage.youPinAt()).y).toBeCloseTo(back.y, 0);

    // And the page did not scroll for the keys the globe took
    expect(await globePage.scrolled()).toBe(0);
  });

  test.describe('in a browser without WebGL', () => {
    test.use({ webgl: false });

    test('the still picture takes no focus, so no key turns it', async ({ page, globePage }) => {
      await rememberTeam(page);
      await globePage.open();

      await expect(globePage.stillPicture).toBeVisible();
      await expect(globePage.stillGlobe).not.toHaveAttribute('tabindex');
      await expect(globePage.stillGlobe).toHaveAccessibleName('The globe, with no pins');
    });
  });
});
