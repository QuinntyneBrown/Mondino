// Acceptance Test
// Traces to: L2-052, L2-053, L2-038
// Description: Every way to Sign In the mocks draw leads to "Welcome back.": Join's and Create Team's "Sign in", and "Use a different email" on "You need an invite link"

import { expect, test } from '../fixtures/test';
import { NORTHWIND_INVITE, northwindInvite } from '../fixtures/invites';

test.describe('The ways to Sign In', () => {
  test('"Sign in" under Create Team’s form opens Sign In', async ({
    createTeamPage,
    signInPage,
  }) => {
    await createTeamPage.open();

    await createTeamPage.signIn.click();

    await expect(signInPage.title).toHaveText('Welcome back.');
    await expect(signInPage.page).toHaveURL('/sign-in');
  });

  test('"Sign in" under Join’s form opens Sign In', async ({ api, joinPage, signInPage }) => {
    api.answer('GET', NORTHWIND_INVITE, northwindInvite());
    await joinPage.open('northwind-7Kq2');
    await expect(joinPage.team).toBeVisible();

    await joinPage.signIn.click();

    await expect(signInPage.title).toHaveText('Welcome back.');
  });

  test('"Use a different email" on "You need an invite link" opens Sign In', async ({
    inviteNeededPage,
    signInPage,
  }) => {
    await inviteNeededPage.open('/team');

    await inviteNeededPage.useADifferentEmail.click();

    await expect(signInPage.title).toHaveText('Welcome back.');
    await expect(signInPage.page).toHaveURL('/sign-in');
  });

  test('by keyboard, "Start a team" on Sign In opens Create Team', async ({
    signInPage,
    createTeamPage,
  }) => {
    await signInPage.open();
    await signInPage.startATeam.focus();

    await signInPage.page.keyboard.press('Enter');

    await expect(createTeamPage.title).toHaveText('Start a team.');
  });
});
