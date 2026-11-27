// Acceptance Test
// Traces to: L2-052, L2-044, L2-041
// Description: Text that is not an email sends nothing, marks the field invalid with an alert under it, and puts focus back on the field

import { expect, test } from '../fixtures/test';

test.describe('Sign In: an email that is not one', () => {
  for (const typed of ['sofia@northwind', 'sofia', '']) {
    test(`"${typed}" sends nothing and says it doesn’t look like an email address`, async ({
      page,
      signInPage,
    }) => {
      // Given Sign In, and every request the browser makes to the backend counted
      const sent: string[] = [];
      page.on('request', (request) => {
        if (new URL(request.url()).pathname.startsWith('/api/')) sent.push(request.url());
      });
      await signInPage.open();

      // When text that is not an email is typed and the button pressed
      await signInPage.askForLink(typed);

      // Then the field is marked invalid, the message is an alert under it, and focus is back on it
      await expect(signInPage.email).toHaveAttribute('aria-invalid', 'true');
      await expect(signInPage.emailError).toHaveText('That doesn’t look like an email address.');
      await expect(signInPage.emailError).toHaveAttribute('role', 'alert');
      await expect(signInPage.email).toHaveAttribute('aria-describedby', 'email-error');
      await expect(signInPage.email).toBeFocused();

      // And no request was sent
      expect(sent).toEqual([]);
    });
  }

  test('the message goes as soon as the field is edited', async ({ signInPage }) => {
    await signInPage.open();
    await signInPage.askForLink('sofia@northwind');
    await expect(signInPage.emailError).toBeVisible();

    await signInPage.email.pressSequentially('.co');

    await expect(signInPage.emailError).toHaveCount(0);
    await expect(signInPage.email).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('pressing Enter in the field checks it too', async ({ signInPage }) => {
    await signInPage.open();
    await signInPage.email.fill('sofia@northwind');

    await signInPage.email.press('Enter');

    await expect(signInPage.emailError).toHaveText('That doesn’t look like an email address.');
    await expect(signInPage.email).toBeFocused();
  });
});
