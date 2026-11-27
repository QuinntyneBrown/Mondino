// Acceptance Test
// Traces to: L2-052, L2-039
// Description: On a 320 px phone, by touch, Sofia asks for a link and reads "Check your inbox"; on a desktop, by keyboard alone, she does the same

import { expect, test } from '../fixtures/test';
import { LINK_ASKED, SIGN_IN_LINKS } from '../fixtures/sign-in';

test.describe('Sign In on a 320 px phone, by touch', () => {
  test.use({ viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true });

  test('Sofia taps the field and the button, and reads "Check your inbox"', async ({
    api,
    signInPage,
  }) => {
    api.answer('POST', SIGN_IN_LINKS, LINK_ASKED);
    await signInPage.open();

    await signInPage.email.tap();
    await signInPage.page.keyboard.type('sofia@northwind.co');
    await signInPage.submit.tap();

    await expect(signInPage.noticeTitle).toHaveText('Check your inbox');
    await signInPage.useAnotherEmail.tap();
    await expect(signInPage.title).toHaveText('Welcome back.');
  });
});

test('by keyboard alone, Sofia reaches the field, asks for a link and moves on', async ({
  api,
  signInPage,
}) => {
  api.answer('POST', SIGN_IN_LINKS, LINK_ASKED);
  await signInPage.open();
  await expect(signInPage.title).toBeVisible();

  // Skip to content, then the field
  await signInPage.page.keyboard.press('Tab');
  await signInPage.page.keyboard.press('Enter');
  await signInPage.page.keyboard.press('Tab');
  await expect(signInPage.email).toBeFocused();
  await signInPage.page.keyboard.type('sofia@northwind.co');
  await signInPage.page.keyboard.press('Tab');
  await expect(signInPage.submit).toBeFocused();
  await signInPage.page.keyboard.press('Enter');

  await expect(signInPage.noticeTitle).toBeFocused();
  await signInPage.page.keyboard.press('Tab');
  await expect(signInPage.useAnotherEmail).toBeFocused();
  await signInPage.page.keyboard.press('Enter');
  await expect(signInPage.email).toBeFocused();
});
