// Acceptance Test
// Traces to: L2-043, L2-038
// Description: Someone on no team who opens a team's screen sees "You need an invite link" in place, at the address they opened

import { expect, test } from '../fixtures/test';
import { mockMarkup } from '../support/mocks';
import { rememberTeam } from '../support/membership';
import { NORTHWIND_PINS, northwindPinsOf } from '../fixtures/pins';
import { NotFoundPage } from '../pages/not-found.page';

const text =
  'Mondino teams are invite-only, and you aren’t on one yet. Ask a teammate to send you their team’s link — it opens straight onto the globe.';

test.describe('Invite Needed', () => {
  for (const address of ['/globe', '/team', '/moments', '/profile']) {
    test(`${address} on no team says an invite link is needed, in place`, async ({
      inviteNeededPage,
    }) => {
      // Given a browser on no team
      // When a team's screen is opened
      await inviteNeededPage.open(address);

      // Then it says an invite link is needed, at the address that was opened
      await expect(inviteNeededPage.title).toHaveText('You need an invite link');
      await expect(inviteNeededPage.text).toHaveText(text);
      await expect(inviteNeededPage.wordmark).toHaveText('mondino');
      await expect(inviteNeededPage.globe).toBeVisible();
      await expect(inviteNeededPage.appHeader).toHaveCount(0);
      await expect(inviteNeededPage.page).toHaveURL(address);
      await expect(inviteNeededPage.page).toHaveTitle('You need an invite link · Mondino');
    });
  }

  test('it offers to start a team, or to sign in with a different email', async ({
    inviteNeededPage,
  }) => {
    await inviteNeededPage.open('/globe');

    await expect(inviteNeededPage.startATeam).toHaveAttribute('href', '/new');
    await expect(inviteNeededPage.useADifferentEmail).toHaveAttribute('href', '/sign-in');
    await inviteNeededPage.startATeam.click();
    await expect(inviteNeededPage.page).toHaveURL('/new');
  });

  test('the small globe is the still picture the mock draws', async ({
    inviteNeededPage,
    page,
  }) => {
    const drawn = await new NotFoundPage(page).globeShapesIn(
      mockMarkup('pages/invite-needed/default.html'),
    );

    await inviteNeededPage.open('/globe');

    expect(drawn).not.toEqual([]);
    expect(await inviteNeededPage.globeShapes()).toEqual(drawn);
  });

  test('a browser that is on a team opens the Globe itself', async ({
    api,
    page,
    inviteNeededPage,
    globePage,
  }) => {
    // Given a browser that remembers Northwind
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPinsOf('Sofia Bianchi'));

    // When the Globe is opened
    await globePage.open();

    // Then the Globe is shown, not the notice
    await expect(globePage.main).toBeVisible();
    await expect(inviteNeededPage.title).toHaveCount(0);
  });
});
