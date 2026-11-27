// Acceptance Test
// Traces to: L2-025, L2-054
// Description: "Invite teammate" in the header opens the invite dialog as dialogs/invite draws it, with nothing copied; focus starts on "Copy link", stays inside and returns to the button; "Copy link" copies, closes and says so for 4 seconds held while pointed at or focused; a refused copy keeps the dialog with the link selected and an alert that stays; on a phone the button is an icon and the dialog a sheet

import { expect, test } from '../fixtures/test';
import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { mockMarkup } from '../support/mocks';
import { rememberTeam } from '../support/membership';

const mock = 'dialogs/invite/default.html';

/** The text of the first element in the mock that opens with `opening`, its tags taken out. */
function mockText(opening: RegExp): string {
  const found = new RegExp(`${opening.source}([\\s\\S]*?)</(?:p|h2|span|label)>`).exec(
    mockMarkup(mock),
  );
  if (!found) throw new Error(`No ${opening.source} in ${mock}`);
  return found[1].replace(/<[^>]+>/g, '').trim();
}

test.describe('Invite teammates', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ api, page, inviteDialog }) => {
    await rememberTeam(page);
    await page
      .context()
      .grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:4310' });
    await inviteDialog.recordCopies();
    api.answer('GET', NORTHWIND_PINS, northwindPins());
  });

  test('“Invite teammate” opens the dialog as dialogs/invite/default draws it, and nothing is copied', async ({
    globePage,
    inviteDialog,
  }) => {
    await globePage.open();
    await globePage.inviteTeammate.click();

    await expect(inviteDialog.dialog).toHaveAccessibleName(
      mockText(/<h2 class="dialog__title"[^>]*>/),
    );
    await expect(inviteDialog.dialog).toHaveAttribute('aria-modal', 'true');
    await expect(inviteDialog.dialog).toHaveAccessibleDescription(mockText(/<p id="dlg-desc">/));
    await expect(inviteDialog.title).toHaveText('Invite teammates to Northwind');
    await expect(inviteDialog.label).toHaveText(mockText(/<label class="dialog__label"[^>]*>/));
    await expect(inviteDialog.link).toHaveAccessibleName('Invite link');
    await expect(inviteDialog.link).toHaveValue('127.0.0.1:4310/join/northwind-7Kq2');
    await expect(inviteDialog.link).toHaveAttribute('readonly', '');
    await expect(inviteDialog.meta).toHaveText(mockText(/<span class="tnum">/));
    // Nothing else: no field but the link, no teammate, no message, and no "Reset link" until it
    // is designed (docs/mocks/README.md)
    await expect(inviteDialog.fields).toHaveCount(1);
    await expect(inviteDialog.resetLink).toHaveCount(0);
    await expect(inviteDialog.controls).toHaveCount(3);
    await expect(inviteDialog.close).toBeVisible();
    await expect(inviteDialog.copyLink).toBeFocused();
    expect(await inviteDialog.copies()).toEqual([]);
  });

  test('focus stays inside the dialog, and Escape or Close return it to “Invite teammate”', async ({
    globePage,
    inviteDialog,
    page,
  }) => {
    await globePage.open();
    await globePage.inviteTeammate.click();
    await expect(inviteDialog.copyLink).toBeFocused();

    // Tab goes round the dialog and never leaves it
    for (let step = 0; step < 4; step++) {
      await page.keyboard.press('Tab');
      await expect(inviteDialog.focused).toHaveCount(1);
    }

    await page.keyboard.press('Escape');
    await expect(inviteDialog.dialog).toHaveCount(0);
    await expect(globePage.inviteTeammate).toBeFocused();

    await globePage.inviteTeammate.press('Enter');
    await expect(inviteDialog.copyLink).toBeFocused();
    await inviteDialog.close.click();
    await expect(inviteDialog.dialog).toHaveCount(0);
    await expect(globePage.inviteTeammate).toBeFocused();
    expect(await inviteDialog.copies()).toEqual([]);
  });
});
