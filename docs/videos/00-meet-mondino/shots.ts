import {
  lookupAnswer,
  NORTHWIND_INVITE,
  NORTHWIND_JOINS,
  NORTHWIND_LOOKUPS,
  northwindInvite,
  SOFIA_JOINED,
} from '../../../frontend/e2e/fixtures/invites';
import {
  idOf,
  NORTHWIND_PINS,
  northwindPins,
  northwindPinsOf,
  teamOf500,
} from '../../../frontend/e2e/fixtures/pins';
import { LINK_ASKED, SIGN_IN_LINKS } from '../../../frontend/e2e/fixtures/sign-in';
import { CREATE_LOOKUPS, NORTHWIND_CREATED, TEAMS } from '../../../frontend/e2e/fixtures/teams';
import { expect, test } from '../../../frontend/e2e/fixtures/test';
import { rememberTeam } from '../../../frontend/e2e/support/membership';
import { type Size, detail, frame, shot } from '../../../tools/video-record/shots';

/**
 * The screenshots of "Meet Mondino", in the built app: every screen mondino.world serves today,
 * with the mocks' cast (Northwind, thirteen teammates) answered from the e2e fixtures at the mocks'
 * "now", Monday 27 October 2025, 15:05 in Milan. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/00-meet-mondino`.
 */

/**
 * Writes the invite link with the deployed site's host: the built app is served on 127.0.0.1:4310
 * here, and makes the link from its own origin. Nothing else on a screen is changed.
 */
async function deployedHost(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const host = (text: string) => text.replace(/(https?:\/\/)?127\.0\.0\.1:4310/g, 'mondino.world');
    for (const field of document.querySelectorAll('input')) field.value = host(field.value);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode())
      if (node.nodeValue?.includes('127.0.0.1')) node.nodeValue = host(node.nodeValue);
  });
}

/** Lets the 3D globe load, draw and place its pins before a picture. */
async function drawn(page: import('@playwright/test').Page, ms = 2500): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(ms);
}

test('Create Team: the form, and the invite link', async ({ api, page, createTeamPage }) => {
  await frame(page, 'XL');
  api.answer('POST', CREATE_LOOKUPS, (route) => lookupAnswer(route.request().postDataJSON()));
  api.answer('POST', TEAMS, NORTHWIND_CREATED);
  api.answer('GET', NORTHWIND_PINS, northwindPinsOf('Sofia Bianchi'));
  await createTeamPage.open();
  await createTeamPage.fillNorthwind();
  await createTeamPage.leavePostalCode();
  await expect(createTeamPage.lookup).toContainText('Milan, Lombardy');
  await drawn(page);
  await shot(page, 'create-xl');
  await createTeamPage.submit.click();
  await expect(createTeamPage.title).toHaveText('Now bring everyone in.');
  await drawn(page, 1500);
  await deployedHost(page);
  await shot(page, 'created-xl');
});

for (const size of ['XS', 'XL'] as Size[]) {
  test(`Join at ${size}, and the Globe just after`, async ({ api, page, joinPage, globePage }) => {
    await frame(page, size);
    api.answer('GET', NORTHWIND_INVITE, northwindInvite());
    api.answer('POST', NORTHWIND_LOOKUPS, (route) => lookupAnswer(route.request().postDataJSON()));
    api.answer('POST', NORTHWIND_JOINS, SOFIA_JOINED);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await joinPage.open('northwind-7Kq2');
    await drawn(page);
    if (size === 'XL') await shot(page, 'join-empty-xl');
    await joinPage.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });
    await joinPage.leavePostalCode();
    await expect(joinPage.submit).toHaveText('Join Northwind');
    await drawn(page, 1500);
    await shot(page, `join-${size.toLowerCase()}`);
    if (size !== 'XL') return;
    await joinPage.submit.click();
    await expect(globePage.toast).toBeVisible();
    await drawn(page, 1200);
    await shot(page, 'just-joined-xl');
  });
}

test('Sign In: the form, and the link sent', async ({ api, page, signInPage }) => {
  await frame(page, 'XL');
  api.answer('POST', SIGN_IN_LINKS, LINK_ASKED);
  await signInPage.open();
  await signInPage.email.fill('sofia@northwind.co');
  await drawn(page);
  await shot(page, 'sign-in-xl');
  await signInPage.submit.click();
  await drawn(page, 1200);
  await shot(page, 'sign-in-sent-xl');
});

for (const size of ['XS', 'M', 'L', 'XL'] as Size[]) {
  test(`Globe at ${size}`, async ({ api, page, globePage }) => {
    await frame(page, size);
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await globePage.open();
    await expect(globePage.week).toBeVisible();
    await drawn(page, 3500);
    await shot(page, `globe-${size.toLowerCase()}`);
    if (size !== 'XL') return;
    await detail(globePage.panel, 'week-panel', 8);
    await detail(globePage.globeBox, 'globe-alone', 0);
  });
}

test('Globe in dark', async ({ api, page, globePage }) => {
  await frame(page, 'XL', 'dark');
  await rememberTeam(page);
  api.answer('GET', NORTHWIND_PINS, northwindPins());
  await globePage.open();
  await expect(globePage.week).toBeVisible();
  await drawn(page, 3500);
  await shot(page, 'globe-dark-xl');
});

for (const [name, file] of [
  ['Tomás Herrera', 'selected'],
  ['Noah Williams', 'selected-asleep'],
  ['Aiko Tanaka', 'selected-tokyo'],
] as const) {
  test(`The panel of ${name}`, async ({ api, page, globePage }) => {
    await frame(page, 'XL');
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await globePage.openAt(idOf(name));
    await expect(globePage.personName).toHaveText(name);
    await drawn(page, 5000);
    await shot(page, `${file}-xl`);
    await detail(globePage.panel, `${file}-panel`, 8);
  });
}

test('A teammate on a phone', async ({ api, page, globePage }) => {
  await frame(page, 'XS');
  await rememberTeam(page);
  api.answer('GET', NORTHWIND_PINS, northwindPins());
  await globePage.openAt(idOf('Tomás Herrera'));
  await expect(globePage.personName).toHaveText('Tomás Herrera');
  await drawn(page, 5000);
  await shot(page, 'selected-xs');
});

test('A group pin, and a team of 500', async ({ api, page, globePage }) => {
  await frame(page, 'XL');
  await rememberTeam(page);
  api.answer('GET', NORTHWIND_PINS, northwindPins());
  await globePage.open();
  await drawn(page, 2000);
  await globePage.pin('2 teammates close together').click();
  await expect(globePage.groupTitle).toBeVisible();
  await drawn(page, 3000);
  await shot(page, 'group-xl');
  await detail(globePage.panel, 'group-panel', 8);

  api.answer('GET', NORTHWIND_PINS, teamOf500());
  await globePage.open();
  await expect(globePage.week).toBeVisible();
  await drawn(page, 4000);
  await shot(page, 'hundreds-xl');
});

test('A team of one', async ({ api, page, globePage }) => {
  await frame(page, 'XL');
  await rememberTeam(page);
  api.answer('GET', NORTHWIND_PINS, northwindPinsOf('Sofia Bianchi'));
  await globePage.open();
  await expect(globePage.inviteCard).toBeVisible();
  await drawn(page, 3500);
  await deployedHost(page);
  await shot(page, 'one-xl');
});

for (const size of ['XS', 'XL'] as Size[]) {
  test(`The invite dialog at ${size}`, async ({ api, page, globePage, inviteDialog }) => {
    await frame(page, size);
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await globePage.open();
    await drawn(page, 3000);
    await globePage.inviteTeammate.click();
    await expect(inviteDialog.copyLink).toBeVisible();
    await drawn(page, 800);
    await deployedHost(page);
    await shot(page, `invite-${size.toLowerCase()}`);
    if (size === 'XL') await detail(inviteDialog.panel, 'invite-panel', 0);
  });
}

for (const size of ['XS', 'XL'] as Size[]) {
  test(`Team at ${size}`, async ({ api, page, teamPage }) => {
    await frame(page, size);
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await teamPage.open();
    await expect(teamPage.title).toHaveText('Where everyone is in their day');
    await drawn(page, 1200);
    await shot(page, `team-${size.toLowerCase()}`);
    if (size !== 'XL') return;
    await detail(teamPage.ribbon, 'team-ribbon', 8);
    await teamPage.open('working');
    await expect(teamPage.title).toBeVisible();
    await drawn(page, 1200);
    await shot(page, 'team-working-xl');
  });
}
