// Acceptance Test
// Traces to: L2-052, L2-038
// Description: Sign In asks for a work email and nothing else, beside a globe with no pins, and offers to start a team

import { expect, test } from '../fixtures/test';
import { mockMarkup } from '../support/mocks';

test.describe('Sign In: the form', () => {
  test.beforeEach(async ({ signInPage }) => {
    await signInPage.open();
    await expect(signInPage.title).toHaveText('Welcome back.');
  });

  test('it has the title, the lead, one field for a work email, the button and a globe with no pins', async ({
    signInPage,
  }) => {
    // Given Sign In, opened at /sign-in by anyone
    await expect(signInPage.page).toHaveTitle('Sign In · Mondino');
    await expect(signInPage.wordmark).toHaveText('mondino');
    await expect(signInPage.lead).toHaveText(
      'No passwords. We’ll email you a link that signs you straight in.',
    );

    // Then it has one field, "Work email", and the button
    await expect(signInPage.formControls).toHaveCount(1);
    await expect(signInPage.email).toHaveAttribute('type', 'email');
    await expect(signInPage.email).toHaveAttribute('autocomplete', 'email');
    await expect(signInPage.email).toHaveAttribute('inputmode', 'email');
    await expect(signInPage.email).toHaveAttribute('maxlength', '254');
    await expect(signInPage.submit).toHaveText('Email me a sign-in link');
    await expect(signInPage.submit).toBeEnabled();

    // And a globe with no pins, and nothing about any team
    await expect(signInPage.globe).toBeVisible();
    await expect(signInPage.allPins).toHaveCount(0);
    await expect(signInPage.main).not.toContainText('Northwind');
  });

  test('under the form it says "New here?" and "Start a team" leads to Create Team', async ({
    signInPage,
    createTeamPage,
  }) => {
    await expect(signInPage.footer).toHaveText(
      'New here? Start a team or open the invite link a teammate sent you.',
    );
    await expect(signInPage.startATeam).toHaveAttribute('href', '/new');

    await signInPage.startATeam.click();

    await expect(createTeamPage.title).toHaveText('Start a team.');
    await expect(createTeamPage.page).toHaveURL('/new');
  });
});

test('the still globe beside the form is the picture the mock draws', async ({ signInPage }) => {
  // The mock is read before the app is open, so its markup is not held to the app's policy.
  const drawn = await signInPage.globeShapesIn(mockMarkup('pages/sign-in/default.html'));

  await signInPage.open();

  expect(drawn).not.toEqual([]);
  expect(await signInPage.globeShapes()).toEqual(drawn);
});
