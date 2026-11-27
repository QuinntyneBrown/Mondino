// Acceptance Test
// Traces to: L2-004, L2-006, L2-045, L2-049, L2-040
// Description: A postal code that cannot be found says the country's form; a lookup that is down offers "Your city"; too many tries wait

import type { Request } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import {
  CITIES,
  lookupAnswer,
  NORTHWIND_CITY_SEARCHES,
  NORTHWIND_INVITE,
  NORTHWIND_LOOKUPS,
  northwindInvite,
} from '../fixtures/invites';
import { announcements, listenForAnnouncements } from '../support/accessibility';

test.describe('Join: a postal code that cannot be found, and a lookup that is down', () => {
  test.beforeEach(async ({ api, joinPage }) => {
    api.answer('GET', NORTHWIND_INVITE, northwindInvite());
    api.answer('POST', NORTHWIND_LOOKUPS, (route) => lookupAnswer(route.request().postDataJSON()));
    await joinPage.open('northwind-7Kq2');
    await expect(joinPage.title).toHaveText('Put yourself on the map.');
  });

  test('"2012" in Italy is refused with the form Italian postal codes take', async ({
    joinPage,
  }) => {
    // Given Italy and the postal code "2012"
    await joinPage.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '2012' });

    // When it is looked up
    await joinPage.leavePostalCode();

    // Then an alert names the postal code, the country and the form, and nothing is placed
    await expect(joinPage.lookup).toHaveText(
      'We couldn’t find “2012” in Italy. Italian postal codes have five digits, like 20121.',
    );
    await expect(joinPage.lookup).toHaveAttribute('role', 'alert');
    await expect(joinPage.postalCode).toHaveAttribute('aria-invalid', 'true');
    await expect(joinPage.youPin).toHaveCount(0);
    await expect(joinPage.submit).toHaveText('Place my pin');

    // And when the postal code is edited, the alert goes
    await joinPage.postalCode.fill('20121');
    await expect(joinPage.lookup).toHaveText(
      'Only your city is shown. Your postal code stays private.',
    );
    await expect(joinPage.postalCode).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('a Canadian postal code in the wrong form gives the Canadian form', async ({ joinPage }) => {
    await joinPage.fill({ name: 'Sofia Bianchi', country: 'Canada', postalCode: '123 ABC' });
    await joinPage.leavePostalCode();

    await expect(joinPage.lookup).toHaveText(
      'We couldn’t find “123 ABC” in Canada. Canadian postal codes look like A1A 1A1.',
    );
  });

  test('when the lookup is down, "Your city" takes the postal code’s place and places the pin at the city', async ({
    api,
    joinPage,
  }) => {
    // Given the postal code source does not answer
    api.refuse('POST', NORTHWIND_LOOKUPS, 503, 'postal_code_unavailable');
    const searches: Request[] = [];
    api.answer('POST', NORTHWIND_CITY_SEARCHES, (route) => {
      searches.push(route.request());
      return {
        json: [
          { cityId: '3173435', city: CITIES.Milan },
          { cityId: '2524155', city: CITIES.Milazzo },
        ],
      };
    });
    await joinPage.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });

    // When the lookup fails
    await joinPage.leavePostalCode();

    // Then the postal code field is switched off with what was typed kept, and "Your city" appears
    await expect(joinPage.postalCode).toBeDisabled();
    await expect(joinPage.postalCode).toHaveValue('20121');
    await expect(joinPage.city).toBeVisible();
    await expect(joinPage.cityHelp).toHaveText(
      'Postal code lookup is down right now, so pick your city instead. Your pin goes to its centre.',
    );
    await expect(joinPage.cityHelp).toHaveAttribute('role', 'status');
    // And nothing says the postal code is wrong
    await expect(joinPage.postalCode).not.toHaveAttribute('aria-invalid', 'true');
    await expect(joinPage.main).not.toContainText('We couldn’t find');

    // When "Mil" is typed, the matching cities of Italy are listed, from the backend
    await joinPage.city.fill('Mil');
    await expect(joinPage.cityOptions).toHaveText(['Milan Lombardy', 'Milazzo Sicily']);
    await expect(joinPage.city).toHaveAttribute('aria-expanded', 'true');
    expect(searches.at(-1)?.postDataJSON()).toEqual({ countryCode: 'IT', text: 'Mil' });

    // And Milan is chosen by keyboard
    await joinPage.city.press('ArrowDown');
    await expect(joinPage.cityOptions.first()).toHaveAttribute('aria-selected', 'true');
    await joinPage.city.press('Enter');
    await expect(joinPage.city).toHaveValue('Milan');
    await expect(joinPage.city).toHaveAttribute('aria-expanded', 'false');
    await expect(joinPage.submit).toHaveText('Place my pin in Milan');

    // When it is used, the pin is placed at the city, as a postal code would place it
    await joinPage.submit.click();
    await expect(joinPage.youLabel).toHaveText('You · Milan');
    await expect(joinPage.lookup).toHaveText('Milan, Lombardy — pinned at city level.');
    await expect(joinPage.submit).toHaveText('Join Northwind');
  });

  test('a city in the list is chosen by touch', async ({ api, joinPage }) => {
    api.refuse('POST', NORTHWIND_LOOKUPS, 503, 'postal_code_unavailable');
    api.answer('POST', NORTHWIND_CITY_SEARCHES, {
      json: [
        { cityId: '3173435', city: CITIES.Milan },
        { cityId: '2524155', city: CITIES.Milazzo },
      ],
    });
    await joinPage.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });
    await joinPage.leavePostalCode();

    await joinPage.city.fill('Mil');
    await joinPage.cityOptions.nth(1).click();

    await expect(joinPage.city).toHaveValue('Milazzo');
    await expect(joinPage.submit).toHaveText('Place my pin in Milazzo');
  });

  test('the lookup is tried again when the screen is next opened', async ({ api, joinPage }) => {
    // Given the lookup was down
    api.refuse('POST', NORTHWIND_LOOKUPS, 503, 'postal_code_unavailable');
    await joinPage.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });
    await joinPage.leavePostalCode();
    await expect(joinPage.city).toBeVisible();

    // When the screen is opened again, and the lookup answers
    api.answer('POST', NORTHWIND_LOOKUPS, (route) => lookupAnswer(route.request().postDataJSON()));
    await joinPage.open('northwind-7Kq2');
    await joinPage.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });
    await joinPage.leavePostalCode();

    // Then the postal code field is on, "Your city" is absent, and the postal code is found
    await expect(joinPage.youLabel).toHaveText('You · Milan');
    await expect(joinPage.postalCode).toBeEnabled();
    await expect(joinPage.city).toHaveCount(0);
  });

  test('too many tries ask to wait, keep what was typed, and come back at zero', async ({
    api,
    joinPage,
  }) => {
    // Given the lookup is refused with 429 and Retry-After: 42
    api.answer('POST', NORTHWIND_LOOKUPS, {
      status: 429,
      headers: { 'content-type': 'application/problem+json', 'retry-after': '42' },
      json: { status: 429, code: 'rate_limited' },
    });
    await joinPage.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });
    await listenForAnnouncements(joinPage.page);

    // When it is looked up
    await joinPage.leavePostalCode();

    // Then a warning counts down, the button waits, and what was typed is kept
    await expect(joinPage.rateLimit).toHaveAttribute('role', 'alert');
    await expect(joinPage.rateLimit).toContainText('Too many tries from this device.');
    await expect(joinPage.rateLimitCountdown).toHaveText('0:42');
    await expect(joinPage.submit).toBeDisabled();
    await expect(joinPage.postalCode).toHaveValue('20121');
    await expect(joinPage.name).toHaveValue('Sofia Bianchi');

    // And as time passes the countdown follows, and at zero the button comes back
    await joinPage.page.clock.runFor(10_000);
    await expect(joinPage.rateLimitCountdown).toHaveText('0:32');
    // Announced once, not every second
    expect(
      (await announcements(joinPage.page)).filter((said) => said.politeness === 'assertive'),
    ).toEqual([
      {
        politeness: 'assertive',
        text: expect.stringMatching(
          /^Too many tries from this device\. You can try again in 0:42\b/,
        ),
      },
    ]);
    await joinPage.page.clock.runFor(32_000);
    await expect(joinPage.rateLimit).toHaveCount(0);
    await expect(joinPage.submit).toBeEnabled();
    await expect(joinPage.submit).toHaveText('Place my pin');
  });
});
