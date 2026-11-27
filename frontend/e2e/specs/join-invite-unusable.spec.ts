// Acceptance Test
// Traces to: L2-001, L2-045
// Description: An invite link that cannot be used, or that could not be opened, says so and shows nothing of any team

import { expect, test } from '../fixtures/test';
import { NORTHWIND_INVITE, northwindInvite } from '../fixtures/invites';

test.describe('Join: an invite link that cannot be opened', () => {
  for (const [kind, token] of [
    ['does not exist', 'nobody-0000'],
    ['was mistyped', 'northwind-7kq2'],
    ['has been reset', 'northwind-old1'],
  ] as const) {
    test(`an invite link that ${kind} says it no longer works`, async ({ api, joinPage }) => {
      // Given an invite link that matches no team
      api.refuse('GET', `/api/invites/${token}`, 404, 'invite_not_found');

      // When a person opens it
      await joinPage.open(token);

      // Then a notice stands in place of the form, and the screen shows nothing of any team
      await expect(joinPage.noticeTitle).toHaveText('This invite link no longer works');
      await expect(joinPage.noticeText).toHaveText(
        'Someone on the team reset it, so it can’t be used to join. Ask whoever sent it for the new link.',
      );
      await expect(joinPage.form).toHaveCount(0);
      await expect(joinPage.team).toHaveCount(0);
      await expect(joinPage.globe).toHaveAccessibleName('The globe, with no pins');
      await expect(joinPage.pins).toHaveCount(0);
      await expect(joinPage.footer).toHaveText('Already on Mondino? Sign in');
    });
  }

  test('"Start your own team" leads to Create Team', async ({ api, joinPage }) => {
    // Given an invite link that no longer works
    api.refuse('GET', '/api/invites/nobody-0000', 404, 'invite_not_found');
    await joinPage.open('nobody-0000');

    // When "Start your own team" is used
    await expect(joinPage.startYourOwnTeam).toHaveAttribute('href', '/new');
    await joinPage.startYourOwnTeam.click();

    // Then the address is Create Team's
    await expect(joinPage.page).toHaveURL(/\/new$/);
  });

  for (const [cause, refuse] of [
    ['the backend does not answer', 'unanswered'],
    ['the backend fails', 'unexpected'],
    ['one client has opened invite links too often', 'rate_limited'],
  ] as const) {
    test(`when ${cause}, the screen says the invite could not be opened`, async ({
      api,
      joinPage,
    }) => {
      // Given that opening the invite link fails this way
      if (refuse === 'unanswered') {
        api.answer('GET', NORTHWIND_INVITE, { unanswered: true });
      } else if (refuse === 'rate_limited') {
        api.answer('GET', NORTHWIND_INVITE, {
          status: 429,
          headers: { 'content-type': 'application/problem+json', 'retry-after': '42' },
          json: { status: 429, code: 'rate_limited' },
        });
      } else {
        api.refuse('GET', NORTHWIND_INVITE, 500, 'unexpected');
      }

      // When a person opens it
      await joinPage.open('northwind-7Kq2');

      // Then a notice says it could not be opened, offers "Try again", and shows nothing of the team
      await expect(joinPage.noticeTitle).toHaveText('We couldn’t open this invite');
      await expect(joinPage.noticeText).toHaveText(
        'Mondino didn’t answer. Check your connection and try the link again — it hasn’t been used up.',
      );
      await expect(joinPage.tryAgain).toBeVisible();
      await expect(joinPage.main).not.toContainText('no longer works');
      await expect(joinPage.team).toHaveCount(0);
      await expect(joinPage.form).toHaveCount(0);
      await expect(joinPage.pins).toHaveCount(0);
      await expect(joinPage.globe).toHaveAccessibleName('The globe, with no pins');
      await expect(joinPage.footer).toHaveText('Already on Mondino? Sign in');
    });
  }

  test('"Try again" opens the invite link again', async ({ api, joinPage }) => {
    // Given an invite link that could not be opened
    api.refuse('GET', NORTHWIND_INVITE, 503, 'unexpected');
    await joinPage.open('northwind-7Kq2');
    await expect(joinPage.tryAgain).toBeVisible();

    // When the backend answers again and "Try again" is used
    api.answer('GET', NORTHWIND_INVITE, northwindInvite());
    await joinPage.tryAgain.click();

    // Then the Join screen shows the team
    await expect(joinPage.team).toHaveText(/Joining Northwind · 12 already here/);
    await expect(joinPage.notice).toHaveCount(0);
  });
});
