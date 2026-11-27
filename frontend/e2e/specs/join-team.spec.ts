// Acceptance Test
// Traces to: L2-005, L2-007
// Description: "Join Northwind" adds the teammate while the form waits locked, remembers the team and opens the Globe

import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import type { Request } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import {
  lookupAnswer,
  NORTHWIND_INVITE,
  NORTHWIND_JOINS,
  NORTHWIND_LOOKUPS,
  northwindInvite,
  SOFIA_JOINED,
} from '../fixtures/invites';

test.describe('Join: join the team', () => {
  const joins: Request[] = [];

  test.beforeEach(async ({ api, joinPage }) => {
    joins.length = 0;
    api.answer('GET', NORTHWIND_INVITE, northwindInvite());
    api.answer('POST', NORTHWIND_LOOKUPS, (route) => lookupAnswer(route.request().postDataJSON()));
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await joinPage.open('northwind-7Kq2');
    await joinPage.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });
    await joinPage.leavePostalCode();
    await expect(joinPage.submit).toHaveText('Join Northwind');
  });

  test('while the join is answered the button reads "Joining Northwind…" and nothing can be changed', async ({
    api,
    joinPage,
  }) => {
    // Given the join request's answer is held
    const answer = api.hold('POST', NORTHWIND_JOINS);

    // When "Join Northwind" is chosen
    await joinPage.submit.click();

    // Then the button is busy and disabled, and the name, country and postal code are locked
    await expect(joinPage.submit).toHaveText('Joining Northwind…');
    await expect(joinPage.submit).toBeDisabled();
    await expect(joinPage.submit).toHaveAttribute('aria-busy', 'true');
    await expect(joinPage.name).toHaveAttribute('readonly', '');
    await expect(joinPage.postalCode).toHaveAttribute('readonly', '');
    await expect(joinPage.country).toBeDisabled();
    await expect(joinPage.name).toHaveValue('Sofia Bianchi');
    await expect(joinPage.postalCode).toHaveValue('20121');

    answer.release(SOFIA_JOINED);
    await expect(joinPage.page).toHaveURL('/globe');
  });

  test('a join that succeeds remembers the team, keeps no postal code and opens the Globe', async ({
    api,
    joinPage,
  }) => {
    // Given the backend adds Sofia to Northwind
    api.answer('POST', NORTHWIND_JOINS, (route) => {
      joins.push(route.request());
      return SOFIA_JOINED;
    });

    // When "Join Northwind" is chosen
    await joinPage.submit.click();

    // Then the Globe opens
    await expect(joinPage.page).toHaveURL('/globe');

    // And the join carried her name, country and postal code, and one random join request id
    expect(joins).toHaveLength(1);
    const body = joins[0].postDataJSON() as Record<string, unknown>;
    expect(body).toEqual({
      name: 'Sofia Bianchi',
      countryCode: 'IT',
      postalCode: '20121',
      cityId: null,
      joinRequestId: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      ),
    });

    // And the browser remembers the team by its ids and name, and keeps no postal code
    expect(await joinPage.membership()).toEqual({
      teamId: 'c8a2f0de-5b1e-4f7c-9a3d-2e6b8f1c4d07',
      teammateId: '5f3e9b2a-7c41-4d8e-b6a0-91d2c7e4f318',
      teamName: 'Northwind',
    });
    expect(await joinPage.everythingKept()).not.toContain('20121');
  });

  test('a double-click sends one join', async ({ api, joinPage }) => {
    const answer = api.hold('POST', NORTHWIND_JOINS);
    let sent = 0;
    joinPage.page.on('request', (request) => {
      if (new URL(request.url()).pathname === NORTHWIND_JOINS) sent++;
    });

    await joinPage.submit.dblclick();
    await expect(joinPage.submit).toHaveText('Joining Northwind…');
    answer.release(SOFIA_JOINED);
    await expect(joinPage.page).toHaveURL('/globe');

    expect(sent).toBe(1);
  });
});
