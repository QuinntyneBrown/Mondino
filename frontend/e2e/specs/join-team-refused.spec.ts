// Acceptance Test
// Traces to: L2-005, L2-045, L2-040
// Description: A failed join keeps what was typed and offers to try again; a full team says so in the form's place; too many joins wait

import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import type { Request } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import {
  lookupAnswer,
  NORTHWIND_INVITE,
  NORTHWIND_JOINS,
  NORTHWIND_LOOKUPS,
  northwindInvite,
  SOFIA_JOINED,
} from '../fixtures/invites';
import { announcements, listenForAnnouncements } from '../support/accessibility';

const fullText =
  'The team has all 500 of its places taken. Ask a teammate at Northwind to tell you when a place opens, then open this link again.';

test.describe('Join: a join that is refused', () => {
  test.beforeEach(async ({ api, joinPage }) => {
    api.answer('GET', NORTHWIND_INVITE, northwindInvite());
    api.answer('POST', NORTHWIND_LOOKUPS, (route) => lookupAnswer(route.request().postDataJSON()));
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await joinPage.open('northwind-7Kq2');
    await joinPage.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });
    await joinPage.leavePostalCode();
    await expect(joinPage.submit).toHaveText('Join Northwind');
  });

  test('a join that fails keeps what was typed and joins on "Try joining again"', async ({
    api,
    joinPage,
  }) => {
    // Given the backend fails the join once
    const joins: Request[] = [];
    api.answer('POST', NORTHWIND_JOINS, (route) => {
      joins.push(route.request());
      return joins.length === 1
        ? {
            status: 500,
            headers: { 'content-type': 'application/problem+json' },
            json: { status: 500, code: 'unexpected' },
          }
        : SOFIA_JOINED;
    });

    // When "Join Northwind" is chosen
    await joinPage.submit.click();

    // Then Join stays, with an alert, the button "Try joining again" and everything intact
    await expect(joinPage.joinFailed).toHaveText(
      'We couldn’t add you to Northwind. Your details are still here — try joining again.',
    );
    await expect(joinPage.joinFailed).toHaveAttribute('role', 'alert');
    await expect(joinPage.submit).toHaveText('Try joining again');
    await expect(joinPage.submit).toBeEnabled();
    await expect(joinPage.name).toHaveValue('Sofia Bianchi');
    await expect(joinPage.country).toHaveValue('IT');
    await expect(joinPage.postalCode).toHaveValue('20121');
    await expect(joinPage.youLabel).toHaveText('You · Milan');
    await expect(joinPage.page).toHaveURL('/join/northwind-7Kq2');

    // When it is tried again, the same join request is sent, and the Globe opens
    await joinPage.submit.click();
    await expect(joinPage.page).toHaveURL('/globe');
    expect(joins).toHaveLength(2);
    expect(joins[1].postDataJSON()).toEqual(joins[0].postDataJSON());
  });

  test('a join with no answer at all is reported the same way', async ({ api, joinPage }) => {
    api.answer('POST', NORTHWIND_JOINS, { unanswered: true });

    await joinPage.submit.click();

    await expect(joinPage.joinFailed).toContainText('We couldn’t add you to Northwind.');
    await expect(joinPage.submit).toHaveText('Try joining again');
  });

  test('a team that filled meanwhile says so in the form’s place and makes no pin', async ({
    api,
    joinPage,
  }) => {
    // Given Northwind has filled while Sofia was on the form
    api.refuse('POST', NORTHWIND_JOINS, 409, 'team_full');

    // When her join is refused with team_full
    await joinPage.submit.click();

    // Then the notice takes the form's place, and the globe has no pins
    await expect(joinPage.noticeTitle).toHaveText('Northwind is full');
    await expect(joinPage.noticeText).toHaveText(fullText);
    await expect(joinPage.form).toHaveCount(0);
    await expect(joinPage.team).toHaveCount(0);
    await expect(joinPage.globe).toHaveAccessibleName('The globe, with no pins');
    await expect(joinPage.allPins).toHaveCount(0);
    await expect(joinPage.page).toHaveURL('/join/northwind-7Kq2');
  });

  test('too many joins ask to wait, keep what was typed, and find the city again at zero', async ({
    api,
    joinPage,
  }) => {
    // Given the join is refused with 429 and Retry-After: 582
    api.answer('POST', NORTHWIND_JOINS, {
      status: 429,
      headers: { 'content-type': 'application/problem+json', 'retry-after': '582' },
      json: { status: 429, code: 'rate_limited' },
    });

    // When "Join Northwind" is chosen
    await listenForAnnouncements(joinPage.page);
    await joinPage.submit.click();

    // Then the countdown shows, the button waits, and what was typed is kept
    await expect(joinPage.rateLimit).toHaveAttribute('role', 'alert');
    await expect(joinPage.rateLimit).toContainText('Too many tries from this device.');
    await expect(joinPage.rateLimitCountdown).toHaveText('9:42');
    await expect(joinPage.submit).toHaveText('Place my pin');
    await expect(joinPage.submit).toBeDisabled();
    await expect(joinPage.name).toHaveValue('Sofia Bianchi');
    await expect(joinPage.postalCode).toHaveValue('20121');

    // And the countdown ticks on, announced once and not every second
    await joinPage.page.clock.runFor(10_000);
    await expect(joinPage.rateLimitCountdown).toHaveText('9:32');
    expect(
      (await announcements(joinPage.page)).filter((said) => said.politeness === 'assertive'),
    ).toEqual([
      {
        politeness: 'assertive',
        text: expect.stringMatching(
          /^Too many tries from this device\. You can try again in 9:42\b/,
        ),
      },
    ]);

    // And at zero the button comes back, and finds the city again
    await joinPage.page.clock.runFor(572_000);
    await expect(joinPage.rateLimit).toHaveCount(0);
    await expect(joinPage.submit).toBeEnabled();
    await joinPage.submit.click();
    await expect(joinPage.submit).toHaveText('Join Northwind');
  });
});

test('an invite link of a full team shows its name and nothing else about it', async ({
  api,
  joinPage,
}) => {
  // Given Northwind has all 500 of its places taken
  api.answer(
    'GET',
    NORTHWIND_INVITE,
    northwindInvite({ full: true, teammateCount: 0, positions: [], avatars: [] }),
  );

  // When its invite link is opened
  await joinPage.open('northwind-7Kq2');

  // Then a notice stands in the form's place, with no count, no initials and no pins
  await expect(joinPage.noticeTitle).toHaveText('Northwind is full');
  await expect(joinPage.noticeText).toHaveText(fullText);
  await expect(joinPage.form).toHaveCount(0);
  await expect(joinPage.avatars).toHaveCount(0);
  await expect(joinPage.main).not.toContainText('already here');
  await expect(joinPage.globe).toHaveAccessibleName('The globe, with no pins');
  await expect(joinPage.allPins).toHaveCount(0);
  await expect(joinPage.signIn).toBeVisible();
});
