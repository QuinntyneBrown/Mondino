// Acceptance Test
// Traces to: L2-035, L2-033
// Description: The bar for unsaved changes says so, saves, reports a failed save with "Try again" and the changes kept, confirms a save that succeeds to assistive technology, and goes 4 seconds later

import { expect, test } from '../fixtures/test';
import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { NORTHWIND_ME, sofiaProfile } from '../fixtures/profile';
import { mockText } from '../support/mocks';
import { rememberTeam } from '../support/membership';
import { pauseNow } from '../support/clock';

const bar = (state: string): string =>
  mockText(`notifications/settings-bar/${state}.html`, 'save-bar__text')!;

test.describe('Profile & Settings: the bar for unsaved changes', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ api, page }) => {
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    api.answer('GET', NORTHWIND_ME, sofiaProfile());
  });

  test('a failed save keeps the changes and offers "Try again"; a save that succeeds is confirmed, then goes after 4 seconds', async ({
    api,
    page,
    profilePage,
  }) => {
    // Given Sofia has changed nothing, no bar is shown
    await profilePage.open();
    await expect(profilePage.title).toHaveText('Your pin');
    await expect(profilePage.saveBar).toHaveCount(0);

    // When she chooses the 12-hour clock, the bar says so (settings-bar/info)
    const twelve = profilePage.option(profilePage.clock, '12-hour');
    await twelve.click();
    await expect(profilePage.saveBarText).toHaveText(bar('info'));
    await expect(profilePage.saveBar).toHaveRole('status');

    // When the save fails, the bar says so as an alert, offers "Try again", and her change stays (settings-bar/danger)
    let tries = 0;
    api.answer('PUT', NORTHWIND_ME, () => {
      tries++;
      return {
        status: 500,
        headers: { 'content-type': 'application/problem+json' },
        json: { status: 500, code: 'unexpected' },
      };
    });
    await profilePage.saveChanges.click();
    await expect(profilePage.saveBarText).toHaveText(bar('danger'));
    await expect(profilePage.saveBar).toHaveRole('alert');
    await expect(twelve).toHaveAttribute('aria-checked', 'true');
    await expect(profilePage.time).toHaveText('15:05 local · Central European Time');

    // And it does not go by itself
    await page.clock.runFor(10_000);
    await expect(profilePage.saveBarText).toHaveText(bar('danger'));

    // When "Try again" is used and the save succeeds, the bar confirms it, announced (settings-bar/success)
    api.answer('PUT', NORTHWIND_ME, sofiaProfile({ clockFormat: '12-hour' }));
    await profilePage.trySavingAgain.click();
    await expect(profilePage.saveBarText).toHaveText(bar('success'));
    await pauseNow(page);
    expect(tries).toBe(1);
    await expect(profilePage.saveBar).toHaveRole('status');
    await expect(profilePage.time).toHaveText('3:05 pm local · Central European Time');

    // And it goes by itself after 4 seconds
    await page.clock.runFor(3_900);
    await expect(profilePage.saveBarText).toHaveText(bar('success'));
    await page.clock.runFor(100);
    await expect(profilePage.saveBar).toHaveCount(0);
  });
});
