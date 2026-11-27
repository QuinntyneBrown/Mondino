// Accessibility sweep. Runs only when a person asks: npm run e2e:accessibility
// Traces to: L2-039, L2-041, L2-003, L2-004, L2-006, L2-044, L2-045, L2-053

import type { Answer, ApiFixture } from '../fixtures/api';
import { expect, test } from '../fixtures/test';
import { CITIES, lookupAnswer } from '../fixtures/invites';
import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { CREATE_CITY_SEARCHES, CREATE_LOOKUPS, NORTHWIND_CREATED, TEAMS } from '../fixtures/teams';
import type { CreateTeamPage } from '../pages/create-team.page';
import { expectNoViolations } from '../support/axe';

const refused = (status: number, code: string): Answer => ({
  status,
  headers: { 'content-type': 'application/problem+json' },
  json: { status, code },
});

/** Fills Sofia's Northwind and finds Milan from 20121, so "Create team" is the next step. */
async function findMilan(api: ApiFixture, page: CreateTeamPage): Promise<void> {
  api.answer('POST', CREATE_LOOKUPS, (route) => lookupAnswer(route.request().postDataJSON()));
  await page.fillNorthwind();
  await page.leavePostalCode();
  await expect(page.youLabel).toHaveText('You · Milan');
}

/** Reaches a state, and gives back what lets go of an answer it holds, if it holds one. */
type Reach = (api: ApiFixture, page: CreateTeamPage) => Promise<(() => void) | void>;

/** Each drawn state of Create Team, reached as the behaviour specs reach it. */
const states: Record<string, Reach> = {
  default: async () => undefined,
  locating: async (api, page) => {
    const held = api.hold('POST', CREATE_LOOKUPS);
    await page.fill({ country: 'Italy', postalCode: '20121' });
    await page.leavePostalCode();
    await expect(page.lookup).toHaveText('Finding 20121…');
    return () => held.release(lookupAnswer({ countryCode: 'IT', postalCode: '20121' }));
  },
  found: (api, page) => findMilan(api, page),
  'not-found': async (api, page) => {
    api.answer('POST', CREATE_LOOKUPS, (route) => lookupAnswer(route.request().postDataJSON()));
    await page.fill({ country: 'Italy', postalCode: '2012' });
    await page.leavePostalCode();
    await expect(page.postalCode).toHaveAttribute('aria-invalid', 'true');
  },
  'lookup-unavailable': async (api, page) => {
    api.answer('POST', CREATE_LOOKUPS, refused(503, 'postal_code_unavailable'));
    api.answer('POST', CREATE_CITY_SEARCHES, { json: [{ cityId: '3173435', city: CITIES.Milan }] });
    await page.fill({ country: 'Italy', postalCode: '20121' });
    await page.leavePostalCode();
    await expect(page.city).toBeVisible();
  },
  invalid: async (_api, page) => {
    await page.submit.click();
    await expect(page.teamNameError).toBeVisible();
  },
  submitting: async (api, page) => {
    await findMilan(api, page);
    const held = api.hold('POST', TEAMS);
    await page.submit.click();
    await expect(page.submit).toHaveText('Creating your team…');
    return () => held.release(refused(500, 'unexpected'));
  },
  error: async (api, page) => {
    await findMilan(api, page);
    api.answer('POST', TEAMS, refused(500, 'unexpected'));
    await page.submit.click();
    await expect(page.failed).toBeVisible();
  },
  'rate-limited': async (api, page) => {
    api.answer('POST', CREATE_LOOKUPS, {
      ...refused(429, 'rate_limited'),
      headers: { 'content-type': 'application/problem+json', 'retry-after': '582' },
    });
    await page.fill({ country: 'Italy', postalCode: '20121' });
    await page.leavePostalCode();
    await expect(page.rateLimit).toBeVisible();
  },
  created: async (api, page) => {
    await findMilan(api, page);
    api.answer('POST', TEAMS, NORTHWIND_CREATED);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await page.submit.click();
    await expect(page.title).toHaveText('Now bring everyone in.');
    await expect(page.inviteLink).toBeVisible();
  },
};

for (const [state, reach] of Object.entries(states)) {
  for (const theme of ['light', 'dark'] as const) {
    test(`Create Team ${state} has no WCAG 2.2 AA violation, ${theme}`, async ({
      api,
      createTeamPage,
    }) => {
      await createTeamPage.page.emulateMedia({ colorScheme: theme });
      await createTeamPage.open();
      await expect(createTeamPage.title).toBeVisible();
      const release = await reach(api, createTeamPage);

      await expectNoViolations(createTeamPage.page);
      release?.();
    });
  }
}
