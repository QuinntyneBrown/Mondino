// Accessibility sweep. Runs only when a person asks: npm run e2e:accessibility
// Traces to: L2-039, L2-041, L2-001

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '../fixtures/test';
import { NORTHWIND_INVITE, northwindInvite } from '../fixtures/invites';

const states = {
  default: { answer: northwindInvite() },
  'invite-unusable': {
    answer: {
      status: 404,
      headers: { 'content-type': 'application/problem+json' },
      json: { code: 'invite_not_found' },
    },
  },
  error: {
    answer: {
      status: 503,
      headers: { 'content-type': 'application/problem+json' },
      json: { code: 'unexpected' },
    },
  },
};

for (const [state, { answer }] of Object.entries(states)) {
  for (const theme of ['light', 'dark'] as const) {
    test(`Join ${state} has no WCAG 2.2 AA violation, ${theme}`, async ({ api, joinPage }) => {
      api.answer('GET', NORTHWIND_INVITE, answer);
      await joinPage.page.emulateMedia({ colorScheme: theme });
      await joinPage.open('northwind-7Kq2');
      await expect(joinPage.footer).toBeVisible();

      const results = await new AxeBuilder({ page: joinPage.page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
}
