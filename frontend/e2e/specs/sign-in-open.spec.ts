// Acceptance Test
// Traces to: L2-052, L2-038, L2-043
// Description: Opening an emailed sign-in link signs the teammate in and shows their team's Globe, with no token left in the address; a link that cannot be used signs no one in; an email on no team sees "You need an invite link" naming it

import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import type { Request } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import { ON_NO_TEAM, REDEMPTIONS, SIGN_IN_TOKEN, SOFIA_SIGNED_IN } from '../fixtures/sign-in';
import { BrowserRecord } from '../support/browser-record';

const inviteNeededFor = (who: string) =>
  `Mondino teams are invite-only, and ${who} on one yet. Ask a teammate to send you their team’s link — it opens straight onto the globe.`;

test.describe('Sign In: opening the emailed link', () => {
  test('a good link signs Sofia in and shows Northwind’s Globe, and the address carries no token', async ({
    api,
    page,
    signInPage,
    globePage,
  }) => {
    // Given Sofia's sign-in link, which the backend signs her in with
    api.answer('POST', REDEMPTIONS, SOFIA_SIGNED_IN);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    const opened: Request[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith(REDEMPTIONS)) opened.push(request);
    });
    const record = new BrowserRecord(page);

    // When she opens it on a new browser
    await signInPage.openLink(SIGN_IN_TOKEN);

    // Then the Globe of her team is shown, at /globe
    await expect(globePage.main).toBeVisible();
    await expect(page).toHaveURL('/globe');

    // And the token went to the backend in a body, once, and is in no address and nothing kept
    expect(opened).toHaveLength(1);
    expect(opened[0].postDataJSON()).toEqual({ signInToken: SIGN_IN_TOKEN });
    expect(opened[0].url()).not.toContain(SIGN_IN_TOKEN);
    const kept = await record.everythingKept();
    expect(kept).not.toContain(SIGN_IN_TOKEN);
    expect(kept).toContain('"teamName":"Northwind"');
    expect(kept).not.toContain('sofia@northwind.co');

    // And going back does not return to the address with the token
    await page.goBack();
    expect(page.url()).not.toContain(SIGN_IN_TOKEN);
  });

  test('while the link is being opened, the token is already out of the address', async ({
    api,
    page,
    signInPage,
    globePage,
  }) => {
    const held = api.hold('POST', REDEMPTIONS);
    api.answer('GET', NORTHWIND_PINS, northwindPins());

    await signInPage.openLink(SIGN_IN_TOKEN);

    await expect(page).toHaveURL('/sign-in');
    await expect(signInPage.title).toHaveText('Welcome back.');
    held.release(SOFIA_SIGNED_IN);
    await expect(globePage.main).toBeVisible();
  });

  for (const [why, refuse] of [
    ['used or expired', { status: 410, code: 'sign_in_link_unusable' }],
    ['opened too often from this device', { status: 429, code: 'rate_limited' }],
  ] as const) {
    test(`a link ${why} signs no one in and shows the Sign In form`, async ({
      api,
      page,
      signInPage,
    }) => {
      // Given a link the backend refuses
      api.refuse('POST', REDEMPTIONS, refuse.status, refuse.code);
      const record = new BrowserRecord(page);

      // When it is opened
      await signInPage.openLink(SIGN_IN_TOKEN);

      // Then the Sign In form is shown, at /sign-in, and no team is remembered
      await expect(signInPage.title).toHaveText('Welcome back.');
      await expect(page).toHaveURL('/sign-in');
      await expect(signInPage.submit).toBeEnabled();
      const kept = await record.everythingKept();
      expect(kept).not.toContain('Northwind');
      expect(kept).not.toContain(SIGN_IN_TOKEN);
    });
  }

  test('a link for an email on no team shows "You need an invite link" naming the email, once', async ({
    api,
    page,
    signInPage,
    inviteNeededPage,
  }) => {
    // Given a good link whose email is on no team
    api.answer('POST', REDEMPTIONS, ON_NO_TEAM);
    const record = new BrowserRecord(page);

    // When it is opened
    await signInPage.openLink(SIGN_IN_TOKEN);

    // Then "You need an invite link" is shown at /globe, naming the email as text
    await expect(inviteNeededPage.title).toHaveText('You need an invite link');
    await expect(page).toHaveURL('/globe');
    await expect(inviteNeededPage.text).toHaveText(inviteNeededFor('sofia@northwind.co isn’t'));
    await expect(inviteNeededPage.email).toHaveText('sofia@northwind.co');
    await expect(inviteNeededPage.useADifferentEmail).toHaveAttribute('href', '/sign-in');

    // And no team is remembered, and the email is in no address, no storage and no history state
    const kept = await record.everythingKept();
    expect(kept).not.toContain('sofia@northwind.co');
    expect(kept).not.toContain('teamName');

    // And a reload no longer knows the email
    await page.reload();
    await expect(inviteNeededPage.text).toHaveText(inviteNeededFor('you aren’t'));
  });

  test('"Use a different email" leads back to Sign In', async ({
    api,
    signInPage,
    inviteNeededPage,
  }) => {
    api.answer('POST', REDEMPTIONS, ON_NO_TEAM);
    await signInPage.openLink(SIGN_IN_TOKEN);
    await expect(inviteNeededPage.email).toHaveText('sofia@northwind.co');

    await inviteNeededPage.useADifferentEmail.click();

    await expect(signInPage.title).toHaveText('Welcome back.');
    await expect(signInPage.page).toHaveURL('/sign-in');
  });

  test('an email from the backend is shown as text, never as markup', async ({
    api,
    signInPage,
    inviteNeededPage,
  }) => {
    api.answer('POST', REDEMPTIONS, {
      json: { membership: null, email: '<img/src=x>@northwind.co' },
    });

    await signInPage.openLink(SIGN_IN_TOKEN);

    await expect(inviteNeededPage.email).toHaveText('<img/src=x>@northwind.co');
    await expect(inviteNeededPage.images).toHaveCount(0);
  });
});
