// Acceptance Test
// Traces to: L2-002
// Description: Join asks for a name, a country and a postal code, and says what is missing

import { expect, test } from '../fixtures/test';
import { NORTHWIND_INVITE, northwindInvite } from '../fixtures/invites';

test.describe('Join: give a name, a country and a postal code', () => {
  test.beforeEach(async ({ api, joinPage }) => {
    api.answer('GET', NORTHWIND_INVITE, northwindInvite());
    await joinPage.open('northwind-7Kq2');
    await expect(joinPage.title).toHaveText('Put yourself on the map.');
  });

  test('the form has exactly the three fields, with the privacy line under the postal code', async ({
    joinPage,
  }) => {
    // Given the Join screen with nothing typed
    // Then the form has a name, a country and a postal code and no other field
    await expect(joinPage.formControls).toHaveCount(3);
    await expect(joinPage.lookup).toHaveText(
      'Only your city is shown. Your postal code stays private.',
    );
    await expect(joinPage.postalCode).toHaveAttribute('aria-describedby', 'lookup');
    await expect(joinPage.submit).toHaveText('Place my pin');
    // And the screen names no outside source
    await expect(joinPage.main).not.toContainText(/GeoNames|Open-Meteo/i);
  });

  test('submitting with nothing typed says what is missing, in a summary that takes focus', async ({
    api,
    joinPage,
  }) => {
    // Given the Join screen with nothing typed
    // When the form is submitted
    await joinPage.submit.click();

    // Then a summary above the fields says two things are missing, links to each, and has focus
    await expect(joinPage.summaryTitle).toHaveText('Two things are missing');
    await expect(joinPage.summary).toHaveAttribute('role', 'alert');
    await expect(joinPage.summary).toBeFocused();
    await expect(joinPage.summaryLink('Add your name')).toBeVisible();
    await expect(joinPage.summaryLink('Enter a postal code')).toBeVisible();

    // And each field is marked invalid with its message under it
    await expect(joinPage.name).toHaveAttribute('aria-invalid', 'true');
    await expect(joinPage.nameError).toHaveText(
      'Add your name so teammates know whose pin this is.',
    );
    await expect(joinPage.name).toHaveAttribute('aria-describedby', 'name-error');
    await expect(joinPage.postalCode).toHaveAttribute('aria-invalid', 'true');
    await expect(joinPage.postalCodeError).toHaveText('Enter a postal code.');

    // And no lookup was made: the API fixture would fail the spec on an unanswered request
    void api;
  });

  test('a link in the summary moves focus to its field and leaves the address alone', async ({
    joinPage,
  }) => {
    await joinPage.submit.click();
    await expect(joinPage.summary).toBeFocused();

    await joinPage.summaryLink('Enter a postal code').click();

    await expect(joinPage.postalCode).toBeFocused();
    await expect(joinPage.page).toHaveURL(/\/join\/northwind-7Kq2$/);
  });

  test('a name of only spaces is missing', async ({ joinPage }) => {
    // Given a name of spaces and an empty postal code is filled, then the postal code
    await joinPage.fill({ name: '   ', postalCode: '' });
    await joinPage.page.keyboard.press('Enter');

    await expect(joinPage.summaryTitle).toHaveText('Two things are missing');
    await expect(joinPage.name).toHaveAttribute('aria-invalid', 'true');
  });

  test('a name longer than 60 characters is refused with the limit', async ({ joinPage }) => {
    // Given a name of 61 characters (pasted past the field's own limit)
    await joinPage.name.evaluate((input: HTMLInputElement) => {
      input.value = 'S'.repeat(61);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // When the form is submitted
    await joinPage.submit.click();

    // Then the pin is not placed and the message under the name gives the limit
    await expect(joinPage.nameError).toHaveText(
      'Add your name so teammates know whose pin this is, in 60 characters or fewer.',
    );
    await expect(joinPage.summaryLink('Shorten your name')).toBeVisible();
  });

  test('the footer is "Already on Mondino? Sign in"', async ({ joinPage }) => {
    await expect(joinPage.footer).toHaveText('Already on Mondino? Sign in');
  });
});
