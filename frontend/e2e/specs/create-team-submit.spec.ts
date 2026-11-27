// Acceptance Test
// Traces to: L2-053, L2-045
// Description: "Create team" waits while the team is made, a failure keeps what was typed and tries again with the same request, and too many teams ask to wait

import type { Request } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import { lookupAnswer } from '../fixtures/invites';
import { CREATE_LOOKUPS, NORTHWIND_CREATED, TEAMS } from '../fixtures/teams';

test.describe('Create Team: making the team', () => {
  test.beforeEach(async ({ api, createTeamPage }) => {
    api.answer('POST', CREATE_LOOKUPS, (route) => lookupAnswer(route.request().postDataJSON()));
    await createTeamPage.open();
    await createTeamPage.fillNorthwind();
    await createTeamPage.leavePostalCode();
    await expect(createTeamPage.lookup).toHaveText(
      'Milan, Lombardy — pinned at city level. 13° and foggy right now.',
    );
  });

  test('while the team is made the button reads "Creating your team…" and is disabled', async ({
    api,
    createTeamPage,
  }) => {
    const answer = api.hold('POST', TEAMS);

    await createTeamPage.submit.click();

    await expect(createTeamPage.submit).toHaveText('Creating your team…');
    await expect(createTeamPage.submit).toBeDisabled();
    await expect(createTeamPage.submit).toHaveAttribute('aria-busy', 'true');
    answer.release(NORTHWIND_CREATED);
    await expect(createTeamPage.title).toHaveText('Now bring everyone in.');
  });

  test('the request carries what was typed and one random request id, never in the address', async ({
    api,
    createTeamPage,
  }) => {
    const sent: Request[] = [];
    api.answer('POST', TEAMS, (route) => {
      sent.push(route.request());
      return NORTHWIND_CREATED;
    });

    await createTeamPage.submit.click();
    await expect(createTeamPage.title).toHaveText('Now bring everyone in.');

    expect(sent).toHaveLength(1);
    expect(new URL(sent[0].url()).search).toBe('');
    expect(sent[0].postDataJSON()).toEqual({
      teamName: 'Northwind',
      name: 'Sofia Bianchi',
      email: 'sofia@northwind.co',
      countryCode: 'IT',
      postalCode: '20121',
      cityId: null,
      createRequestId: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      ),
    });
  });

  test('a failure says so naming the team, keeps what was typed, and tries again with the same request', async ({
    api,
    createTeamPage,
  }) => {
    const sent: Request[] = [];
    api.answer('POST', TEAMS, (route) => {
      sent.push(route.request());
      return sent.length === 1
        ? {
            status: 500,
            headers: { 'content-type': 'application/problem+json' },
            json: { status: 500, code: 'unexpected' },
          }
        : NORTHWIND_CREATED;
    });

    await createTeamPage.submit.click();

    await expect(createTeamPage.failed).toHaveText(
      'We couldn’t create Northwind. Nothing was saved — try again.',
    );
    await expect(createTeamPage.failed).toHaveAttribute('role', 'alert');
    await expect(createTeamPage.submit).toHaveText('Try again');
    await expect(createTeamPage.teamName).toHaveValue('Northwind');
    await expect(createTeamPage.name).toHaveValue('Sofia Bianchi');
    await expect(createTeamPage.email).toHaveValue('sofia@northwind.co');
    await expect(createTeamPage.country).toHaveValue('IT');
    await expect(createTeamPage.postalCode).toHaveValue('20121');

    await createTeamPage.submit.click();
    await expect(createTeamPage.title).toHaveText('Now bring everyone in.');
    expect(sent).toHaveLength(2);
    expect(sent[1].postDataJSON()).toEqual(sent[0].postDataJSON());
  });

  test('a team named as markup is named as text in the failure', async ({
    api,
    createTeamPage,
  }) => {
    api.answer('POST', TEAMS, { unanswered: true });
    await createTeamPage.teamName.fill('<b>North</b>');

    await createTeamPage.submit.click();

    await expect(createTeamPage.failed).toContainText('We couldn’t create <b>North</b>.');
  });

  test('a double-click sends one request', async ({ api, createTeamPage }) => {
    const answer = api.hold('POST', TEAMS);
    let sent = 0;
    createTeamPage.page.on('request', (request) => {
      if (new URL(request.url()).pathname === TEAMS) sent++;
    });

    await createTeamPage.submit.dblclick();
    await expect(createTeamPage.submit).toHaveText('Creating your team…');
    answer.release(NORTHWIND_CREATED);
    await expect(createTeamPage.title).toHaveText('Now bring everyone in.');

    expect(sent).toBe(1);
  });

  test('too many teams ask to wait with what was typed kept', async ({ api, createTeamPage }) => {
    api.answer('POST', TEAMS, {
      status: 429,
      headers: { 'content-type': 'application/problem+json', 'retry-after': '582' },
      json: { status: 429, code: 'rate_limited' },
    });

    await createTeamPage.submit.click();

    await expect(createTeamPage.rateLimit).toContainText('Too many tries from this device.');
    await expect(createTeamPage.rateLimitCountdown).toHaveText('9:42');
    await expect(createTeamPage.submit).toHaveText('Create team');
    await expect(createTeamPage.submit).toBeDisabled();
    await expect(createTeamPage.teamName).toHaveValue('Northwind');
    await expect(createTeamPage.email).toHaveValue('sofia@northwind.co');
  });

  test('"Create team" pressed while the postal code is looked up waits for it, then makes the team', async ({
    api,
    createTeamPage,
  }) => {
    // Given the postal code changed and its lookup is held
    api.answer('POST', TEAMS, NORTHWIND_CREATED);
    const lookup = api.hold('POST', CREATE_LOOKUPS);
    await createTeamPage.postalCode.fill('20121 ');

    // When "Create team" is pressed straight from the postal code field
    await createTeamPage.submit.click();
    lookup.release(lookupAnswer({ countryCode: 'IT', postalCode: '20121' }));

    // Then the lookup answers and the team is made, with no second press

    await expect(createTeamPage.title).toHaveText('Now bring everyone in.');
  });
});
