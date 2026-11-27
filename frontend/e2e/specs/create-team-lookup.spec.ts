// Acceptance Test
// Traces to: L2-053, L2-003, L2-004, L2-006, L2-045
// Description: Create Team looks its postal code up as Join does, with Join's messages, and places the new pin at the city

import { expect, test } from '../fixtures/test';
import { CITIES, lookupAnswer } from '../fixtures/invites';
import { CREATE_CITY_SEARCHES, CREATE_LOOKUPS } from '../fixtures/teams';

test.describe('Create Team: the postal code lookup', () => {
  test.beforeEach(async ({ createTeamPage }) => {
    await createTeamPage.open();
    await expect(createTeamPage.title).toHaveText('Start a team.');
  });

  test('leaving the postal code says "Finding 20121…", then names the city and places the pin', async ({
    api,
    createTeamPage,
  }) => {
    // Given the lookup's answer is held
    const answer = api.hold('POST', CREATE_LOOKUPS);
    await createTeamPage.fill({ country: 'Italy', postalCode: '20121' });

    // When the postal code field is left
    await createTeamPage.leavePostalCode();

    // Then the screen says it is finding it, and the button waits
    await expect(createTeamPage.lookup).toHaveText('Finding 20121…');
    await expect(createTeamPage.submit).toHaveText('Create team');
    await expect(createTeamPage.submit).toBeDisabled();
    await expect(createTeamPage.submit).toHaveAttribute('aria-busy', 'true');

    // When it answers Milan
    answer.release(lookupAnswer({ countryCode: 'IT', postalCode: '20121' }));

    // Then the city is named, pinned at city level, and the new pin is on the globe
    await expect(createTeamPage.lookup).toHaveText(
      'Milan, Lombardy — pinned at city level. 13° and foggy right now.',
    );
    await expect(createTeamPage.youLabel).toHaveText('You · Milan');
    await expect(createTeamPage.youPin).toHaveClass(/pin-dot--new/);
    await expect(createTeamPage.globe).toHaveAccessibleName(
      'The globe, with your new pin in Milan',
    );
    await expect(createTeamPage.submit).toHaveText('Create team');
    await expect(createTeamPage.submit).toBeEnabled();

    // And changing the postal code takes the pin away again
    await createTeamPage.postalCode.fill('20122');
    await expect(createTeamPage.allPins).toHaveCount(0);
    await expect(createTeamPage.lookup).toHaveText(
      'Only your city is shown. Your postal code stays private.',
    );
  });

  test('a postal code that cannot be found says so with its country’s form, and nothing is placed', async ({
    api,
    createTeamPage,
  }) => {
    api.answer('POST', CREATE_LOOKUPS, (route) => lookupAnswer(route.request().postDataJSON()));
    await createTeamPage.fill({ country: 'Italy', postalCode: '2012' });

    await createTeamPage.leavePostalCode();

    await expect(createTeamPage.lookup).toHaveText(
      'We couldn’t find “2012” in Italy. Italian postal codes have five digits, like 20121.',
    );
    await expect(createTeamPage.lookup).toHaveAttribute('role', 'alert');
    await expect(createTeamPage.postalCode).toHaveAttribute('aria-invalid', 'true');
    await expect(createTeamPage.allPins).toHaveCount(0);

    // And the alert goes as soon as the postal code is edited
    await createTeamPage.postalCode.fill('20121');
    await expect(createTeamPage.lookup).toHaveText(
      'Only your city is shown. Your postal code stays private.',
    );
  });

  test('while the lookup is down, "Your city" takes the postal code’s place', async ({
    api,
    createTeamPage,
  }) => {
    api.refuse('POST', CREATE_LOOKUPS, 503, 'postal_code_unavailable');
    api.answer('POST', CREATE_CITY_SEARCHES, {
      json: [{ cityId: '3173435', city: CITIES.Milan }],
    });
    await createTeamPage.fill({ country: 'Italy', postalCode: '20121' });

    await createTeamPage.leavePostalCode();

    await expect(createTeamPage.postalCode).toBeDisabled();
    await expect(createTeamPage.postalCode).toHaveValue('20121');
    await expect(createTeamPage.cityHelp).toHaveText(
      'Postal code lookup is down right now, so pick your city instead. Your pin goes to its centre.',
    );
    await createTeamPage.city.fill('Mil');
    await createTeamPage.page.clock.runFor(300);
    await createTeamPage.cityOptions.first().click();
    await expect(createTeamPage.city).toHaveValue('Milan');
    await expect(createTeamPage.submit).toHaveText('Create team');
  });

  test('too many lookups ask to wait, keep what was typed, and the button comes back at zero', async ({
    api,
    createTeamPage,
  }) => {
    api.answer('POST', CREATE_LOOKUPS, {
      status: 429,
      headers: { 'content-type': 'application/problem+json', 'retry-after': '582' },
      json: { status: 429, code: 'rate_limited' },
    });
    await createTeamPage.fill({ country: 'Italy', postalCode: '20121' });

    await createTeamPage.leavePostalCode();

    await expect(createTeamPage.rateLimit).toHaveAttribute('role', 'alert');
    await expect(createTeamPage.rateLimit).toContainText('Too many tries from this device.');
    await expect(createTeamPage.rateLimitCountdown).toHaveText('9:42');
    await expect(createTeamPage.submit).toBeDisabled();
    await expect(createTeamPage.postalCode).toHaveValue('20121');

    await createTeamPage.page.clock.runFor(582_000);
    await expect(createTeamPage.rateLimit).toHaveCount(0);
    await expect(createTeamPage.submit).toBeEnabled();
  });
});
