// Accessibility sweep. Runs only when a person asks: npm run e2e:accessibility
// Traces to: L2-039, L2-041, L2-001, L2-002, L2-003, L2-004, L2-005, L2-006, L2-045, L2-049, L2-052

import type { Answer, ApiFixture } from '../fixtures/api';
import { expect, test } from '../fixtures/test';
import {
  CITIES,
  lookupAnswer,
  NORTHWIND_CITY_SEARCHES,
  NORTHWIND_INVITE,
  NORTHWIND_JOINS,
  NORTHWIND_LOOKUPS,
  northwindInvite,
} from '../fixtures/invites';
import type { JoinPage } from '../pages/join.page';
import { expectNoViolations } from '../support/axe';

const refused = (status: number, code: string): Answer => ({
  status,
  headers: { 'content-type': 'application/problem+json' },
  json: { status, code },
});

/** Opens Northwind's invite link once it answers, and waits for the form. */
async function openTheInvite(api: ApiFixture, page: JoinPage): Promise<void> {
  api.answer('GET', NORTHWIND_INVITE, northwindInvite());
  api.answer('POST', NORTHWIND_LOOKUPS, (route) => lookupAnswer(route.request().postDataJSON()));
  await page.open('northwind-7Kq2');
  await expect(page.form).toBeVisible();
}

/** Opens the invite link and finds Milan from 20121, so "Join Northwind" is the next step. */
async function findMilan(api: ApiFixture, page: JoinPage): Promise<void> {
  await openTheInvite(api, page);
  await page.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });
  await page.leavePostalCode();
  await expect(page.submit).toHaveText('Join Northwind');
}

/** Reaches a state, and gives back what lets go of an answer it holds, if it holds one. */
type Reach = (api: ApiFixture, page: JoinPage) => Promise<(() => void) | void>;

/** Each drawn state of Join, reached as the behaviour specs reach it. */
const states: Record<string, Reach> = {
  default: (api, page) => openTheInvite(api, page),
  loading: async (api, page) => {
    const held = api.hold('GET', NORTHWIND_INVITE);
    await page.open('northwind-7Kq2');
    await expect(page.status).toHaveText('Opening your invite link…');
    return () => held.release(northwindInvite());
  },
  locating: async (api, page) => {
    await openTheInvite(api, page);
    const held = api.hold('POST', NORTHWIND_LOOKUPS);
    await page.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });
    await page.leavePostalCode();
    await expect(page.lookup).toHaveText('Finding 20121…');
    return () => held.release(lookupAnswer({ countryCode: 'IT', postalCode: '20121' }));
  },
  found: async (api, page) => {
    await findMilan(api, page);
    await expect(page.youLabel).toHaveText('You · Milan');
  },
  'not-found': async (api, page) => {
    await openTheInvite(api, page);
    await page.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '2012' });
    await page.leavePostalCode();
    await expect(page.postalCode).toHaveAttribute('aria-invalid', 'true');
  },
  'lookup-unavailable': async (api, page) => {
    await openTheInvite(api, page);
    api.answer('POST', NORTHWIND_LOOKUPS, refused(503, 'postal_code_unavailable'));
    await page.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });
    await page.leavePostalCode();
    await expect(page.city).toBeVisible();
  },
  'choosing-city': async (api, page) => {
    await openTheInvite(api, page);
    api.answer('POST', NORTHWIND_LOOKUPS, refused(503, 'postal_code_unavailable'));
    api.answer('POST', NORTHWIND_CITY_SEARCHES, {
      json: [
        { cityId: '3173435', city: CITIES.Milan },
        { cityId: '2524155', city: CITIES.Milazzo },
      ],
    });
    await page.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });
    await page.leavePostalCode();
    await page.city.fill('Mil');
    await expect(page.cityOptions).toHaveCount(2);
  },
  invalid: async (api, page) => {
    await openTheInvite(api, page);
    await page.submit.click();
    await expect(page.summary).toBeVisible();
  },
  submitting: async (api, page) => {
    await findMilan(api, page);
    const held = api.hold('POST', NORTHWIND_JOINS);
    await page.submit.click();
    await expect(page.submit).toHaveText('Joining Northwind…');
    return () => held.release(refused(500, 'unexpected'));
  },
  'join-failed': async (api, page) => {
    await findMilan(api, page);
    api.answer('POST', NORTHWIND_JOINS, refused(500, 'unexpected'));
    await page.submit.click();
    await expect(page.joinFailed).toBeVisible();
  },
  'rate-limited': async (api, page) => {
    await findMilan(api, page);
    api.answer('POST', NORTHWIND_JOINS, {
      ...refused(429, 'rate_limited'),
      headers: { 'content-type': 'application/problem+json', 'retry-after': '582' },
    });
    await page.submit.click();
    await expect(page.rateLimit).toBeVisible();
  },
  'team-full': async (api, page) => {
    api.answer(
      'GET',
      NORTHWIND_INVITE,
      northwindInvite({ full: true, teammateCount: 0, positions: [], avatars: [] }),
    );
    await page.open('northwind-7Kq2');
    await expect(page.noticeTitle).toHaveText('Northwind is full');
  },
  'invite-unusable': async (api, page) => {
    api.answer('GET', NORTHWIND_INVITE, refused(404, 'invite_not_found'));
    await page.open('northwind-7Kq2');
    await expect(page.startYourOwnTeam).toBeVisible();
  },
  error: async (api, page) => {
    api.answer('GET', NORTHWIND_INVITE, refused(503, 'unexpected'));
    await page.open('northwind-7Kq2');
    await expect(page.tryAgain).toBeVisible();
  },
};

for (const [state, reach] of Object.entries(states)) {
  for (const theme of ['light', 'dark'] as const) {
    test(`Join ${state} has no WCAG 2.2 AA violation, ${theme}`, async ({ api, joinPage }) => {
      await joinPage.page.emulateMedia({ colorScheme: theme });
      const release = await reach(api, joinPage);
      await expect(joinPage.footer).toBeVisible();

      await expectNoViolations(joinPage.page);
      release?.();
    });
  }
}
