// Accessibility sweep. Runs only when a person asks: npm run e2e:accessibility
// Traces to: L2-039, L2-041

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '../fixtures/test';

for (const theme of ['light', 'dark'] as const) {
  test(`Not Found has no WCAG 2.2 AA violation, ${theme}`, async ({ notFoundPage }) => {
    await notFoundPage.page.emulateMedia({ colorScheme: theme });
    await notFoundPage.open('/team/northwind/pins/old');
    await expect(notFoundPage.title).toBeVisible();

    const results = await new AxeBuilder({ page: notFoundPage.page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
