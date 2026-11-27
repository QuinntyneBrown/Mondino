// Acceptance Test
// Traces to: L2-032, L2-045, L2-004, L2-007, L2-035
// Description: A teammate who has moved looks a new postal code up with "Look up": it is found, previewed as new on the small globe with the bar for unsaved changes, and saved, moving the pin; or it cannot be found, checked or looked up yet, and the pin stays

import type { Request } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import { lookupAnswer } from '../fixtures/invites';
import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import {
  NORTHWIND_ME,
  NORTHWIND_ME_LOOKUPS,
  SOFIA_IN_TORONTO,
  SOFIA_PROFILE,
} from '../fixtures/profile';
import { mockText } from '../support/mocks';
import { rememberTeam } from '../support/membership';

test.describe('Profile & Settings: change your location', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ api, page }) => {
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    api.answer('GET', NORTHWIND_ME, SOFIA_PROFILE);
  });

  test('"Look up" finds Toronto, previewed as new on the small globe, and "Save changes" moves the pin there', async ({
    api,
    page,
    profilePage,
  }) => {
    // Given Sofia in Milan types Canada and M5V 2T6, and leaves the field
    const lookups: Request[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith(NORTHWIND_ME_LOOKUPS)) lookups.push(request);
    });
    const lookup = api.hold('POST', NORTHWIND_ME_LOOKUPS);
    await profilePage.open();
    await profilePage.move('Canada', 'M5V 2T6');

    // Then leaving the field looks nothing up
    await expect(profilePage.lookup).toBeEmpty();
    expect(lookups).toHaveLength(0);

    // When she uses "Look up", the screen says what it is finding, and where (profile/locating)
    await profilePage.lookUp.click();
    await expect(profilePage.lookup).toHaveText(mockText('pages/profile/locating.html', 'lookup')!);
    await expect(profilePage.lookUp).toBeDisabled();
    await expect(profilePage.lookUp).toHaveAttribute('aria-busy', 'true');
    await expect(profilePage.saveBar).toHaveCount(0);
    expect(lookups).toHaveLength(1);
    expect(lookups[0].postDataJSON()).toEqual({ countryCode: 'CA', postalCode: 'M5V 2T6' });
    expect(lookups[0].url()).not.toContain('M5V');

    // When Toronto is found, the screen names it and says the pin moves on saving (profile/location-found)
    lookup.release(lookupAnswer({ countryCode: 'CA', postalCode: 'M5V 2T6' }));
    await expect(profilePage.lookup).toHaveText(
      mockText('pages/profile/location-found.html', 'lookup')!,
    );
    await expect(profilePage.youLabel).toHaveText('New · Toronto');
    await expect(profilePage.stillGlobe).toHaveAttribute(
      'aria-label',
      'A small globe with your pin moved to Toronto, not saved yet',
    );
    await expect(profilePage.saveBar).toHaveText(/You have unsaved changes\s*Save changes/);

    // And nothing has moved yet: the card still names Milan
    await expect(profilePage.city).toHaveText('Milan, Italy');

    // When she uses "Save changes", the bar says it is saving until the save answers
    const saves: Request[] = [];
    const teamReads: Request[] = [];
    page.on('request', (request) => {
      const path = new URL(request.url()).pathname;
      if (path === NORTHWIND_ME && request.method() === 'PUT') saves.push(request);
      if (path === NORTHWIND_PINS) teamReads.push(request);
    });
    const save = api.hold('PUT', NORTHWIND_ME);
    await profilePage.saveChanges.click();
    await expect(profilePage.saveBar).toContainText('Saving…');
    await expect(profilePage.saveBarButton).toBeDisabled();
    expect(saves[0].postDataJSON()).toEqual({ countryCode: 'CA', postalCode: 'M5V 2T6' });
    expect(saves[0].url()).not.toContain('M5V');

    // When it is saved, her pin is at Toronto, with Toronto's local time and time zone, and the
    // team is read again so every screen shows it there
    save.release(SOFIA_IN_TORONTO);
    await expect(profilePage.city).toHaveText('Toronto, Canada');
    await expect(profilePage.time).toHaveText('10:05 am local · Eastern Time');
    await expect(profilePage.youLabel).toHaveCount(0);
    await expect(profilePage.saveBar).toHaveCount(0);
    await expect(profilePage.postalCode).toHaveValue('M5V 2T6');
    await expect.poll(() => teamReads.length).toBe(1);
  });

  test('a postal code that cannot be found, checked or looked up yet keeps the pin in Milan and offers no save', async ({
    api,
    profilePage,
  }) => {
    // Given Sofia types a postal code Canada does not have
    api.answer('POST', NORTHWIND_ME_LOOKUPS, (route) =>
      lookupAnswer(route.request().postDataJSON() as { countryCode: string; postalCode: string }),
    );
    await profilePage.open();
    await profilePage.move('Canada', 'M5V 2T');

    // When it is looked up, the screen says so as on Join, and the pin stays (profile/invalid)
    await profilePage.lookUp.click();
    await expect(profilePage.lookup).toHaveText(mockText('pages/profile/invalid.html', 'lookup')!);
    await expect(profilePage.lookup).toHaveRole('alert');
    await expect(profilePage.postalCode).toHaveAttribute('aria-invalid', 'true');
    await expect(profilePage.saveBar).toHaveCount(0);

    // When the source does not answer in time, it says so and offers "Try again" (profile/lookup-unavailable)
    await profilePage.postalCode.fill('M5V 2T6');
    await expect(profilePage.postalCode).not.toHaveAttribute('aria-invalid');
    let tries = 0;
    api.answer('POST', NORTHWIND_ME_LOOKUPS, () => {
      tries++;
      return {
        status: 503,
        headers: { 'content-type': 'application/problem+json' },
        json: { status: 503, code: 'postal_code_unavailable' },
      };
    });
    await profilePage.lookUp.click();
    await expect(profilePage.warning).toContainText(
      'We couldn’t check M5V 2T6 right now. Your postal code may be fine — nothing is wrong with what you typed. Your pin stays in Milan.',
    );
    await expect(profilePage.warning).toHaveRole('alert');
    await expect(profilePage.yourCity).toHaveCount(0);
    await expect(profilePage.saveBar).toHaveCount(0);
    await profilePage.tryLookupAgain.click();
    await expect.poll(() => tries).toBe(2);

    // When she has looked up too many times, she is asked to wait, and what she typed is kept (profile/rate-limited)
    api.answer('POST', NORTHWIND_ME_LOOKUPS, {
      status: 429,
      headers: { 'content-type': 'application/problem+json', 'retry-after': '42' },
      json: { status: 429, code: 'rate_limited' },
    });
    await profilePage.lookUp.click();
    await expect(profilePage.warning).toHaveText(
      'That was a lot of tries in a short time. Wait a moment, then try again. Your pin stays in Milan.',
    );
    await expect(profilePage.postalCode).toHaveValue('M5V 2T6');
    await expect(profilePage.country).toHaveValue('CA');
    await expect(profilePage.saveBar).toHaveCount(0);
    await expect(profilePage.city).toHaveText('Milan, Italy');
    await expect(profilePage.lookUp).toBeEnabled();
  });
});
