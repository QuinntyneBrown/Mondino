// Acceptance Test
// Traces to: L2-047, L2-014
// Description: One clock drives every local time however many pins there are, and leaving a screen cancels the request it is waiting on

import { expect, test } from '../fixtures/test';
import { rememberTeam } from '../support/membership';
import { ticking, watchTimers } from '../support/timers';
import { NORTHWIND_PINS, northwindPins, teamOf500 } from '../fixtures/pins';
import { NORTHWIND_ME } from '../fixtures/profile';

test.describe('Steady memory: one clock, and nothing left waiting', () => {
  for (const [team, pins, counted] of [
    ['13', northwindPins(), '13 teammates'],
    ['500', teamOf500(), '500 teammates'],
  ] as const)
    test(`one clock drives every local time on the Globe and Team screens, for a team of ${team}`, async ({
      api,
      page,
      appHeader,
      globePage,
      teamPage,
    }) => {
      await watchTimers(page);
      await rememberTeam(page);
      api.answer('GET', NORTHWIND_PINS, pins);

      // Given the Globe, every pin and the panel showing a local time
      await globePage.open();
      await expect(globePage.title).toHaveText(counted);
      await expect(globePage.canvas).toBeVisible();

      // Then one timer is waiting: the clock's, for the next minute
      expect(await ticking(page)).toEqual([{ delay: expect.any(Number), repeats: false }]);

      // And on Team, every teammate's local time and the ribbon tick from the same one
      await appHeader.navigationLinks.filter({ hasText: 'Team' }).click();
      await expect(teamPage.title).toBeVisible();
      expect(await ticking(page)).toEqual([{ delay: expect.any(Number), repeats: false }]);
    });

  test('leaving a screen while it waits for the backend cancels the request', async ({
    api,
    page,
    appHeader,
    globePage,
    profilePage,
    notFoundPage,
  }) => {
    await rememberTeam(page);
    const cancelled: string[] = [];
    page.on('requestfailed', (request) => {
      if (request.failure()?.errorText.includes('ABORTED'))
        cancelled.push(new URL(request.url()).pathname);
    });

    // Given Profile & Settings waiting for the teammate's own pin
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    api.hold('GET', NORTHWIND_ME);
    await profilePage.open();
    await expect(profilePage.loadingAnnouncement).toBeAttached();

    // When the teammate goes to the Globe before it arrives, the read is cancelled
    await appHeader.navigationLinks.filter({ hasText: 'Globe' }).click();
    await expect(globePage.title).toHaveText('13 teammates');
    await expect.poll(() => cancelled).toEqual([NORTHWIND_ME]);

    // And given the Globe waiting for the team, after another screen of the app
    api.hold('GET', NORTHWIND_PINS);
    await notFoundPage.open('/somewhere-else');
    await notFoundPage.backToTheGlobe.click();
    await expect(globePage.loading).toBeVisible();

    // When the teammate goes back to where they were, the team's read is cancelled
    await page.goBack();
    await expect(notFoundPage.main).toBeVisible();
    await expect.poll(() => cancelled).toEqual([NORTHWIND_ME, NORTHWIND_PINS]);
  });
});
