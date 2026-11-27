// Acceptance Test
// Traces to: L2-053, L2-001
// Description: "Start your own team", on an invite link that no longer works, leads to Create Team

import { expect, test } from '../fixtures/test';

test('"Start your own team" on an invite link that no longer works opens Create Team', async ({
  api,
  joinPage,
  createTeamPage,
}) => {
  api.refuse('GET', '/api/invites/reset-link', 404, 'invite_not_found');
  await joinPage.open('reset-link');

  await joinPage.startYourOwnTeam.click();

  await expect(createTeamPage.page).toHaveURL('/new');
  await expect(createTeamPage.title).toHaveText('Start a team.');
});
