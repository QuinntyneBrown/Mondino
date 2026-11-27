// Acceptance Test
// Traces to: L2-036, L2-035, L2-038, L2-039, L2-043, L2-053
// Description: "Leave Northwind" asks in an alert dialog that names the team and how many teammates see the pin, with focus on "Stay"; "Stay" and Escape close it with focus back and nothing changed, unsaved changes included; "Leave without saving?" is not asked before it; while leaving it is busy and Escape does nothing, and a failure changes nothing and offers "Try again"; confirming shows Left Team with the team’s name (and without it on a reload), forgets the team and settings in the browser, and the team’s screens then say an invite link is needed

import { expect, test } from '../fixtures/test';
import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { NORTHWIND_ME, sofiaProfile } from '../fixtures/profile';
import { mockText } from '../support/mocks';
import { rememberTeam, rememberTeamOnce } from '../support/membership';

const dialogMock = 'dialogs/leave-team/default.html';
const busyMock = 'dialogs/leave-team/busy.html';
const failedMock = 'dialogs/leave-team/failed.html';
const leftMock = 'pages/left-team/default.html';

test.describe('Profile & Settings: leaving the team', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ api }) => {
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    api.answer('GET', NORTHWIND_ME, sofiaProfile());
  });

  test('"Leave Northwind" asks first, as the mock draws it; "Stay" and Escape change nothing, unsaved changes included', async ({
    api,
    discardDialog,
    leaveDialog,
    page,
    profilePage,
  }) => {
    await rememberTeam(page);
    // Given Sofia on Profile & Settings, with °F chosen and not saved
    let removals = 0;
    api.answer('DELETE', NORTHWIND_ME, () => {
      removals++;
      return { status: 204 };
    });
    await profilePage.open();
    await expect(profilePage.leave).toHaveText(mockText(dialogMock, 'settings__leave')!);
    const fahrenheit = profilePage.option(profilePage.temperature, '°F');
    await fahrenheit.click();

    // When she chooses "Leave Northwind", the alert dialog asks at once, and not "Leave without saving?"
    await profilePage.leave.click();
    await expect(leaveDialog.dialog).toHaveAccessibleName(mockText(dialogMock, 'dialog__title')!);
    await expect(leaveDialog.description).toHaveText(
      'Your pin comes off the globe for all 12 teammates, along with your weather and moments. To come back you’ll need the team’s invite link.',
    );
    await expect(leaveDialog.dialog).toHaveAccessibleDescription(
      'Your pin comes off the globe for all 12 teammates, along with your weather and moments. To come back you’ll need the team’s invite link.',
    );
    await expect(leaveDialog.stay).toBeFocused();
    await expect(leaveDialog.confirm).toHaveText('Leave Northwind');
    await expect(discardDialog.discardAndLeave).toHaveCount(0);

    // When she chooses "Stay", it closes, focus returns to "Leave Northwind", and nothing changed
    await leaveDialog.stay.click();
    await expect(leaveDialog.dialog).toHaveCount(0);
    await expect(profilePage.leave).toBeFocused();
    await expect(page).toHaveURL('/profile');
    await expect(fahrenheit).toHaveAttribute('aria-checked', 'true');
    await expect(profilePage.saveBarText).toHaveText('You have unsaved changes');

    // And Escape does the same
    await profilePage.leave.press('Enter');
    await expect(leaveDialog.stay).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(leaveDialog.dialog).toHaveCount(0);
    await expect(profilePage.leave).toBeFocused();
    await expect(fahrenheit).toHaveAttribute('aria-checked', 'true');
    expect(removals).toBe(0);
  });

  test('while leaving the dialog is busy and stays; a failure says so, changes nothing and offers "Try again"', async ({
    api,
    leaveDialog,
    page,
    profilePage,
  }) => {
    await rememberTeam(page);
    // Given Sofia has confirmed leaving, and Mondino has not answered yet
    const removal = api.hold('DELETE', NORTHWIND_ME);
    await profilePage.open();
    await profilePage.leave.click();
    await leaveDialog.confirm.click();

    // Then the dialog stays open, its button reads "Leaving…", both buttons are disabled, and
    // Escape does not close it
    await expect(leaveDialog.confirm).toHaveText(mockText(busyMock, 'btn btn--danger')!);
    await expect(leaveDialog.confirm).toHaveAttribute('aria-busy', 'true');
    await expect(leaveDialog.confirm).toBeDisabled();
    await expect(leaveDialog.stay).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(leaveDialog.dialog).toBeVisible();

    // When the removal fails, the dialog says so, as dialogs/leave-team/failed draws it, and offers
    // "Try again" with focus on it
    removal.release({ status: 503 });
    await expect(leaveDialog.alert).toHaveText(mockText(failedMock, 'alert__body')!);
    await expect(leaveDialog.confirm).toHaveText('Try again');
    await expect(leaveDialog.confirm).toBeFocused();
    await expect(leaveDialog.confirm).not.toHaveAttribute('aria-busy');
    await expect(leaveDialog.stay).toBeEnabled();

    // And nothing changed: she is still on Profile & Settings, on Northwind
    await expect(page).toHaveURL('/profile');
    expect(await page.evaluate(() => localStorage.getItem('mondino.membership'))).not.toBeNull();
    await leaveDialog.stay.click();
    await expect(leaveDialog.dialog).toHaveCount(0);
    await expect(profilePage.city).toHaveText('Milan, Italy');
  });

  test('confirming takes her to "You’ve left Northwind", forgets the team in the browser, and the team is shown no more', async ({
    api,
    createTeamPage,
    discardDialog,
    inviteNeededPage,
    leaveDialog,
    leftTeamPage,
    page,
    profilePage,
  }) => {
    // Given Sofia on Profile & Settings, with her settings kept in the browser and °F chosen, not saved
    await rememberTeamOnce(page);
    let removals = 0;
    api.answer('DELETE', NORTHWIND_ME, () => {
      removals++;
      return { status: 204 };
    });
    await profilePage.open();
    await profilePage.option(profilePage.temperature, '°F').click();
    expect(await page.evaluate(() => localStorage.getItem('mondino.settings'))).not.toBeNull();

    // When she leaves Northwind
    await profilePage.leave.click();
    await leaveDialog.confirm.click();

    // Then, without "Leave without saving?", she sees Left Team as the mock draws it: the wordmark,
    // a small globe, the team's name and two ways on, and no navigation
    await expect(page).toHaveURL('/left');
    expect(removals).toBe(1);
    await expect(discardDialog.dialog).toHaveCount(0);
    await expect(leaveDialog.dialog).toHaveCount(0);
    await expect(leftTeamPage.title).toHaveText(mockText(leftMock, 'notice-page__title')!);
    await expect(leftTeamPage.text).toHaveText(mockText(leftMock, 'notice-page__text')!);
    await expect(leftTeamPage.wordmark).toHaveText('mondino');
    await expect(leftTeamPage.globe).toBeVisible();
    await expect(leftTeamPage.actions).toHaveText(['Start a new team', 'Sign in to another team']);
    await expect(leftTeamPage.signInToAnotherTeam).toHaveAttribute('href', '/sign-in');
    await expect(leftTeamPage.appHeader).toHaveCount(0);
    await expect(leftTeamPage.navigation).toHaveCount(0);

    // And the browser keeps nothing of the team: no membership, no settings, no name in the address
    expect(
      await page.evaluate(() => [
        localStorage.getItem('mondino.membership'),
        localStorage.getItem('mondino.settings'),
      ]),
    ).toEqual([null, null]);
    expect(page.url()).not.toContain('Northwind');

    // When the screen is reloaded, it no longer has the team's name
    await page.reload();
    await expect(leftTeamPage.title).toHaveText('You’ve left the team');
    await expect(leftTeamPage.text).toHaveText(
      'Your pin is off the team’s globe and they can no longer see your time, weather or moments. To come back, ask a teammate for the team’s invite link.',
    );

    // And opening the Globe or Profile & Settings shows "You need an invite link" in place
    await page.goto('/globe');
    await expect(inviteNeededPage.title).toHaveText('You need an invite link');
    await page.goto('/profile');
    await expect(inviteNeededPage.title).toHaveText('You need an invite link');

    // And from Left Team, "Start a new team" leads to Create Team
    await page.goBack();
    await page.goBack();
    await expect(leftTeamPage.title).toBeVisible();
    await leftTeamPage.startANewTeam.click();
    await expect(page).toHaveURL('/new');
    await expect(createTeamPage.title).toBeVisible();
  });
});
