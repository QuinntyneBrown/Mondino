// Performance sweep: the heap checks. Runs only when a person asks: npm run e2e:performance
// Traces to: L2-047
// Description: The heap after garbage collection stays within 5% over 8 simulated hours on the Globe, and across 20 enters and leaves of the Globe, a team of 500, Team and Moments

import type { Locator } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import { NORTHWIND_MOMENTS, northwindMoments, momentsOf500 } from '../fixtures/moments';
import { NORTHWIND_PINS, northwindPins, teamOf500 } from '../fixtures/pins';
import { heapAfterCollection } from '../support/heap';
import { watchWhatIsHeld, whatIsHeld } from '../support/globe-resources';
import { rememberTeam } from '../support/membership';

/** What a heap may grow by between the first measure and the last (L2-047). */
const Growth = 1.05;

test.describe('Steady memory: the heap', () => {
  test.setTimeout(300_000);

  test('the Globe left open for 8 simulated hours with the clock ticking grows its heap by 5% at most', async ({
    api,
    page,
    globePage,
  }) => {
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());
    await globePage.open();
    await expect(globePage.canvas).toBeVisible();
    await page.clock.runFor(60_000);
    const start = await heapAfterCollection(page);

    // Every minute for 8 hours: each clock tick, each night side and each 15-minute refresh
    for (let minute = 0; minute < 8 * 60; minute++) await page.clock.runFor(60_000);
    await expect(globePage.counts).toBeVisible();

    expect(await heapAfterCollection(page)).toBeLessThanOrEqual(start * Growth);
  });

  const screens = ['the Globe', 'Team', 'Moments'] as const;

  for (const [team, pins] of [
    ['the cast', northwindPins()],
    ['a team of 500', teamOf500()],
  ] as const)
    for (const screen of screens)
      test(`entering and leaving ${screen} 20 times with ${team} keeps the heap within 5% of the first visit`, async ({
        api,
        page,
        notFoundPage,
        globePage,
        teamPage,
        momentsPage,
      }) => {
        await watchWhatIsHeld(page);
        await rememberTeam(page);
        api.answer('GET', NORTHWIND_PINS, pins);
        const answered = pins.json as {
          pins: { teammateId: string; name: string; cityName: string; timeZoneId: string }[];
        };
        api.answer('GET', NORTHWIND_MOMENTS, {
          json: team === 'the cast' ? northwindMoments().json : momentsOf500(answered.pins),
        });
        const path = { 'the Globe': '/globe', Team: '/team', Moments: '/moments' }[screen];
        const shown: Locator = {
          'the Globe': globePage.canvas,
          Team: teamPage.title,
          Moments: momentsPage.title,
        }[screen];
        await notFoundPage.open('/somewhere-else');

        // One visit inside the app, as the router makes it, measured after it is left
        const visit = async () => {
          await page.evaluate((to) => {
            history.pushState(null, '', to);
            dispatchEvent(new PopStateEvent('popstate'));
          }, path);
          await expect(shown).toBeVisible();
          await page.goBack();
          await expect(notFoundPage.main).toBeVisible();
        };
        await visit();
        const first = await heapAfterCollection(page);
        for (let time = 1; time < 20; time++) await visit();

        expect(await heapAfterCollection(page)).toBeLessThanOrEqual(first * Growth);
        // And nothing of the globe is left: no live context, observer or listener
        const held = await whatIsHeld(page);
        expect(held.liveContexts).toBe(0);
        expect(held.observing).toBe(0);
      });
});
