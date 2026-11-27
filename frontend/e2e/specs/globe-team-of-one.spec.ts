// Acceptance Test
// Traces to: L2-025, L2-054
// Description: A team of one reads "Just you, for now" and shows the invite link on a card in the panel's place; "Copy" puts it on the clipboard and says so for 4 seconds, a refused copy selects the link and says so until dismissed, and a second teammate takes the card away

import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import { NORTHWIND_PINS, northwindPinsOf } from '../fixtures/pins';
import { mockMarkup } from '../support/mocks';
import { rememberTeam } from '../support/membership';
import { pauseNow } from '../support/clock';

/** The text of the first element with `className` in a mock, its tags taken out. */
function mockText(path: string, className: string): string {
  const found = new RegExp(
    `class="${className}(?: [^"]*)?"[^>]*>([\\s\\S]*?)</(p|h1|h2|div)>`,
  ).exec(mockMarkup(path));
  if (!found) throw new Error(`No ${className} in ${path}`);
  return found[1]
    .replace(/<svg[\s\S]*?<\/svg>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function letTimePass(page: Page, ms: number): Promise<void> {
  await page.clock.runFor(ms);
}

test.describe('Globe: a team of one', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ api, page }) => {
    await rememberTeam(page);
    await page
      .context()
      .grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:4310' });
    api.answer('GET', NORTHWIND_PINS, northwindPinsOf('Sofia Bianchi'));
  });

  test('reads as pages/globe/empty does, with the invite link on a card and no panel', async ({
    globePage,
  }) => {
    await globePage.open();

    const mock = 'pages/globe/empty.html';
    await expect(globePage.title).toHaveText(
      /<h1 id="globe-title">([^<]*)</.exec(mockMarkup(mock))![1],
    );
    await expect(globePage.counts).toHaveText(mockText(mock, 'globe-screen__counts'));
    await expect(globePage.inviteCardTitle).toHaveText(mockText(mock, 'invite-card__title'));
    await expect(globePage.inviteCardText).toHaveText(mockText(mock, 'invite-card__text'));
    await expect(globePage.inviteCardLink).toHaveText('127.0.0.1:4310/join/northwind-7Kq2');
    await expect(globePage.copy).toBeVisible();
    await expect(globePage.pin('Sofia Bianchi (you)')).toBeVisible();
    await expect(globePage.stillGlobe).toHaveAccessibleName(
      'A still picture of the globe, with your pin.',
    );
    await expect(globePage.panel).toHaveCount(0);
  });

  test('“Copy” puts the link on the clipboard, and a toast says so for 4 seconds', async ({
    globePage,
    page,
  }) => {
    await globePage.open();
    await globePage.copy.click();

    // The toast reads as notifications/invite-link/success does, in the status region
    await expect(globePage.toast).toHaveText(
      mockText('notifications/invite-link/success.html', 'toast__body'),
    );
    await pauseNow(page);
    expect(await globePage.clipboardText()).toBe('http://127.0.0.1:4310/join/northwind-7Kq2');
    await expect(globePage.statusToast).toHaveCount(1);
    await letTimePass(page, 3_000);
    await expect(globePage.toast).toBeVisible();
    await letTimePass(page, 1_000);
    await expect(globePage.toast).toHaveCount(0);
  });

  test('a refused copy selects the link, and an alert says so until it is dismissed', async ({
    globePage,
    page,
  }) => {
    await globePage.refuseCopy();
    await globePage.open();
    await globePage.copy.click();

    // The toast reads as notifications/invite-link/danger does, in the alert region
    await expect(globePage.alertToast).toHaveText(
      mockText('notifications/invite-link/danger.html', 'toast__body'),
    );
    expect(await globePage.selectedText()).toBe('127.0.0.1:4310/join/northwind-7Kq2');
    await letTimePass(page, 10_000);
    await expect(globePage.toast).toBeVisible();

    await globePage.dismiss.click();
    await expect(globePage.toast).toHaveCount(0);
  });

  test('once a second teammate joins, the card is gone and the count reads 2 teammates', async ({
    api,
    globePage,
  }) => {
    await globePage.open();
    await expect(globePage.inviteCard).toBeVisible();

    // When Luca has joined and the Globe is opened again
    api.answer('GET', NORTHWIND_PINS, northwindPinsOf('Sofia Bianchi', 'Luca Ferri'));
    await globePage.page.reload();

    await expect(globePage.title).toHaveText('2 teammates');
    await expect(globePage.inviteCard).toHaveCount(0);
    await expect(globePage.workingRows).toHaveCount(2);
  });
});
