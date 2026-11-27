// Acceptance Test
// Traces to: L2-053
// Description: Create Team asks for a team name, a name, a work email, a country and a postal code, beside a globe with no pins

import { expect, test } from '../fixtures/test';
import { COUNTRY_NAMES } from '../fixtures/teams';

test.describe('Create Team: the form', () => {
  test.beforeEach(async ({ createTeamPage }) => {
    await createTeamPage.open();
    await expect(createTeamPage.title).toHaveText('Start a team.');
  });

  test('it has the title, the lead, the five fields with their help, "Create team" and a globe with no pins', async ({
    createTeamPage,
  }) => {
    // Given Create Team, opened at /new by anyone
    await expect(createTeamPage.page).toHaveTitle('Create Team · Mondino');
    await expect(createTeamPage.wordmark).toHaveText('mondino');
    await expect(createTeamPage.lead).toHaveText(
      'Name it, place your own pin, and you’ll get a link to invite everyone else.',
    );

    // Then it has exactly the five fields
    await expect(createTeamPage.formControls).toHaveCount(5);
    await expect(createTeamPage.teamName).toHaveAttribute('maxlength', '60');
    await expect(createTeamPage.name).toHaveAttribute('maxlength', '60');
    await expect(createTeamPage.email).toHaveAttribute('type', 'email');
    await expect(createTeamPage.email).toHaveAttribute('maxlength', '254');
    await expect(createTeamPage.emailHelp).toHaveText('We’ll send sign-in links here.');
    await expect(createTeamPage.email).toHaveAttribute('aria-describedby', 'email-help');
    await expect(createTeamPage.postalCode).toHaveAttribute('maxlength', '12');

    // And the privacy line under the postal code, and the button
    await expect(createTeamPage.lookup).toHaveText(
      'Only your city is shown. Your postal code stays private.',
    );
    await expect(createTeamPage.postalCode).toHaveAttribute('aria-describedby', 'lookup');
    await expect(createTeamPage.submit).toHaveText('Create team');

    // And a globe with no pins
    await expect(createTeamPage.globe).toHaveAccessibleName('The globe, with no pins');
    await expect(createTeamPage.allPins).toHaveCount(0);
  });

  test('the Country field lists the same supported countries as Join', async ({
    createTeamPage,
  }) => {
    expect(await createTeamPage.countryNames()).toEqual(COUNTRY_NAMES);
  });

  test('under the form, "Already have a team?" leads to Sign In', async ({ createTeamPage }) => {
    await expect(createTeamPage.footer).toHaveText('Already have a team? Sign in');
    await expect(createTeamPage.signIn).toHaveAttribute('href', '/sign-in');
  });
});
