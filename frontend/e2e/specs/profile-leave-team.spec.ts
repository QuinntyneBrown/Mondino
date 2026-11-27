// Acceptance Test
// Traces to: L2-036, L2-035, L2-039
// Description: "Leave Northwind" asks in an alert dialog that names the team and how many teammates see the pin, with focus on "Stay"; "Stay" and Escape close it with focus back and nothing changed, unsaved changes included; "Leave without saving?" is not asked before it

import { expect, test } from '../fixtures/test';
import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { NORTHWIND_ME, sofiaProfile } from '../fixtures/profile';
import { mockText } from '../support/mocks';
import { rememberTeam } from '../support/membership';

const dialogMock = 'dialogs/leave-team/default.html';

test.describe('Profile & Settings: leaving the team', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ api, page }) => {
    await rememberTeam(page);
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
});
