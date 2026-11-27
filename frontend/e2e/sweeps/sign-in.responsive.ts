// Responsive sweep. Runs only when a person asks: npm run e2e:responsive
// Traces to: L2-037, L2-052

import { expect, test } from '../fixtures/test';
import { LINK_ASKED, SIGN_IN_LINKS } from '../fixtures/sign-in';
import { fitsItsWidth, smallestTarget } from '../support/layout';

for (const width of [320, 375, 576, 768, 992, 1200, 1920]) {
  test(`Sign In fits ${width} px, with the form and "Check your inbox"`, async ({
    api,
    signInPage,
  }) => {
    api.answer('POST', SIGN_IN_LINKS, LINK_ASKED);
    await signInPage.page.setViewportSize({ width, height: 800 });
    await signInPage.open();

    await expect(signInPage.title).toBeVisible();
    expect(await fitsItsWidth(signInPage.page), 'no horizontal scroll').toBe(true);
    expect(await smallestTarget(signInPage.email)).toBeGreaterThanOrEqual(44);
    expect(await smallestTarget(signInPage.submit)).toBeGreaterThanOrEqual(44);

    await signInPage.askForLink('sofia@northwind.co');
    await expect(signInPage.noticeTitle).toBeVisible();
    expect(await fitsItsWidth(signInPage.page), 'no horizontal scroll').toBe(true);
    expect(await smallestTarget(signInPage.useAnotherEmail)).toBeGreaterThanOrEqual(44);
  });
}
