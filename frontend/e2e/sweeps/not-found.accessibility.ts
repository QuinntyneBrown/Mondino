// Accessibility sweep. Runs only when a person asks: npm run e2e:accessibility
// Traces to: L2-039, L2-041, L2-038

import { expect, test } from '../fixtures/test';
import { expectNoViolations } from '../support/axe';

for (const theme of ['light', 'dark'] as const) {
  test(`Not Found has no WCAG 2.2 AA violation, ${theme}`, async ({ notFoundPage }) => {
    await notFoundPage.page.emulateMedia({ colorScheme: theme });
    await notFoundPage.open('/team/northwind/pins/old');
    await expect(notFoundPage.title).toBeVisible();

    await expectNoViolations(notFoundPage.page);
  });
}
