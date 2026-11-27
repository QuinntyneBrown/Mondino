// Accessibility sweep. Runs only when a person asks: npm run e2e:accessibility
// Traces to: L2-039, L2-041, L2-052

import AxeBuilder from '@axe-core/playwright';
import type { Answer } from '../fixtures/api';
import { expect, test } from '../fixtures/test';
import { LINK_ASKED, SIGN_IN_LINKS } from '../fixtures/sign-in';
import type { SignInPage } from '../pages/sign-in.page';

/** Each drawn state of Sign In, reached as a person reaches it. */
const states: Record<string, { answer: Answer; reach: (page: SignInPage) => Promise<void> }> = {
  default: { answer: LINK_ASKED, reach: async () => undefined },
  invalid: { answer: LINK_ASKED, reach: (page) => page.askForLink('sofia@northwind') },
  sent: { answer: LINK_ASKED, reach: (page) => page.askForLink('sofia@northwind.co') },
  error: { answer: { status: 500 }, reach: (page) => page.askForLink('sofia@northwind.co') },
};

for (const [state, { answer, reach }] of Object.entries(states)) {
  for (const theme of ['light', 'dark'] as const) {
    test(`Sign In ${state} has no WCAG 2.2 AA violation, ${theme}`, async ({ api, signInPage }) => {
      api.answer('POST', SIGN_IN_LINKS, answer);
      await signInPage.page.emulateMedia({ colorScheme: theme });
      await signInPage.open();
      await expect(signInPage.footer).toBeVisible();
      await reach(signInPage);

      const results = await new AxeBuilder({ page: signInPage.page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
}
