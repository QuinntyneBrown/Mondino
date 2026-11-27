// Acceptance Test
// Traces to: L2-025, L2-038
// Description: The Globe screen sits under the header the mocks draw over the teammate screens: the mark and wordmark, Globe, Team and Moments with Globe current, "Invite teammate" and the viewer's own avatar for Profile & Settings

import { expect, test } from '../fixtures/test';
import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { rememberTeam } from '../support/membership';

test.describe('Globe: the header', () => {
  test.use({ webgl: false });

  test('reads as pages/globe/default draws it', async ({ api, globePage }) => {
    await rememberTeam(globePage.page);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await globePage.open();

    await expect(globePage.home).toHaveAttribute('href', '/globe');
    await expect(globePage.navigationLinks).toHaveText(['Globe', 'Team', 'Moments']);
    await expect(globePage.currentScreen).toHaveText('Globe');
    await expect(globePage.inviteTeammate).toBeVisible();
    await expect(globePage.profile).toHaveAttribute('href', '/profile');
    await expect(globePage.profileAvatar).toHaveText('SB');
    await expect(globePage.profileAvatar).toHaveClass(/hue-1/);
  });
});
