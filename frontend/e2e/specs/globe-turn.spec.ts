// Acceptance Test
// Traces to: L2-009, L2-042
// Description: Left alone the Globe screen's globe turns eastward on its own; it stops under reduced motion and while the tab is hidden, and resumes where it rested

import { expect, test } from '../fixtures/test';
import {
  changeReducedMotion,
  joinFromMilan,
  letTimePass,
  makeTheTabHideable,
  pauseTheClock,
  setTheTabHidden,
} from '../support/turning';

test.describe('Globe: it turns on its own', () => {
  test('left alone for 5 seconds, the globe has turned eastward', async ({
    page,
    api,
    joinPage,
    globePage,
  }) => {
    // Given the Globe screen, with Sofia's pin in Milan, and no interaction
    await joinFromMilan(api, joinPage, globePage);
    await pauseTheClock(page);
    await page.clock.runFor(100);
    const before = await globePage.youPinAt();

    // When 5 seconds pass
    await letTimePass(page, 5_000);

    // Then the globe has turned eastward: her pin has moved east, to the right
    const after = await globePage.youPinAt();
    expect(after.x - before.x).toBeGreaterThan(20);
  });

  test('under reduced motion the globe does not turn on its own, and the setting is followed live', async ({
    page,
    api,
    joinPage,
    globePage,
  }) => {
    // Given reduced motion is requested
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await joinFromMilan(api, joinPage, globePage);
    await pauseTheClock(page);
    await page.clock.runFor(100);
    const before = await globePage.youPinAt();

    // When 10 seconds pass on the Globe screen
    await letTimePass(page, 10_000);

    // Then the globe has not turned
    expect(await globePage.youPinAt()).toEqual(before);

    // And the setting is followed without a reload: turned off, the globe turns on its own
    await changeReducedMotion(page, false);
    await page.clock.runFor(32);
    await letTimePass(page, 1_000);
    const turning = await globePage.youPinAt();
    expect(turning.x - before.x).toBeGreaterThan(5);

    // And turned on again, it stops where it is
    await changeReducedMotion(page, true);
    await page.clock.runFor(100);
    const stopped = await globePage.youPinAt();
    await letTimePass(page, 2_000);
    expect(await globePage.youPinAt()).toEqual(stopped);
  });

  test('while the tab is hidden the globe does not turn, and it resumes where it rested', async ({
    page,
    api,
    joinPage,
    globePage,
  }) => {
    await makeTheTabHideable(page);
    await joinFromMilan(api, joinPage, globePage);
    await pauseTheClock(page);
    await page.clock.runFor(100);

    // Given the tab is hidden
    await setTheTabHidden(page, true);
    const hidden = await globePage.youPinAt();

    // When it stays hidden for 20 seconds
    await letTimePass(page, 20_000);

    // Then the globe has not turned
    expect(await globePage.youPinAt()).toEqual(hidden);

    // And shown again, it turns on from where it rested, a second's turn in a second
    await setTheTabHidden(page, false);
    await page.clock.runFor(32);
    await letTimePass(page, 1_000);
    const shown = await globePage.youPinAt();
    expect(shown.x - hidden.x).toBeGreaterThan(10);
    expect(shown.x - hidden.x).toBeLessThan(40);
  });
});
