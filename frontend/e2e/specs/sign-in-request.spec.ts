// Acceptance Test
// Traces to: L2-052, L2-043, L2-044
// Description: Asking for a link reads "Sending link…" once, then "Check your inbox" with the email as text, whatever the email; a request that fails keeps the email and offers "Try again"

import type { Request } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import { LINK_ASKED, SIGN_IN_LINKS } from '../fixtures/sign-in';

const sentText = (email: string) =>
  `We sent a sign-in link to ${email}. It works once, for the next 15 minutes.`;

test.describe('Sign In: asking for a link', () => {
  test('the button reads "Sending link…" and is disabled until the answer, then "Check your inbox" names the email', async ({
    api,
    signInPage,
  }) => {
    // Given Sign In, and the request held unanswered
    const held = api.hold('POST', SIGN_IN_LINKS);
    const sent: Request[] = [];
    signInPage.page.on('request', (request) => {
      if (request.url().endsWith(SIGN_IN_LINKS)) sent.push(request);
    });
    await signInPage.open();

    // When Sofia asks for a link with her work email
    await signInPage.askForLink('sofia@northwind.co');

    // Then the button reads "Sending link…", busy and disabled, and the email went in the body
    await expect(signInPage.submit).toHaveText('Sending link…');
    await expect(signInPage.submit).toBeDisabled();
    await expect(signInPage.submit).toHaveAttribute('aria-busy', 'true');
    await expect(signInPage.spinner).toBeVisible();
    expect(sent).toHaveLength(1);
    expect(sent[0].postDataJSON()).toEqual({ email: 'sofia@northwind.co' });
    expect(new URL(sent[0].url()).search).toBe('');

    // When the backend answers
    held.release(LINK_ASKED);

    // Then the form gives way to "Check your inbox", announced, with focus on its title
    await expect(signInPage.noticeTitle).toHaveText('Check your inbox');
    await expect(signInPage.notice).toHaveAttribute('role', 'status');
    await expect(signInPage.noticeText).toHaveText(sentText('sofia@northwind.co'));
    await expect(signInPage.noticeEmail).toHaveText('sofia@northwind.co');
    await expect(signInPage.noticeTitle).toBeFocused();
    await expect(signInPage.form).toHaveCount(0);
    await expect(signInPage.footer).toBeVisible();
  });

  test('pressing the button twice sends one request', async ({ api, signInPage }) => {
    const held = api.hold('POST', SIGN_IN_LINKS);
    let requests = 0;
    signInPage.page.on('request', (request) => {
      if (request.url().endsWith(SIGN_IN_LINKS)) requests++;
    });
    await signInPage.open();
    await signInPage.email.fill('sofia@northwind.co');

    // A double-click presses wherever the button is, as the first press redraws it busy; a second
    // click by locator could land on the button being replaced.
    await signInPage.submit.dblclick();
    await expect(signInPage.submit).toHaveAttribute('aria-busy', 'true');
    await signInPage.email.press('Enter');
    held.release(LINK_ASKED);

    await expect(signInPage.noticeTitle).toHaveText('Check your inbox');
    expect(requests).toBe(1);
  });

  test('an email Mondino does not know reads "Check your inbox" in exactly the same way', async ({
    api,
    signInPage,
  }) => {
    // Given the backend's answer, which is the same for every email
    api.answer('POST', SIGN_IN_LINKS, LINK_ASKED);
    await signInPage.open();

    // When a link is asked for an email that is on no team
    await signInPage.askForLink('stranger@elsewhere.co');

    // Then the screen reads as it does for a teammate's email
    await expect(signInPage.noticeTitle).toHaveText('Check your inbox');
    await expect(signInPage.noticeText).toHaveText(sentText('stranger@elsewhere.co'));
  });

  test('"Use another email" shows the form again', async ({ api, signInPage }) => {
    api.answer('POST', SIGN_IN_LINKS, LINK_ASKED);
    await signInPage.open();
    await signInPage.askForLink('sofia@northwind.co');
    await expect(signInPage.noticeTitle).toHaveText('Check your inbox');

    await expect(signInPage.useAnotherEmail).toHaveAttribute('href', '/sign-in');
    await signInPage.useAnotherEmail.click();

    await expect(signInPage.title).toHaveText('Welcome back.');
    await expect(signInPage.page).toHaveURL('/sign-in');
    await expect(signInPage.email).toBeFocused();
    await expect(signInPage.submit).toHaveText('Email me a sign-in link');
    await expect(signInPage.notice).toHaveCount(0);
  });

  test('the email is shown as text, never as markup', async ({ api, signInPage }) => {
    api.answer('POST', SIGN_IN_LINKS, LINK_ASKED);
    await signInPage.open();

    await signInPage.askForLink('<img/src=x>@northwind.co');

    await expect(signInPage.noticeEmail).toHaveText('<img/src=x>@northwind.co');
    await expect(signInPage.images).toHaveCount(0);
  });

  for (const [why, answer] of [
    ['the backend does not answer', { unanswered: true }],
    ['the backend fails', { status: 500 }],
    ['the device has asked too often', { status: 429, headers: { 'retry-after': '600' } }],
  ] as const) {
    test(`when ${why}, an alert says the link was not sent, the button reads "Try again" and the email is kept`, async ({
      api,
      signInPage,
    }) => {
      // Given a request for a link that fails
      api.answer('POST', SIGN_IN_LINKS, answer);
      await signInPage.open();

      // When Sofia asks for a link
      await signInPage.askForLink('sofia@northwind.co');

      // Then an alert says so, the button reads "Try again", and her email is kept
      await expect(signInPage.failed).toHaveText(
        'We couldn’t send the link. Mondino didn’t answer — try again in a moment.',
      );
      await expect(signInPage.failed).toHaveAttribute('role', 'alert');
      await expect(signInPage.submit).toHaveText('Try again');
      await expect(signInPage.submit).toBeEnabled();
      await expect(signInPage.email).toHaveValue('sofia@northwind.co');

      // And "Try again" asks again
      api.answer('POST', SIGN_IN_LINKS, LINK_ASKED);
      await signInPage.submit.click();
      await expect(signInPage.noticeTitle).toHaveText('Check your inbox');
    });
  }
});
