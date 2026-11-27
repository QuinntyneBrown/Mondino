// Acceptance Test
// Traces to: L2-009, L2-042
// Description: Told to face a pin, the globe turns to it within a second and holds there, at once under reduced motion; shown on Join, which turns to the city found

import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import {
  lookupAnswer,
  NORTHWIND_INVITE,
  NORTHWIND_LOOKUPS,
  northwindInvite,
} from '../fixtures/invites';
import type { JoinPage } from '../pages/join.page';
import { letTimePass, pauseTheClock } from '../support/turning';

/** Runs the paused clock in short steps until the person's own pin is on the globe. */
async function untilThePinIsPlaced(page: Page, joinPage: JoinPage): Promise<void> {
  await expect
    .poll(async () => {
      await page.clock.runFor(16);
      return joinPage.youLabel.count();
    })
    .toBe(1);
}

/** How far a place is from the centre of the globe's box, in % of its width and height. */
const offCentre = ({ x, y }: { x: number; y: number }) => Math.hypot(x - 50, y - 50);

test.describe('Globe: turns to a pin and holds', () => {
  test.beforeEach(async ({ api }) => {
    api.answer('GET', NORTHWIND_INVITE, northwindInvite());
    api.answer('POST', NORTHWIND_LOOKUPS, (route) => lookupAnswer(route.request().postDataJSON()));
  });

  test('the globe turns to the new pin within a second, and holds there', async ({
    page,
    joinPage,
  }) => {
    await joinPage.open('northwind-7Kq2');
    await expect(joinPage.canvas).toBeVisible();
    await pauseTheClock(page);

    // When Sofia's postal code is found in Milan and her pin is placed
    await joinPage.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });
    await joinPage.leavePostalCode();
    await untilThePinIsPlaced(page, joinPage);
    const placed = await joinPage.youPinPlace();
    expect(offCentre(placed)).toBeGreaterThan(5);

    // Then the globe turns towards her pin, and within a second her pin faces the viewer
    await letTimePass(page, 400);
    const turning = offCentre(await joinPage.youPinPlace());
    expect(turning).toBeLessThan(offCentre(placed));
    expect(turning).toBeGreaterThan(0.5);
    await letTimePass(page, 568);
    // The pin drawn for the last frame is rendered before it is read
    await page.clock.runFor(32);
    const facing = await joinPage.youPinPlace();
    expect(offCentre(facing)).toBeLessThan(0.5);

    // And it stays there
    await letTimePass(page, 10_000);
    expect(await joinPage.youPinPlace()).toEqual(facing);
  });

  test('under reduced motion the globe faces the new pin at once, without a turn', async ({
    page,
    joinPage,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await joinPage.open('northwind-7Kq2');
    await expect(joinPage.canvas).toBeVisible();
    await pauseTheClock(page);

    await joinPage.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });
    await joinPage.leavePostalCode();
    await untilThePinIsPlaced(page, joinPage);
    await page.clock.runFor(50);

    expect(offCentre(await joinPage.youPinPlace())).toBeLessThan(0.5);
  });
});
