// Accessibility sweep. Runs only when a person asks: npm run e2e:accessibility
// Traces to: L2-039, L2-041, L2-044, L2-045, L2-052

import type { ApiFixture } from '../fixtures/api';
import { expect, test } from '../fixtures/test';
import { LINK_ASKED, SIGN_IN_LINKS } from '../fixtures/sign-in';
import type { SignInPage } from '../pages/sign-in.page';
import { expectNoViolations } from '../support/axe';

/** Reaches a state, and gives back what lets go of an answer it holds, if it holds one. */
type Reach = (api: ApiFixture, page: SignInPage) => Promise<(() => void) | void>;

/** Each drawn state of Sign In, reached as a person reaches it. */
const states: Record<string, Reach> = {
  default: async (api) => {
    api.answer('POST', SIGN_IN_LINKS, LINK_ASKED);
  },
  invalid: async (api, page) => {
    api.answer('POST', SIGN_IN_LINKS, LINK_ASKED);
    await page.askForLink('sofia@northwind');
    await expect(page.emailError).toBeVisible();
  },
  submitting: async (api, page) => {
    const held = api.hold('POST', SIGN_IN_LINKS);
    await page.askForLink('sofia@northwind.co');
    await expect(page.spinner).toBeVisible();
    return () => held.release(LINK_ASKED);
  },
  sent: async (api, page) => {
    api.answer('POST', SIGN_IN_LINKS, LINK_ASKED);
    await page.askForLink('sofia@northwind.co');
    await expect(page.noticeTitle).toBeVisible();
  },
  error: async (api, page) => {
    api.answer('POST', SIGN_IN_LINKS, { status: 500 });
    await page.askForLink('sofia@northwind.co');
    await expect(page.failed).toBeVisible();
  },
};

for (const [state, reach] of Object.entries(states)) {
  for (const theme of ['light', 'dark'] as const) {
    test(`Sign In ${state} has no WCAG 2.2 AA violation, ${theme}`, async ({ api, signInPage }) => {
      await signInPage.page.emulateMedia({ colorScheme: theme });
      await signInPage.open();
      await expect(signInPage.footer).toBeVisible();
      const release = await reach(api, signInPage);

      await expectNoViolations(signInPage.page);
      release?.();
    });
  }
}
