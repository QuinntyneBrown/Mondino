// Acceptance Test
// Traces to: L2-025, L2-054, L2-040, L2-041
// Description: "Invite teammate" in the header opens the invite dialog as dialogs/invite draws it, with nothing copied; focus starts on "Copy link", stays inside and returns to the button; "Copy link" copies, closes and says so for 4 seconds held while pointed at or focused; a refused copy keeps the dialog with the link selected and an alert that stays; on a phone the button is an icon and the dialog a sheet

import { expect, test } from '../fixtures/test';
import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { mockMarkup } from '../support/mocks';
import { rememberTeam } from '../support/membership';
import { pauseNow } from '../support/clock';
import {
  announcements,
  listenForAnnouncements,
  lowContrastInBothThemes,
} from '../support/accessibility';

const mock = 'dialogs/invite/default.html';
const link = 'http://127.0.0.1:4310/join/northwind-7Kq2';

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

  test('“Copy link” copies the link, closes the dialog, and a toast says so for 4 seconds, held while pointed at or focused', async ({
    globePage,
    inviteDialog,
    page,
  }) => {
    await globePage.open();
    await globePage.inviteTeammate.click();
    await listenForAnnouncements(page);
    await inviteDialog.copyLink.click();

    await expect(inviteDialog.dialog).toHaveCount(0);
    await expect(globePage.inviteTeammate).toBeFocused();
    await expect(globePage.statusToast).toHaveText(
      'Invite link copied. Paste it wherever your team talks.',
    );
    await pauseNow(page);
    expect(await inviteDialog.copies()).toEqual([link]);
    expect(await globePage.clipboardText()).toBe(link);

    // Pointed at, its time stands still; let go, the rest of the 4 seconds runs
    await page.clock.runFor(1_000);
    await globePage.toast.hover();
    await page.clock.runFor(10_000);
    await expect(globePage.toast).toBeVisible();
    await page.mouse.move(0, 0);
    await page.clock.runFor(2_900);
    await expect(globePage.toast).toBeVisible();
    // Its words meet AA in light and in dark
    expect(await lowContrastInBothThemes(page)).toEqual([]);
    // Said once, politely, however long it stays
    expect(await announcements(page)).toEqual([
      {
        politeness: 'polite',
        text: expect.stringMatching(/^Invite link copied\. Paste it wherever your team talks\./),
      },
    ]);

    // Focused, too
    await globePage.dismiss.focus();
    await page.clock.runFor(10_000);
    await expect(globePage.toast).toBeVisible();
    await globePage.inviteTeammate.focus();
    await page.clock.runFor(100);
    await expect(globePage.toast).toHaveCount(0);
  });

  test('a refused copy keeps the dialog with the link selected and focused, and an alert that stays', async ({
    globePage,
    inviteDialog,
    page,
  }) => {
    await globePage.refuseCopy();
    await globePage.open();
    await globePage.inviteTeammate.click();
    await listenForAnnouncements(page);
    await inviteDialog.copyLink.click();

    await expect(globePage.alertToast).toHaveText(
      'Couldn’t copy the link. It’s selected — press Ctrl+C or ⌘C to copy it yourself.',
    );
    await expect(inviteDialog.dialog).toBeVisible();
    await expect(inviteDialog.link).toBeFocused();
    expect(await inviteDialog.selectedText()).toBe('127.0.0.1:4310/join/northwind-7Kq2');
    // The alert is above the dialog and its scrim, and assistive technology is told of it
    await expect(globePage.alert).toHaveText(/Couldn’t copy the link\./);
    await page.clock.runFor(10_000);
    await expect(globePage.alertToast).toBeVisible();
    // Its words meet AA in light and in dark
    expect(await lowContrastInBothThemes(page)).toEqual([]);
    // Said once, as an alert
    expect(await announcements(page)).toEqual([
      { politeness: 'assertive', text: expect.stringMatching(/^Couldn’t copy the link\./) },
    ]);
    await globePage.dismiss.click();
    await expect(globePage.toast).toHaveCount(0);
    await expect(inviteDialog.dialog).toBeVisible();
  });

  test('on a phone “Invite teammate” is an icon alone, and the dialog is a sheet from the bottom under 576 px', async ({
    globePage,
    inviteDialog,
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 740 });
    await globePage.open();

    await expect(globePage.inviteTeammate).toHaveAccessibleName('Invite teammate');
    await expect(globePage.inviteTeammateLabel).toBeHidden();
    const target = await globePage.inviteTeammateTarget();
    expect(target.width).toBeGreaterThanOrEqual(44);
    expect(target.height).toBeGreaterThanOrEqual(44);

    await globePage.inviteTeammate.click();
    const sheet = await inviteDialog.panelBox();
    expect(sheet.x).toBe(0);
    expect(sheet.width).toBe(375);
    expect(Math.round(sheet.y + sheet.height)).toBe(740);

    // From 576 px it is a dialog in the middle
    await page.setViewportSize({ width: 576, height: 740 });
    const centred = await inviteDialog.panelBox();
    expect(Math.round(centred.x * 2 + centred.width)).toBe(576);
    expect(Math.round(centred.y * 2 + centred.height)).toBe(740);
    await expect(globePage.inviteTeammateLabel).toBeHidden();
  });
});
