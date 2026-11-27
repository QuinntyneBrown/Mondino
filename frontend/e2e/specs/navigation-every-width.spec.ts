// Acceptance Test
// Traces to: L2-038, L2-037
// Description: The header carries Globe, Team, Moments, "Invite teammate" and the viewer's avatar on every teammate screen with the current one marked; the mark alone under 576 px and the wordmark from 576 px, "Invite teammate" an icon under 768 px, every target 44 px and nothing cut off from 320 px; the screens before a team carry the wordmark and no navigation; an address opened, reloaded or gone back to shows its screen

import { expect, test } from '../fixtures/test';
import { NORTHWIND_INVITE, northwindInvite } from '../fixtures/invites';
import { NORTHWIND_MOMENTS, northwindMoments } from '../fixtures/moments';
import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { NORTHWIND_ME, sofiaProfile } from '../fixtures/profile';
import { cutOff, fitsItsWidth, touchTarget, WIDTHS } from '../support/layout';
import { rememberTeam } from '../support/membership';

test.describe('Navigation at every width', () => {
  test.use({ webgl: false });

  test.describe('after joining', () => {
    test.beforeEach(async ({ api, page }) => {
      await rememberTeam(page);
      api.answer('GET', NORTHWIND_PINS, northwindPins());
      api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());
      api.answer('GET', NORTHWIND_ME, sofiaProfile());
    });

    test('every teammate screen offers Globe, Team, Moments, "Invite teammate" and the viewer’s avatar, the one shown marked current; the back button and a reload keep to the screen', async ({
      appHeader,
      page,
    }) => {
      // Given Sofia opens the Team screen's address directly
      await page.goto('/team');

      // Then the header offers the three screens, "Invite teammate" and her avatar, with Team current
      await expect(appHeader.navigationLinks).toHaveText(['Globe', 'Team', 'Moments']);
      await expect(appHeader.inviteTeammate).toBeVisible();
      await expect(appHeader.profile).toHaveText('SB');
      await expect(appHeader.currentScreen).toHaveText('Team');

      // When she goes to Moments, then to Profile & Settings by her avatar, then to the Globe
      await appHeader.link('Moments').click();
      await expect(page).toHaveURL('/moments');
      await expect(appHeader.currentScreen).toHaveText('Moments');
      await appHeader.profile.click();
      await expect(page).toHaveURL('/profile');
      await expect(appHeader.currentScreen).toHaveCount(1);
      await expect(appHeader.profile).toHaveAttribute('aria-current', 'page');
      await appHeader.link('Globe').click();
      await expect(page).toHaveURL('/globe');
      await expect(appHeader.currentScreen).toHaveText('Globe');

      // Then the back button returns through the screens she saw, each with its own link current
      await page.goBack();
      await expect(page).toHaveURL('/profile');
      await expect(appHeader.profile).toHaveAttribute('aria-current', 'page');
      await page.goBack();
      await expect(page).toHaveURL('/moments');
      await expect(appHeader.currentScreen).toHaveText('Moments');

      // And a reload shows the same screen
      await page.reload();
      await expect(page).toHaveURL('/moments');
      await expect(appHeader.currentScreen).toHaveText('Moments');
      await expect(page).toHaveTitle('Moments · Mondino');
    });

    test('the header fits from 320 px: the mark alone under 576 px, the wordmark from 576 px, "Invite teammate" an icon under 768 px, every target 44 px', async ({
      appHeader,
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 720 });
      await page.goto('/team');
      await expect(appHeader.profile).toBeVisible();

      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 720 });

        // The mark always, and the wordmark from 576 px, lowercase
        await expect(appHeader.mark, `${width} px`).toBeVisible();
        if (width < 576) await expect(appHeader.wordmark, `${width} px`).toBeHidden();
        else await expect(appHeader.wordmark, `${width} px`).toHaveText('mondino');

        // "Invite teammate" an icon alone under 768 px, with the same name; its words from 768 px
        await expect(appHeader.inviteTeammate, `${width} px`).toHaveAccessibleName(
          'Invite teammate',
        );
        if (width < 768) await expect(appHeader.inviteTeammateLabel, `${width} px`).toBeHidden();
        else await expect(appHeader.inviteTeammateLabel, `${width} px`).toBeVisible();

        // The navigation stays in the header, every target is at least 44 × 44 px
        await expect(appHeader.navigationLinks, `${width} px`).toHaveText([
          'Globe',
          'Team',
          'Moments',
        ]);
        for (const control of await appHeader.controls.all()) {
          const target = await touchTarget(control);
          expect(Math.min(target.width, target.height), `${width} px`).toBeGreaterThanOrEqual(44);
        }

        // And nothing is cut off, overlapped or scrolls sideways
        expect(await cutOff(page), `${width} px`).toEqual([]);
        expect(await fitsItsWidth(page), `${width} px`).toBe(true);
      }
    });
  });

  test('the screens before a team carry the wordmark and no navigation, at 320 px', async ({
    api,
    page,
    appHeader,
    joinPage,
    signInPage,
    createTeamPage,
    notFoundPage,
    inviteNeededPage,
    leftTeamPage,
  }) => {
    api.answer('GET', NORTHWIND_INVITE, northwindInvite());
    await page.setViewportSize({ width: 320, height: 720 });
    const screens = [
      { address: '/join/northwind-7Kq2', wordmark: joinPage.wordmark },
      { address: '/sign-in', wordmark: signInPage.wordmark },
      { address: '/new', wordmark: createTeamPage.wordmark },
      { address: '/left', wordmark: leftTeamPage.wordmark },
      { address: '/team', wordmark: inviteNeededPage.wordmark },
      { address: '/nowhere', wordmark: notFoundPage.wordmark },
    ];
    for (const { address, wordmark } of screens) {
      await page.goto(address);
      await expect(wordmark, address).toHaveText('mondino');
      await expect(wordmark, address).toBeVisible();
      await expect(appHeader.header, address).toHaveCount(0);
      await expect(appHeader.anyNavigation, address).toHaveCount(0);
    }
  });
});
