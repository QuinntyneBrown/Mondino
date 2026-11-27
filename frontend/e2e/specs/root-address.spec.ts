// Acceptance Test
// Traces to: L2-038
// Description: The site's own address, with no path, goes to the Globe and never to Not Found

import { expect, test } from '../fixtures/test';
import { northwindPins, NORTHWIND_PINS } from '../fixtures/pins';
import { rememberTeam } from '../support/membership';

test.describe('The site’s own address', () => {
  test('on no team, it goes to the Globe’s address and says an invite link is needed', async ({
    inviteNeededPage,
  }) => {
    // Given a browser on no team
    // When the site's own address is opened
    await inviteNeededPage.open('/');

    // Then it is the Globe's address, showing "You need an invite link", not "fell off the map"
    await expect(inviteNeededPage.page).toHaveURL(/\/globe$/);
    await expect(inviteNeededPage.title).toHaveText('You need an invite link');
  });

  test('for a teammate, it goes to the Globe with the team on it', async ({ api, globePage }) => {
    // Given Sofia, a teammate on Northwind
    await globePage.page.emulateMedia({ reducedMotion: 'reduce' });
    await rememberTeam(globePage.page);
    api.answer('GET', NORTHWIND_PINS, northwindPins());

    // When the site's own address is opened
    await globePage.page.goto('/');

    // Then it is the Globe, with the team's pins on it
    await expect(globePage.page).toHaveURL(/\/globe$/);
    await expect(globePage.page).toHaveTitle('Globe · Mondino');
    await expect(globePage.pinButtons).not.toHaveCount(0);
  });
});
