// Acceptance Test
// Traces to: L2-035
// Description: Leaving Profile & Settings with unsaved changes asks "Leave without saving?" by a header tab or the back button; "Keep editing" and Escape keep every change, "Discard and leave" leaves with nothing saved; closing the tab asks through the browser while changes are unsaved, and not once they are undone

import { expect, test } from '../fixtures/test';
import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { NORTHWIND_ME, sofiaProfile } from '../fixtures/profile';
import { mockText } from '../support/mocks';
import { rememberTeam } from '../support/membership';

const dialogMock = 'dialogs/unsaved-changes/default.html';

test.describe('Profile & Settings: leaving with unsaved changes', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ api, page }) => {
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    api.answer('GET', NORTHWIND_ME, sofiaProfile());
  });

  test('a header tab asks first; "Keep editing" and Escape stay with the changes, "Discard and leave" saves nothing', async ({
    api,
    discardDialog,
    globePage,
    page,
    profilePage,
  }) => {
    // Given Sofia has chosen °F and not saved
    let saves = 0;
    api.answer('PUT', NORTHWIND_ME, () => {
      saves++;
      return sofiaProfile();
    });
    await profilePage.open();
    const fahrenheit = profilePage.option(profilePage.temperature, '°F');
    await fahrenheit.click();
    const globeTab = globePage.navigationLinks.filter({ hasText: 'Globe' });

    // When she uses "Globe" in the header, the dialog asks, as dialogs/unsaved-changes draws it
    await globeTab.click();
    await expect(discardDialog.dialog).toHaveAccessibleName('Leave without saving?');
    await expect(discardDialog.title).toHaveText(mockText(dialogMock, 'dialog__title')!);
    await expect(discardDialog.description).toHaveText(
      'You changed your settings but haven’t saved them. If you leave now, those changes are lost and your pin stays as it was.',
    );
    await expect(discardDialog.dialog).toHaveAccessibleDescription(
      'You changed your settings but haven’t saved them. If you leave now, those changes are lost and your pin stays as it was.',
    );
    await expect(discardDialog.keepEditing).toBeFocused();
    await expect(discardDialog.discardAndLeave).toBeVisible();

    // When she keeps editing, the dialog goes, focus returns, and her change is still there
    await discardDialog.keepEditing.click();
    await expect(discardDialog.dialog).toHaveCount(0);
    await expect(page).toHaveURL('/profile');
    await expect(globeTab).toBeFocused();
    await expect(fahrenheit).toHaveAttribute('aria-checked', 'true');
    await expect(profilePage.saveBarText).toHaveText('You have unsaved changes');

    // And Escape does the same
    await globeTab.click();
    await expect(discardDialog.keepEditing).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(discardDialog.dialog).toHaveCount(0);
    await expect(page).toHaveURL('/profile');
    await expect(fahrenheit).toHaveAttribute('aria-checked', 'true');

    // When she discards and leaves, she is on the Globe and nothing was saved
    await globeTab.click();
    await discardDialog.discardAndLeave.click();
    await expect(page).toHaveURL('/globe');
    await expect(discardDialog.dialog).toHaveCount(0);
    expect(saves).toBe(0);

    // And coming back, her temperature is °C as it was
    await profilePage.profileLink.click();
    await expect(profilePage.option(profilePage.temperature, '°C')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(profilePage.saveBar).toHaveCount(0);
  });

  test('the back button asks too, and closing the tab asks through the browser only while there are unsaved changes', async ({
    discardDialog,
    globePage,
    page,
    profilePage,
  }) => {
    // Given Sofia came to Profile & Settings from the Globe and chose the 12-hour clock
    await globePage.open();
    await profilePage.profileLink.click();
    const twelve = profilePage.option(profilePage.clock, '12-hour');
    await twelve.click();

    // When she uses the browser's back button, the dialog asks, and she can stay
    await page.goBack();
    await expect(discardDialog.dialog).toBeVisible();
    await discardDialog.keepEditing.click();
    await expect(page).toHaveURL('/profile');
    await expect(twelve).toHaveAttribute('aria-checked', 'true');

    // When she closes the tab, the browser asks with its own confirmation, and she stays
    const asked: string[] = [];
    page.on('dialog', (dialog) => {
      asked.push(dialog.type());
      void dialog.dismiss();
    });
    await page.close({ runBeforeUnload: true });
    await expect.poll(() => asked).toEqual(['beforeunload']);
    expect(page.isClosed()).toBe(false);

    // When she changes the clock back, nothing is left unsaved and the tab closes without asking
    await profilePage.option(profilePage.clock, '24-hour').click();
    await expect(profilePage.saveBar).toHaveCount(0);
    await page.close({ runBeforeUnload: true });
    await expect.poll(() => page.isClosed()).toBe(true);
    expect(asked).toEqual(['beforeunload']);
  });
});
