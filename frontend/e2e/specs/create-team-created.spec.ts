// Acceptance Test
// Traces to: L2-053, L2-007, L2-042, L2-044
// Description: Once the team is made, Create Team gives its invite link to copy and the way on to the globe, and keeps no postal code or email

import { NORTHWIND_PINS, northwindPins, northwindPinsOf } from '../fixtures/pins';
import { expect, test } from '../fixtures/test';
import { lookupAnswer } from '../fixtures/invites';
import { CREATE_LOOKUPS, NEW_INVITE_TOKEN, NORTHWIND_CREATED, TEAMS } from '../fixtures/teams';

test.describe('Create Team: the team is made', () => {
  test.beforeEach(({ api }) => {
    api.answer('POST', CREATE_LOOKUPS, (route) => lookupAnswer(route.request().postDataJSON()));
    api.answer('POST', TEAMS, NORTHWIND_CREATED);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
  });

  async function make(createTeamPage: import('../pages/create-team.page').CreateTeamPage) {
    await createTeamPage.open();
    await createTeamPage.fillNorthwind();
    await createTeamPage.leavePostalCode();
    await expect(createTeamPage.lookup).toHaveText(
      'Milan, Lombardy — pinned at city level. 13° and foggy right now.',
    );
    await createTeamPage.submit.click();
    await expect(createTeamPage.title).toHaveText('Now bring everyone in.');
  }

  test('it reads "Northwind is on the map", gives the invite link and the way on, and focus is on the title', async ({
    createTeamPage,
  }) => {
    await make(createTeamPage);

    await expect(createTeamPage.kicker).toHaveText('Northwind is on the map');
    await expect(createTeamPage.kicker).toHaveAttribute('role', 'status');
    await expect(createTeamPage.title).toBeFocused();
    await expect(createTeamPage.lead).toHaveText(
      'Send this link to your team. Each person places their own pin with a postal code.',
    );
    await expect(createTeamPage.inviteLink).toHaveValue(`127.0.0.1:4310/join/${NEW_INVITE_TOKEN}`);
    await expect(createTeamPage.inviteLink).toHaveAttribute('readonly', '');
    await expect(createTeamPage.copyLink).toHaveText('Copy link');
    await expect(createTeamPage.goToTheGlobe).toHaveAttribute('href', '/globe');
    await expect(createTeamPage.form).toHaveCount(0);
    await expect(createTeamPage.footer).toHaveText('Already have a team? Sign in');

    // And the new pin is on the globe, labelled and pulsing
    await expect(createTeamPage.youLabel).toHaveText('You · Milan');
    expect(await createTeamPage.pulse()).not.toBe('none');
  });

  test('the new pin does not pulse under reduced motion', async ({ createTeamPage }) => {
    await createTeamPage.page.emulateMedia({ reducedMotion: 'reduce' });
    await make(createTeamPage);

    await expect(createTeamPage.youPin).toBeVisible();
    expect(await createTeamPage.pulse()).toBe('none');
  });

  test('"Copy link" puts the invite link on the clipboard and reads "Copied"', async ({
    createTeamPage,
  }) => {
    await createTeamPage.page
      .context()
      .grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:4310' });
    await make(createTeamPage);

    await createTeamPage.copyLink.click();

    await expect(createTeamPage.copyLink).toHaveText('Copied');
    expect(await createTeamPage.clipboardText()).toBe(
      `http://127.0.0.1:4310/join/${NEW_INVITE_TOKEN}`,
    );
  });

  test('a copy the browser refuses selects the link and says how to copy it', async ({
    createTeamPage,
  }) => {
    await createTeamPage.refuseCopy();
    await make(createTeamPage);

    await createTeamPage.copyLink.click();

    await expect(createTeamPage.inviteLink).toBeFocused();
    expect(await createTeamPage.selectedText()).toBe(`127.0.0.1:4310/join/${NEW_INVITE_TOKEN}`);
    await expect(createTeamPage.toast).toHaveText(
      'Couldn’t copy the link. It’s selected — press Ctrl+C or ⌘C to copy it yourself.',
    );
    await expect(createTeamPage.toast).toHaveClass(/toast--danger/);
    await expect(createTeamPage.copyLink).toHaveText('Copy link');

    // And it stays until it is dismissed
    await createTeamPage.page.clock.runFor(10_000);
    await expect(createTeamPage.toast).toBeVisible();
    await createTeamPage.dismissToast.click();
    await expect(createTeamPage.toast).toHaveCount(0);
  });

  test('the team is remembered by its ids and name, and no postal code or email is kept', async ({
    createTeamPage,
  }) => {
    await make(createTeamPage);

    expect(await createTeamPage.membership()).toEqual({
      teamId: 'c8a2f0de-5b1e-4f7c-9a3d-2e6b8f1c4d07',
      teammateId: '5f3e9b2a-7c41-4d8e-b6a0-91d2c7e4f318',
      teamName: 'Northwind',
    });
    const kept = await createTeamPage.everythingKept();
    expect(kept).not.toContain('20121');
    expect(kept).not.toContain('sofia@');
    await expect(createTeamPage.page).toHaveURL('/new');
  });

  test('"Go to the globe" opens the Globe of a team of one', async ({
    api,
    createTeamPage,
    globePage,
  }) => {
    api.answer('GET', NORTHWIND_PINS, northwindPinsOf('Sofia Bianchi'));
    await make(createTeamPage);

    await createTeamPage.goToTheGlobe.click();

    await expect(globePage.page).toHaveURL('/globe');
    await expect(globePage.globe).toBeVisible();
    await expect(globePage.title).toHaveText('Just you, for now');
    await expect(globePage.inviteCard).toBeVisible();
  });
});
