// Acceptance Test
// Traces to: L2-009, L2-039
// Description: The globe is dragged to spin by mouse or by one finger, rests for 5 seconds after, and a vertical drag it cannot follow scrolls the page on a phone

import { expect, test } from '../fixtures/test';
import { joinFromMilan, letTimePass, pauseTheClock } from '../support/turning';

test.describe('Globe: dragged to spin', () => {
  test('a mouse drag spins the globe, which turns on its own again 5 seconds after', async ({
    page,
    api,
    joinPage,
    globePage,
  }) => {
    await joinFromMilan(api, joinPage, globePage);
    await pauseTheClock(page);
    await page.clock.runFor(100);
    const before = await globePage.youPinAt();

    // When the teammate drags across the globe to the left
    await globePage.dragWithTheMouse(-120, 0);
    await page.clock.runFor(50);

    // Then the globe spins with the drag: the pin has gone left with it
    const dragged = await globePage.youPinAt();
    expect(dragged.x - before.x).toBeLessThan(-60);

    // And it does not turn on its own until 5 seconds after the drag ends
    await letTimePass(page, 4_800);
    expect(await globePage.youPinAt()).toEqual(dragged);
    await letTimePass(page, 1_200);
    expect((await globePage.youPinAt()).x - dragged.x).toBeGreaterThan(10);
  });
});

test.describe('Globe: dragged to spin on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('one finger spins the globe, and a vertical drag it cannot follow scrolls the page', async ({
    page,
    api,
    joinPage,
    globePage,
  }) => {
    await joinFromMilan(api, joinPage, globePage);
    await globePage.makeRoomToScroll();
    await pauseTheClock(page);
    await page.clock.runFor(100);
    const before = await globePage.youPinAt();

    // When the teammate drags across the globe to the left with one finger
    await globePage.dragWithAFinger(-80, 0);
    await page.clock.runFor(50);

    // Then the globe spins with it
    expect((await globePage.youPinAt()).x - before.x).toBeLessThan(-40);

    // When they drag up across it, the globe takes the drag and the page stays where it is
    await globePage.dragWithAFinger(0, -300);
    await page.clock.runFor(50);
    expect(await globePage.scrolled()).toBe(0);

    // And when they drag up again, with the globe tilted as far as it goes, the page scrolls
    await globePage.dragWithAFinger(0, -200);
    await page.clock.runFor(50);
    await expect.poll(() => globePage.scrolled()).toBeGreaterThan(0);
  });
});
