// Acceptance Test
// Traces to: L2-038, L2-035, L2-036, L2-043
// Description: On Profile & Settings an ended session (401) on reading the profile, saving or leaving forgets the team and shows "You need an invite link" at /profile, without asking "Leave without saving?" and with no team's data

import { expect, test } from '../fixtures/test';
import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { NORTHWIND_ME, sofiaProfile } from '../fixtures/profile';
import { rememberTeam } from '../support/membership';

/** What the backend answers a request whose session has ended (L2-043): 401 and no team data. */
const ENDED = {
  status: 401,
  headers: { 'content-type': 'application/problem+json' },
  json: { type: 'about:blank', title: 'Unauthorized', status: 401 },
};

test.describe('Profile & Settings: a session that has ended', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ api, page }) => {
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
  });

  test('a save refused with 401 shows "You need an invite link" in place, without asking "Leave without saving?"', async ({
    api,
    page,
    profilePage,
    inviteNeededPage,
    discardDialog,
    appHeader,
  }) => {
    // Given Sofia has changed her clock on Profile & Settings
    api.answer('GET', NORTHWIND_ME, sofiaProfile());
    await profilePage.open();
    await profilePage.option(profilePage.clock, '12-hour').click();

    // When she saves and her session has ended
    api.answer('PUT', NORTHWIND_ME, ENDED);
    await profilePage.saveChanges.click();

    // Then /profile says an invite link is needed, with its ways on and no header or team
    await expect(inviteNeededPage.title).toHaveText('You need an invite link');
    await expect(page).toHaveURL('/profile');
    await expect(inviteNeededPage.startATeam).toBeVisible();
    await expect(inviteNeededPage.useADifferentEmail).toBeVisible();
    await expect(appHeader.header).toHaveCount(0);
    await expect(discardDialog.dialog).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('mondino.membership'))).toBeNull();
  });

  test('leaving refused with 401 closes "Leave Northwind?" and shows "You need an invite link" in place', async ({
    api,
    page,
    profilePage,
    leaveDialog,
    inviteNeededPage,
  }) => {
    api.answer('GET', NORTHWIND_ME, sofiaProfile());
    await profilePage.open();
    await profilePage.leave.click();

    api.answer('DELETE', NORTHWIND_ME, ENDED);
    await leaveDialog.confirm.click();

    await expect(inviteNeededPage.title).toHaveText('You need an invite link');
    await expect(page).toHaveURL('/profile');
    await expect(leaveDialog.dialog).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('mondino.membership'))).toBeNull();
  });

  test('a read of the profile refused with 401 shows "You need an invite link" in place', async ({
    api,
    page,
    profilePage,
    inviteNeededPage,
  }) => {
    api.answer('GET', NORTHWIND_ME, ENDED);
    await profilePage.open();

    await expect(inviteNeededPage.title).toHaveText('You need an invite link');
    await expect(page).toHaveURL('/profile');
    expect(await page.evaluate(() => localStorage.getItem('mondino.membership'))).toBeNull();
  });
});
