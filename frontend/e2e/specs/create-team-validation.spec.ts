// Acceptance Test
// Traces to: L2-053, L2-044, L2-041
// Description: Create Team checks its fields when "Create team" is pressed, says what is wrong under each and moves focus to the first

import { expect, test } from '../fixtures/test';
import { lookupAnswer } from '../fixtures/invites';
import { CREATE_LOOKUPS } from '../fixtures/teams';

test.describe('Create Team: what is missing or wrong', () => {
  test.beforeEach(async ({ api, createTeamPage }) => {
    api.answer('POST', CREATE_LOOKUPS, (route) => lookupAnswer(route.request().postDataJSON()));
    await createTeamPage.open();
    await expect(createTeamPage.title).toHaveText('Start a team.');
  });

  test('with no team name, the field says so and takes focus, and no team is made', async ({
    createTeamPage,
  }) => {
    // Given everything but the team name
    await createTeamPage.fill({
      name: 'Sofia Bianchi',
      email: 'sofia@northwind.co',
      country: 'Italy',
      postalCode: '20121',
    });

    // When "Create team" is pressed
    await createTeamPage.submit.click();

    // Then the team name is marked invalid, its message is under it as an alert, and it has focus
    await expect(createTeamPage.teamName).toHaveAttribute('aria-invalid', 'true');
    await expect(createTeamPage.teamNameError).toHaveText(
      'Give your team a name — teammates see it when they join.',
    );
    await expect(createTeamPage.teamNameError).toHaveAttribute('role', 'alert');
    await expect(createTeamPage.teamName).toHaveAttribute('aria-describedby', 'team-error');
    await expect(createTeamPage.teamName).toBeFocused();

    // And no team was asked for: the API fixture fails the spec on a request to make one
  });

  test('with nothing typed, each field says what is missing under it, and focus is on the first', async ({
    createTeamPage,
  }) => {
    await createTeamPage.submit.click();

    await expect(createTeamPage.teamNameError).toHaveText(
      'Give your team a name — teammates see it when they join.',
    );
    await expect(createTeamPage.nameError).toHaveText(
      'Add your name so teammates know whose pin this is.',
    );
    await expect(createTeamPage.emailError).toHaveText(
      'Add your work email — we’ll send sign-in links there.',
    );
    await expect(createTeamPage.postalCodeError).toHaveText('Enter a postal code.');
    for (const field of [
      createTeamPage.teamName,
      createTeamPage.name,
      createTeamPage.email,
      createTeamPage.postalCode,
    ])
      await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(createTeamPage.teamName).toBeFocused();
  });

  test('an email not in the form of an address says so, and focus goes to it', async ({
    createTeamPage,
  }) => {
    await createTeamPage.fill({
      teamName: 'Northwind',
      name: 'Sofia Bianchi',
      email: 'sofia@northwind',
      postalCode: '20121',
    });

    await createTeamPage.submit.click();

    await expect(createTeamPage.emailError).toHaveText('That doesn’t look like an email address.');
    await expect(createTeamPage.email).toHaveAttribute('aria-describedby', 'email-error');
    await expect(createTeamPage.email).toBeFocused();
    await expect(createTeamPage.teamNameError).toHaveCount(0);
  });

  test('a team name typed as markup is kept as text', async ({ createTeamPage }) => {
    await createTeamPage.fill({ teamName: '<img src=x onerror=alert(1)>' });
    await createTeamPage.submit.click();

    await expect(createTeamPage.teamName).toHaveValue('<img src=x onerror=alert(1)>');
    await expect(createTeamPage.images).toHaveCount(0);
  });
});
