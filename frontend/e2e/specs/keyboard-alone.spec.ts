// Acceptance Test
// Traces to: L2-039, L2-041, L2-005, L2-036
// Description: A person joins, reads the team, filters the moments and leaves with the keyboard alone; each dialog keeps focus inside it with a ring and a 44 px target on every control, closes on Escape and gives focus back to what opened it

import type { Locator } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import {
  lookupAnswer,
  NORTHWIND_INVITE,
  NORTHWIND_JOINS,
  NORTHWIND_LOOKUPS,
  northwindInvite,
  SOFIA_JOINED,
} from '../fixtures/invites';
import { NORTHWIND_MOMENTS, northwindMoments } from '../fixtures/moments';
import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { NORTHWIND_ME, sofiaProfile } from '../fixtures/profile';
import { tabTo, tabWithin } from '../support/accessibility';
import { rememberTeam } from '../support/membership';

/** Presses Tab inside a dialog twice round and checks every stop stays in it, ringed and 44 px. */
async function keepsFocus(dialog: Locator, controls: number): Promise<void> {
  const stops = await tabWithin(dialog, controls * 2 + 1);
  for (const stop of stops) {
    expect(stop.inside, `${stop.name} is inside the dialog`).toBe(true);
    expect(stop.ringWidth, `${stop.name}'s ring`).toBeGreaterThanOrEqual(2);
    expect(stop.ringContrast, `${stop.name}'s ring`).toBeGreaterThanOrEqual(3);
    expect(Math.min(stop.width, stop.height), `${stop.name}'s target`).toBeGreaterThanOrEqual(44);
  }
}

test.describe('By keyboard alone', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ api }) => {
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());
    api.answer('GET', NORTHWIND_ME, sofiaProfile());
  });

  test('a person joins, reads the team, filters the moments and leaves, with no pointer', async ({
    api,
    page,
    joinPage,
    globePage,
    appHeader,
    teamPage,
    momentsPage,
    profilePage,
    leaveDialog,
    leftTeamPage,
  }) => {
    api.answer('GET', NORTHWIND_INVITE, northwindInvite());
    api.answer('POST', NORTHWIND_LOOKUPS, (route) => lookupAnswer(route.request().postDataJSON()));
    api.answer('POST', NORTHWIND_JOINS, SOFIA_JOINED);
    api.answer('DELETE', NORTHWIND_ME, { status: 204 });

    // Given Sofia opens the invite link
    await joinPage.open('northwind-7Kq2');
    await expect(joinPage.footer).toBeVisible();

    // When she types her name, picks Italy and types her postal code, moving on with Tab
    await tabTo(joinPage.name);
    await page.keyboard.type('Sofia Bianchi');
    await tabTo(joinPage.country);
    await page.keyboard.type('Italy');
    await tabTo(joinPage.postalCode);
    await page.keyboard.type('20121');
    await page.keyboard.press('Tab');
    await expect(joinPage.submit).toHaveText('Join Northwind');

    // And presses Enter on "Join Northwind"
    await tabTo(joinPage.submit);
    await page.keyboard.press('Enter');

    // Then she is on the Globe with her pin
    await expect(globePage.youLabel).toHaveText('Sofia Bianchi (you) · Milan');

    // When she goes to Team by its link in the header
    await tabTo(appHeader.link('Team'));
    await page.keyboard.press('Enter');

    // Then she reads everyone, and the filter moves with the arrow keys
    await expect(teamPage.rows).toHaveCount(13);
    await tabTo(teamPage.tab('All'));
    await page.keyboard.press('ArrowRight');
    await expect(teamPage.tab('Working now')).toHaveAttribute('aria-selected', 'true');
    await expect(teamPage.tab('Working now')).toBeFocused();

    // When she goes to Moments and presses "Holiday"
    await tabTo(appHeader.link('Moments'));
    await page.keyboard.press('Enter');
    await expect(momentsPage.rows.first()).toBeVisible();
    await tabTo(momentsPage.chip('Holiday'));
    await page.keyboard.press('Space');

    // Then the chip says it is pressed, and every moment left names its kind in words
    await expect(momentsPage.chip('Holiday')).toHaveAttribute('aria-pressed', 'true');
    await expect(momentsPage.chip('Everything')).toHaveAttribute('aria-pressed', 'false');
    for (const row of await momentsPage.rows.all())
      await expect(momentsPage.kindOf(row)).toContainText('Holiday');

    // When she opens Profile & Settings and leaves the team
    await tabTo(appHeader.profile);
    await page.keyboard.press('Enter');
    await expect(profilePage.city).toContainText('Milan');
    await tabTo(profilePage.leave);
    await page.keyboard.press('Enter');
    await expect(leaveDialog.stay).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(leaveDialog.confirm).toBeFocused();
    await page.keyboard.press('Enter');

    // Then she has left
    await expect(leftTeamPage.title).toHaveText('You’ve left Northwind');
  });

  test.describe('in a dialog', () => {
    test.beforeEach(async ({ page }) => {
      await rememberTeam(page);
    });

    test('the invite dialog keeps focus, closes on Escape and gives focus back', async ({
      page,
      globePage,
      appHeader,
      inviteDialog,
    }) => {
      await globePage.open();
      await expect(globePage.panel).toBeVisible();
      await tabTo(appHeader.inviteTeammate);
      await page.keyboard.press('Enter');
      await expect(inviteDialog.dialog).toBeVisible();

      await keepsFocus(inviteDialog.dialog, 3);

      await page.keyboard.press('Escape');
      await expect(inviteDialog.dialog).toHaveCount(0);
      await expect(appHeader.inviteTeammate).toBeFocused();
    });

    test('"Leave Northwind?" keeps focus, closes on Escape and gives focus back', async ({
      page,
      profilePage,
      leaveDialog,
    }) => {
      await profilePage.open();
      await expect(profilePage.city).toContainText('Milan');
      await tabTo(profilePage.leave);
      await page.keyboard.press('Enter');
      await expect(leaveDialog.dialog).toBeVisible();

      await keepsFocus(leaveDialog.dialog, 2);

      await page.keyboard.press('Escape');
      await expect(leaveDialog.dialog).toHaveCount(0);
      await expect(profilePage.leave).toBeFocused();
    });

    test('"Leave without saving?" keeps focus, and Escape keeps editing with focus back', async ({
      page,
      appHeader,
      profilePage,
      discardDialog,
    }) => {
      await profilePage.open();
      await expect(profilePage.city).toContainText('Milan');
      await tabTo(profilePage.option(profilePage.temperature, '°C'));
      await page.keyboard.press('ArrowRight');
      await expect(profilePage.option(profilePage.temperature, '°F')).toHaveAttribute(
        'aria-checked',
        'true',
      );
      await tabTo(appHeader.link('Globe'));
      await page.keyboard.press('Enter');
      await expect(discardDialog.dialog).toBeVisible();

      await keepsFocus(discardDialog.dialog, 2);

      await page.keyboard.press('Escape');
      await expect(discardDialog.dialog).toHaveCount(0);
      await expect(page).toHaveURL('/profile');
      await expect(appHeader.link('Globe')).toBeFocused();
    });
  });
});
