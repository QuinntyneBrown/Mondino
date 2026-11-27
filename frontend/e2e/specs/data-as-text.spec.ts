// Acceptance Test
// Traces to: L2-044, L2-054, L2-036
// Description: What a person types is shown as its literal characters wherever it appears, and the backend's own text is never shown

import { NORTHWIND_PINS, northwindPinsOf } from '../fixtures/pins';
import { expect, test } from '../fixtures/test';
import {
  lookupAnswer,
  NORTHWIND_CITY_SEARCHES,
  NORTHWIND_INVITE,
  NORTHWIND_JOINS,
  NORTHWIND_LOOKUPS,
  northwindInvite,
  SOFIA_JOINED,
} from '../fixtures/invites';
import { NORTHWIND_ME, sofiaProfile } from '../fixtures/profile';
import { rememberTeam } from '../support/membership';

const markup = '<img src=x onerror=alert(1)>';

test.describe('What a person types is data', () => {
  test.beforeEach(({ page, problems }) => {
    // A script that ran would open a dialog
    page.on('dialog', (dialog) => {
      problems.push(`A dialog opened: ${dialog.message()}`);
      void dialog.dismiss();
    });
  });

  test('a team and a teammate named as markup are shown as those characters, from Join to the Globe', async ({
    api,
    joinPage,
    globePage,
    inviteDialog,
  }) => {
    // Given a team named as markup
    api.answer('GET', NORTHWIND_INVITE, northwindInvite({ teamName: markup }));
    api.answer('POST', NORTHWIND_LOOKUPS, (route) => lookupAnswer(route.request().postDataJSON()));
    api.answer('POST', NORTHWIND_JOINS, SOFIA_JOINED);
    const pins = northwindPinsOf('Sofia Bianchi', 'Lena Fischer');
    (pins.json as { pins: { name: string }[] }).pins[1].name = markup;
    (pins.json as { teamName: string }).teamName = markup;
    api.answer('GET', NORTHWIND_PINS, pins);

    // When its invite link is opened, the team's name is its literal characters
    await joinPage.open('northwind-7Kq2');
    await expect(joinPage.team).toContainText(`Joining ${markup} · 12 already here`);

    // And when someone named as markup places their pin, the button names the team as text
    await joinPage.fill({ name: markup, country: 'Italy', postalCode: '20121' });
    await joinPage.leavePostalCode();
    await expect(joinPage.submit).toHaveText(`Join ${markup}`);
    await expect(joinPage.images).toHaveCount(0);

    // And when they join, their pin's label and the toast show both names as text
    await joinPage.submit.click();
    await expect(globePage.youLabel).toHaveText(`${markup} (you) · Milan`);
    await expect(globePage.toast).toHaveText(
      `You’re on the map. ${markup} can now see your pin in Milan.`,
    );
    await expect(globePage.images).toHaveCount(0);
    // And the invite dialog names the team as text
    await globePage.inviteTeammate.click();
    await expect(inviteDialog.title).toHaveText(`Invite teammates to ${markup}`);
    await expect(inviteDialog.dialog).toHaveAccessibleName(`Invite teammates to ${markup}`);
    await expect(globePage.images).toHaveCount(0);
  });

  test('a team named as markup is shown as those characters in the leave dialog and on Left Team', async ({
    api,
    leaveDialog,
    leftTeamPage,
    page,
    profilePage,
  }) => {
    // Given Sofia on a team named as markup
    await rememberTeam(page);
    const pins = northwindPinsOf('Sofia Bianchi', 'Lena Fischer');
    (pins.json as { teamName: string }).teamName = markup;
    api.answer('GET', NORTHWIND_PINS, pins);
    const profile = sofiaProfile();
    (profile.json as { teamName: string }).teamName = markup;
    api.answer('GET', NORTHWIND_ME, profile);
    api.refuse('DELETE', NORTHWIND_ME, 503, 'unexpected');

    // When she asks to leave, and the first try fails, the dialog names the team as text
    await profilePage.open();
    await expect(profilePage.leave).toHaveText(`Leave ${markup}`);
    await profilePage.leave.click();
    await expect(leaveDialog.dialog).toHaveAccessibleName(`Leave ${markup}?`);
    await leaveDialog.confirm.click();
    await expect(leaveDialog.alert).toHaveText(
      `We couldn’t take your pin off. You’re still on ${markup} — try again.`,
    );
    await expect(leaveDialog.images).toHaveCount(0);

    // And once she has left, Left Team names it as text
    api.answer('DELETE', NORTHWIND_ME, { status: 204 });
    await leaveDialog.confirm.click();
    await expect(leftTeamPage.title).toHaveText(`You’ve left ${markup}`);
    await expect(leftTeamPage.text).toContainText(`off ${markup}’s globe`);
    await expect(leaveDialog.images).toHaveCount(0);
  });

  test('a refusal is shown in the screen’s own words, never the backend’s text', async ({
    api,
    joinPage,
  }) => {
    // Given a join refused with ProblemDetails whose text carries markup and a stack trace
    api.answer('GET', NORTHWIND_INVITE, northwindInvite());
    api.answer('POST', NORTHWIND_LOOKUPS, (route) => lookupAnswer(route.request().postDataJSON()));
    api.answer('POST', NORTHWIND_JOINS, {
      status: 500,
      headers: { 'content-type': 'application/problem+json' },
      json: {
        status: 500,
        code: 'unexpected',
        title: markup,
        detail: 'System.InvalidOperationException: boom at Mondino.Application.Joining.Handle()',
      },
    });
    await joinPage.open('northwind-7Kq2');
    await joinPage.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });
    await joinPage.leavePostalCode();

    // When the join is refused
    await joinPage.submit.click();

    // Then the screen says it in its own words, and nothing of the backend's text is shown
    await expect(joinPage.joinFailed).toHaveText(
      'We couldn’t add you to Northwind. Your details are still here — try joining again.',
    );
    await expect(joinPage.everything).not.toContainText('InvalidOperationException');
    await expect(joinPage.everything).not.toContainText(markup);
    await expect(joinPage.images).toHaveCount(0);
  });

  test('what is typed in "Your city" is held to 60 characters, sent as data and shown as text', async ({
    api,
    joinPage,
  }) => {
    // Given the lookup is down, so Join offers "Your city"
    api.answer('GET', NORTHWIND_INVITE, northwindInvite());
    api.refuse('POST', NORTHWIND_LOOKUPS, 503, 'postal_code_unavailable');
    const searched: unknown[] = [];
    api.answer('POST', NORTHWIND_CITY_SEARCHES, (route) => {
      searched.push(route.request().postDataJSON());
      return { json: [] };
    });
    await joinPage.open('northwind-7Kq2');
    await joinPage.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });
    await joinPage.leavePostalCode();

    // When markup longer than 60 characters is typed in it
    const typed = `${markup}${'x'.repeat(60)}`;
    await joinPage.city.pressSequentially(typed);

    // Then the field keeps 60 characters, shown as they were typed
    await expect(joinPage.city).toHaveAttribute('maxlength', '60');
    await expect(joinPage.city).toHaveValue(typed.slice(0, 60));
    await expect(joinPage.images).toHaveCount(0);

    // And it is sent in a request body, never in the address, as at most 60 characters
    await expect.poll(() => searched.length).toBeGreaterThan(0);
    for (const body of searched) {
      expect((body as { text: string }).text.length).toBeLessThanOrEqual(60);
    }
    expect(joinPage.page.url()).not.toContain('img');
  });
});
