// Acceptance Test
// Traces to: L2-001
// Description: An invite link opens the Join screen for its team, before the person has given anything

import { expect, test } from '../fixtures/test';
import { NORTHWIND_INVITE, northwindInvite } from '../fixtures/invites';

test.describe('Join: open an invite link', () => {
  test('a valid invite link shows the team, its count and the initials of five teammates', async ({
    api,
    joinPage,
  }) => {
    // Given a valid invite link for Northwind, with 12 teammates
    api.answer('GET', NORTHWIND_INVITE, northwindInvite());

    // When a person opens it
    await joinPage.open('northwind-7Kq2');

    // Then the Join screen shows the heading, the team and its count, and five teammates' initials
    await expect(joinPage.title).toHaveText('Put yourself on the map.');
    await expect(joinPage.team).toHaveText(/Joining Northwind · 12 already here/);
    expect(await joinPage.avatarInitials()).toEqual(['ML', 'LO', 'LF', 'KM', 'AA']);
    await expect(joinPage.wordmark).toHaveText('mondino');
    await expect(joinPage.page).toHaveTitle('Join · Mondino');
  });

  test('the initials are decorative and tied to no pin', async ({ api, joinPage }) => {
    // Given a valid invite link
    api.answer('GET', NORTHWIND_INVITE, northwindInvite());

    // When the Join screen is shown
    await joinPage.open('northwind-7Kq2');
    await expect(joinPage.title).toHaveText('Put yourself on the map.');

    // Then the initials are hidden from assistive technology, and each carries its colour
    await expect(joinPage.avatars).toHaveCount(5);
    await expect(joinPage.avatarGroup).toHaveAttribute('aria-hidden', 'true');
    await expect(joinPage.avatars.first()).toHaveClass(/hue-2/);
    await expect(joinPage.avatars.last()).toHaveClass(/hue-6/);
  });

  test('the form is drawn with its three fields before anything is given', async ({
    api,
    joinPage,
  }) => {
    // Given a valid invite link
    api.answer('GET', NORTHWIND_INVITE, northwindInvite());

    // When the Join screen is shown
    await joinPage.open('northwind-7Kq2');

    // Then the form has a name, the supported countries and a postal code, under the lead
    await expect(joinPage.lead).toHaveText(
      'Your pin shows teammates your local time, weather and what’s happening where you are.',
    );
    await expect(joinPage.name).toBeVisible();
    await expect(joinPage.postalCode).toBeVisible();
    expect(await joinPage.countryNames()).toEqual([
      'Australia',
      'Brazil',
      'Canada',
      'Germany',
      'Ghana',
      'India',
      'Ireland',
      'Italy',
      'Japan',
      'Mexico',
      'Sweden',
      'United Arab Emirates',
      'United States',
    ]);
    await expect(joinPage.privacy).toHaveText(
      'Only your city is shown. Your postal code stays private.',
    );
    await expect(joinPage.placeMyPin).toBeVisible();
  });

  test('the team’s name is shown as text, never as markup', async ({ api, joinPage }) => {
    // Given a team whose name was typed as markup
    api.answer('GET', NORTHWIND_INVITE, northwindInvite({ teamName: '<b>Night</b> owls' }));

    // When its invite link is opened
    await joinPage.open('northwind-7Kq2');

    // Then the name is shown as its literal characters
    await expect(joinPage.team).toHaveText(/Joining <b>Night<\/b> owls · 12 already here/);
    await expect(joinPage.teamMarkup).toHaveCount(0);
  });

  test('while the invite link opens, placeholders stand in and the wait is announced', async ({
    api,
    joinPage,
  }) => {
    // Given an invite link whose answer has not arrived
    const answer = api.hold('GET', NORTHWIND_INVITE);

    // When a person opens it
    await joinPage.open('northwind-7Kq2');

    // Then the heading shows, with placeholders for the team and the form and a globe with no pins
    await expect(joinPage.title).toHaveText('Put yourself on the map.');
    await expect(joinPage.status).toHaveText('Opening your invite link…');
    await expect(joinPage.skeletons).not.toHaveCount(0);
    await expect(joinPage.globe).toHaveAccessibleName('The globe is loading');
    await expect(joinPage.pins).toHaveCount(0);
    await expect(joinPage.form).toHaveCount(0);
    await expect(joinPage.main).not.toContainText('Northwind');

    // And when the answer arrives, the team is shown
    answer.release(northwindInvite());
    await expect(joinPage.team).toHaveText(/Joining Northwind · 12 already here/);
    await expect(joinPage.skeletons).toHaveCount(0);
  });

  test('"Already on Mondino? Sign in" leads to Sign In', async ({ api, joinPage }) => {
    // Given the Join screen, while it opens and once it is ready
    const answer = api.hold('GET', NORTHWIND_INVITE);
    await joinPage.open('northwind-7Kq2');
    await expect(joinPage.footer).toHaveText('Already on Mondino? Sign in');
    answer.release(northwindInvite());
    await expect(joinPage.team).toBeVisible();
    await expect(joinPage.footer).toHaveText('Already on Mondino? Sign in');

    // When "Sign in" is used
    await expect(joinPage.signIn).toHaveAttribute('href', '/sign-in');
    await joinPage.signIn.click();

    // Then the address is Sign In's
    await expect(joinPage.page).toHaveURL(/\/sign-in$/);
  });
});
