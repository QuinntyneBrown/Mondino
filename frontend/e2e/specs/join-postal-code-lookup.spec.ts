// Acceptance Test
// Traces to: L2-003, L2-006, L2-007
// Description: Leaving the postal code field looks it up; the city found is named and the new pin is placed there

import type { Request } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import {
  lookupAnswer,
  NORTHWIND_INVITE,
  NORTHWIND_LOOKUPS,
  northwindInvite,
} from '../fixtures/invites';

test.describe('Join: look up the postal code', () => {
  const lookups: Request[] = [];

  test.beforeEach(async ({ api, joinPage }) => {
    lookups.length = 0;
    api.answer('GET', NORTHWIND_INVITE, northwindInvite());
    api.answer('POST', NORTHWIND_LOOKUPS, (route) => {
      lookups.push(route.request());
      return lookupAnswer(route.request().postDataJSON());
    });
    await joinPage.open('northwind-7Kq2');
    await expect(joinPage.title).toHaveText('Put yourself on the map.');
  });

  test('while 20121 is looked up the screen says so and the button waits', async ({
    api,
    joinPage,
  }) => {
    // Given Italy and the postal code 20121, with the lookup's answer held
    const answer = api.hold('POST', NORTHWIND_LOOKUPS);
    await joinPage.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });

    // When the postal code field is left
    await joinPage.leavePostalCode();

    // Then the screen says "Finding 20121…" and the button reads "Placing your pin…", disabled
    await expect(joinPage.lookup).toHaveText('Finding 20121…');
    await expect(joinPage.submit).toHaveText('Placing your pin…');
    await expect(joinPage.submit).toBeDisabled();
    await expect(joinPage.submit).toHaveAttribute('aria-busy', 'true');

    // And when the lookup answers, the button is back
    answer.release(lookupAnswer({ countryCode: 'IT', postalCode: '20121' }));
    await expect(joinPage.submit).toHaveText('Join Northwind');
    await expect(joinPage.submit).toBeEnabled();
  });

  test('the city found is named, its new pin is placed and the button reads "Join Northwind"', async ({
    joinPage,
  }) => {
    // Given Italy and 20121
    await joinPage.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });

    // When the lookup finds Milan
    await joinPage.leavePostalCode();

    // Then the screen names the city and region and that the pin is at city level
    await expect(joinPage.lookup).toHaveText('Milan, Lombardy — pinned at city level.');
    await expect(joinPage.lookup).toHaveClass(/lookup--found/);

    // And a new pin labelled "You · Milan" is on the globe, marked as new, beside the team's 12
    await expect(joinPage.youLabel).toHaveText('You · Milan');
    await expect(joinPage.youPin).toHaveClass(/pin-dot--new/);
    await expect(joinPage.globe).toHaveAccessibleName(
      'The globe, with your new pin in Milan and 12 teammates’ pins',
    );
    await expect(joinPage.submit).toHaveText('Join Northwind');
  });

  test('the postal code travels in the body and is kept nowhere in the browser', async ({
    joinPage,
  }) => {
    await joinPage.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });
    await joinPage.leavePostalCode();
    await expect(joinPage.youLabel).toHaveText('You · Milan');

    // The one lookup carried the country and postal code in its body, not in its address
    expect(lookups).toHaveLength(1);
    expect(lookups[0].method()).toBe('POST');
    expect(lookups[0].postDataJSON()).toEqual({ countryCode: 'IT', postalCode: '20121' });
    expect(lookups[0].url()).not.toContain('20121');

    // And nothing the browser keeps holds it
    expect(await joinPage.everythingKept()).not.toContain('20121');
  });

  test('changing the postal code or the country removes the city and the new pin', async ({
    joinPage,
  }) => {
    // Given a found postal code
    await joinPage.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });
    await joinPage.leavePostalCode();
    await expect(joinPage.youLabel).toHaveText('You · Milan');

    // When the postal code changes, the city and the pin go, and the button reads "Place my pin"
    await joinPage.postalCode.fill('2012');
    await expect(joinPage.youPin).toHaveCount(0);
    await expect(joinPage.lookup).toHaveText(
      'Only your city is shown. Your postal code stays private.',
    );
    await expect(joinPage.submit).toHaveText('Place my pin');

    // And when it is found again and the country changes, they go again
    await joinPage.postalCode.fill('20121');
    await joinPage.leavePostalCode();
    await expect(joinPage.youLabel).toHaveText('You · Milan');
    await joinPage.country.selectOption({ label: 'Canada' });
    await expect(joinPage.youPin).toHaveCount(0);
    await expect(joinPage.submit).toHaveText('Place my pin');
  });

  for (const [typed, city] of [
    ['L5B 3C1', 'Mississauga'],
    ['l5b3c1', 'Mississauga'],
    ['M5V 2T6', 'Toronto'],
  ]) {
    test(`"${typed}" in Canada finds ${city}`, async ({ joinPage }) => {
      await joinPage.fill({ name: 'Sofia Bianchi', country: 'Canada', postalCode: typed });
      await joinPage.leavePostalCode();

      await expect(joinPage.lookup).toHaveText(`${city}, Ontario — pinned at city level.`);
      await expect(joinPage.youLabel).toHaveText(`You · ${city}`);
    });
  }

  test('submitting before the postal code is looked up looks it up', async ({ joinPage }) => {
    await joinPage.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });

    await joinPage.postalCode.press('Enter');

    await expect(joinPage.youLabel).toHaveText('You · Milan');
    expect(lookups).toHaveLength(1);
  });

  test('leaving an empty postal code looks nothing up', async ({ joinPage }) => {
    await joinPage.name.fill('Sofia Bianchi');
    await joinPage.postalCode.focus();
    await joinPage.leavePostalCode();

    await expect(joinPage.submit).toHaveText('Place my pin');
    expect(lookups).toHaveLength(0);
  });
});
