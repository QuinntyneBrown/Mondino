// Acceptance Test
// Traces to: L2-031, L2-007, L2-054, L2-025, L2-049
// Description: Profile & Settings shows the viewer's own pin on a small globe that holds still, their city, local time and time zone and their own postal code, under the header with its link current; while it loads and when it fails

import { expect, test } from '../fixtures/test';
import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { NORTHWIND_ME, SOFIA_PROFILE } from '../fixtures/profile';
import { mockText } from '../support/mocks';
import { rememberTeam } from '../support/membership';
import { letTimePass } from '../support/turning';

test.describe('Profile & Settings: your pin', () => {
  test.beforeEach(async ({ api, page }) => {
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
  });

  test('Sofia sees her pin at Milan on a small globe that does not turn or drag, and her own postal code only here', async ({
    api,
    page,
    profilePage,
    inviteDialog,
  }) => {
    // Given Sofia lives in Milan, from 20121
    api.answer('GET', NORTHWIND_ME, SOFIA_PROFILE);

    // When she opens Profile & Settings
    await profilePage.open();

    // Then it is "Your pin", with "Milan, Italy", her local time and its time zone (profile/default)
    await expect(page).toHaveTitle('Profile & Settings · Mondino');
    await expect(profilePage.title).toHaveText('Your pin');
    await expect(profilePage.city).toHaveText(
      mockText('pages/profile/default.html', 'pin-card__city')!,
    );
    await expect(profilePage.time).toHaveText('15:05 local · Central European Time');
    await expect(profilePage.note).toHaveText('Teammates see your city, never your postal code.');
    await expect(profilePage.locationNote).toHaveText(
      'Moved? Look up your new postal code and your pin follows when you save.',
    );
    await expect(profilePage.country).toHaveValue('IT');
    await expect(profilePage.postalCode).toHaveValue('20121');
    await expect(profilePage.saveBar).toHaveCount(0);

    // And the header's link to the screen is current
    await expect(profilePage.profileLink).toHaveAttribute('aria-current', 'page');

    // And a small globe shows her one pin at Milan, turned to face it, with no label
    await expect(profilePage.globe).toHaveAttribute('role', 'img');
    await expect(profilePage.globe).toHaveAttribute(
      'aria-label',
      'A small globe with your pin at Milan',
    );
    await expect(profilePage.youPin).toHaveCount(1);
    await expect(profilePage.youLabel).toHaveCount(0);
    const facing = { x: 50, y: 50 };
    await expect.poll(() => profilePage.pinPlace(), { timeout: 10_000 }).toEqual(facing);

    // When she drags across it and time passes, it has neither been dragged nor turned on its own
    await profilePage.dragAcrossTheGlobe(-120);
    await letTimePass(page, 10_000);
    expect(await profilePage.pinPlace()).toEqual(facing);
    await expect(profilePage.globe).not.toHaveAttribute('tabindex');

    // And her postal code is in no address and no storage
    expect(page.url()).not.toContain('20121');
    const stored = await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    );
    expect(stored).not.toContain('20121');

    // When "Invite teammate" in the header is used, the invite dialog opens (L2-054, L2-025)
    await profilePage.inviteTeammate.click();
    await expect(inviteDialog.title).toHaveText('Invite teammates to Northwind');
  });

  test.describe('while it loads and when it fails', () => {
    test.use({ webgl: false });

    test('the placeholders are announced, a failure offers "Try again" and "Back to the globe"', async ({
      api,
      profilePage,
    }) => {
      // Given her pin and settings have not come back yet
      const read = api.hold('GET', NORTHWIND_ME);
      await profilePage.open();

      // Then placeholders stand for the globe and each section, and the wait is announced
      await expect(profilePage.title).toHaveText('Your pin');
      await expect(profilePage.loadingAnnouncement).toHaveText('Loading your pin and settings…');
      await expect(profilePage.skeletons).toHaveCount(12);

      // When Mondino does not answer, the screen is profile/error
      read.release({ unanswered: true });
      await expect(profilePage.errorTitle).toHaveText(
        mockText('pages/profile/error.html', 'empty__title')!,
      );
      await expect(profilePage.errorTitle).toHaveRole('heading');
      await expect(profilePage.errorText).toHaveText(
        mockText('pages/profile/error.html', 'empty__text')!,
      );
      await expect(profilePage.backToGlobe).toHaveAttribute('href', '/globe');

      // When it answers again and "Try again" is used, her pin is shown, on the still picture
      api.answer('GET', NORTHWIND_ME, SOFIA_PROFILE);
      await profilePage.tryAgain.click();
      await expect(profilePage.city).toHaveText('Milan, Italy');
      await expect(profilePage.stillPicture).toBeVisible();
      await expect(profilePage.youPin).toHaveCount(1);
    });
  });
});
