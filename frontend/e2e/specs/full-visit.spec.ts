// Acceptance Test
// Traces to: L2-044, L2-007, L2-043, L2-050
// Description: Through a full visit every request goes to the app's own origin, and no postal code or email is kept in storage, cookies or the address bar; a teammate's visit to Sign In, Team, Moments and Profile & Settings calls no outside source

import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { NORTHWIND_MOMENTS, northwindMoments } from '../fixtures/moments';
import { NORTHWIND_ME, SOFIA_PROFILE } from '../fixtures/profile';
import { LINK_ASKED, SIGN_IN_LINKS } from '../fixtures/sign-in';
import { rememberTeam } from '../support/membership';
import { expect, test } from '../fixtures/test';
import {
  lookupAnswer,
  NORTHWIND_INVITE,
  NORTHWIND_JOINS,
  NORTHWIND_LOOKUPS,
  northwindInvite,
  SOFIA_JOINED,
} from '../fixtures/invites';
import { CREATE_LOOKUPS, NORTHWIND_CREATED, TEAMS } from '../fixtures/teams';
import { BrowserRecord } from '../support/browser-record';

test.describe('A full visit', () => {
  test('joining and making a team send nothing off the app’s own origin and keep no postal code or email', async ({
    api,
    page,
    joinPage,
    globePage,
    createTeamPage,
    notFoundPage,
    inviteNeededPage,
  }) => {
    api.answer('GET', NORTHWIND_INVITE, northwindInvite());
    api.answer('POST', NORTHWIND_LOOKUPS, (route) => lookupAnswer(route.request().postDataJSON()));
    api.answer('POST', NORTHWIND_JOINS, SOFIA_JOINED);
    api.answer('POST', CREATE_LOOKUPS, (route) => lookupAnswer(route.request().postDataJSON()));
    api.answer('POST', TEAMS, NORTHWIND_CREATED);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    const record = new BrowserRecord(page);
    const kept: string[] = [];

    // Given a person on no team, who opens the Globe
    await inviteNeededPage.open('/globe');
    await expect(inviteNeededPage.title).toHaveText('You need an invite link');
    kept.push(await record.everythingKept());

    // When they make a team from 20121 with their work email, and go to the globe
    await createTeamPage.open();
    await createTeamPage.fillNorthwind();
    await createTeamPage.leavePostalCode();
    await expect(createTeamPage.lookup).toHaveText(
      'Milan, Lombardy — pinned at city level. 13° and foggy right now.',
    );
    kept.push(await record.everythingKept());
    await createTeamPage.submit.click();
    await expect(createTeamPage.title).toHaveText('Now bring everyone in.');
    kept.push(await record.everythingKept());
    await createTeamPage.goToTheGlobe.click();
    await expect(globePage.main).toBeVisible();
    kept.push(await record.everythingKept());

    // And they open an invite link and join from 20121 too
    await joinPage.open('northwind-7Kq2');
    await joinPage.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });
    await joinPage.leavePostalCode();
    await expect(joinPage.submit).toHaveText('Join Northwind');
    kept.push(await record.everythingKept());
    await joinPage.submit.click();
    await expect(globePage.youLabel).toHaveText('Sofia Bianchi (you) · Milan');
    kept.push(await record.everythingKept());

    // And they open an address that belongs to no screen
    await notFoundPage.open('/nowhere');
    await expect(notFoundPage.title).toHaveText('This page fell off the map');
    kept.push(await record.everythingKept());

    // Then every request went to the app's own origin, the fonts and the API included
    expect(record.requests.length).toBeGreaterThan(0);
    expect(record.origins()).toEqual([new URL(page.url()).origin]);
    expect(record.requests.some((url) => url.endsWith('.woff2'))).toBe(true);
    expect(record.requests.some((url) => new URL(url).pathname.startsWith('/api/'))).toBe(true);

    // And at no point did storage, IndexedDB, the cookies or the address bar hold the postal code or the email
    for (const everything of kept) {
      expect(everything).not.toContain('20121');
      expect(everything.toLowerCase()).not.toContain('sofia@');
      expect(everything).not.toContain('northwind.co');
    }
  });

  test('signing in and reading Team, Moments and Profile & Settings call no outside source', async ({
    api,
    page,
    signInPage,
    teamPage,
    momentsPage,
    profilePage,
  }) => {
    // Given the backend answers with the team's weather and moments, as it read them itself
    api.answer('POST', SIGN_IN_LINKS, LINK_ASKED);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());
    api.answer('GET', NORTHWIND_ME, SOFIA_PROFILE);
    const record = new BrowserRecord(page);

    // When Sofia asks for a sign-in link
    await signInPage.open();
    await signInPage.askForLink('sofia@northwind.co');
    await expect(signInPage.noticeTitle).toHaveText('Check your inbox');

    // And, on her team, opens Team, Moments and Profile & Settings
    await rememberTeam(page);
    await teamPage.open();
    await expect(teamPage.rows).toHaveCount(13);
    await momentsPage.open();
    await expect(momentsPage.rows.first()).toBeVisible();
    await profilePage.open();
    await expect(profilePage.city).toContainText('Milan');

    // Then every request the browser made went to the app's own origin: none to a weather,
    // postal code, calendar or map service
    expect(record.requests.some((url) => new URL(url).pathname.startsWith('/api/'))).toBe(true);
    expect(record.origins()).toEqual([new URL(page.url()).origin]);
  });
});
