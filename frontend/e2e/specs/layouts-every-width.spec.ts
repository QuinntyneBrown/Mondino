// Acceptance Test
// Traces to: L2-037, L2-036
// Description: Every screen is one column on a phone and uses the width it is given from 320 to 1920 px with nothing cut off and no sideways scroll: the form beside the globe from 992 px, the panel beside the globe and the pin's card beside the settings from 1024 px, the Team table from 768 px, a readable measure and a growing globe from 1200 px, the pages that say one thing one centred column, the leave dialog a sheet under 576 px; turning a phone keeps the selection, the filter and what was typed

import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import { NORTHWIND_INVITE, northwindInvite } from '../fixtures/invites';
import { NORTHWIND_MOMENTS, northwindMoments } from '../fixtures/moments';
import { idOf, NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { NORTHWIND_ME, sofiaProfile } from '../fixtures/profile';
import { boxOf, centredIn, cutOff, fitsItsWidth, WIDTHS } from '../support/layout';
import { rememberTeam } from '../support/membership';

/**
 * Widens the window through every width L2-037 names, and either side of the breakpoints given,
 * checking each.
 */
async function atEveryWidth(
  page: Page,
  breakpoints: number[],
  check: (width: number) => Promise<void>,
  height = 800,
): Promise<void> {
  const widths = [...WIDTHS, ...breakpoints.flatMap((at) => [at - 1, at])].sort((a, b) => a - b);
  for (const width of new Set(widths)) {
    await page.setViewportSize({ width, height });
    await check(width);
    expect(await fitsItsWidth(page), `${width} px scrolls sideways`).toBe(true);
    expect(await cutOff(page), `${width} px`).toEqual([]);
  }
}

/** The first box is above the second, in one column. */
async function above(first: Locator, second: Locator, width: number): Promise<void> {
  const [a, b] = [await boxOf(first), await boxOf(second)];
  expect(a.y + a.height, `${width} px: above`).toBeLessThanOrEqual(b.y + 1);
}

/** The first box is to the left of the second, beside it. */
async function beside(first: Locator, second: Locator, width: number): Promise<void> {
  const [a, b] = [await boxOf(first), await boxOf(second)];
  expect(a.x + a.width, `${width} px: beside`).toBeLessThanOrEqual(b.x + 1);
  expect(a.y, `${width} px: beside`).toBeLessThan(b.y + b.height);
}

test.describe('Layouts at every width', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ api }) => {
    api.answer('GET', NORTHWIND_INVITE, northwindInvite());
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());
    api.answer('GET', NORTHWIND_ME, sofiaProfile());
  });

  test('Join, Sign In and Create Team put the form above the globe under 992 px and beside it from 992 px', async ({
    page,
    joinPage,
    signInPage,
    createTeamPage,
  }) => {
    const screens = [
      { address: '/join/northwind-7Kq2', form: joinPage.form, globe: joinPage.stage },
      { address: '/sign-in', form: signInPage.form, globe: signInPage.stage },
      { address: '/new', form: createTeamPage.form, globe: createTeamPage.stage },
    ];
    for (const { address, form, globe } of screens) {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(address);
      await expect(form).toBeVisible();
      await atEveryWidth(page, [992], async (width) => {
        if (width < 992) await above(form, globe, width);
        else await beside(form, globe, width);
      });
    }
  });

  test('the Globe puts the panel under the globe under 1024 px, with the heading above the globe under 640 px and over its corner from 640 px; from 1024 px the panel is beside it and the globe fills its stage', async ({
    page,
    globePage,
  }) => {
    await rememberTeam(page);
    await page.setViewportSize({ width: 320, height: 800 });
    await globePage.openAt(idOf('Tomás Herrera'));
    await expect(globePage.personName).toHaveText('Tomás Herrera');

    await atEveryWidth(page, [640, 1024], async (width) => {
      const stage = await boxOf(globePage.stage);
      const heading = await boxOf(globePage.heading);
      if (width < 640) await above(globePage.heading, globePage.globeBox, width);
      else {
        expect(heading.x - stage.x, `${width} px: heading at the corner`).toBeLessThanOrEqual(32);
        expect(heading.y - stage.y, `${width} px: heading at the corner`).toBeLessThanOrEqual(32);
      }
      if (width < 1024) await above(globePage.stage, globePage.panel, width);
      else await beside(globePage.stage, globePage.panel, width);

      // The globe is as large as its stage lets it be: it grows with the width
      if (width >= 640) {
        const globe = await boxOf(globePage.globe);
        expect(globe.width, `${width} px: the globe fills its stage`).toBeGreaterThanOrEqual(
          Math.min(stage.width, stage.height) - 2,
        );
      }
    });
  });

  test('from 1024 px the panel scrolls on its own while the globe stays in view', async ({
    page,
    globePage,
  }) => {
    await rememberTeam(page);
    await page.setViewportSize({ width: 1024, height: 600 });
    await globePage.open();
    await expect(globePage.panel).toBeVisible();
    const before = await boxOf(globePage.globe);

    await globePage.panel.hover();
    await page.mouse.wheel(0, 400);

    await expect
      .poll(() => globePage.panel.evaluate((panel) => panel.scrollTop))
      .toBeGreaterThan(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect(await boxOf(globePage.globe)).toEqual(before);
  });

  test('Team shows each teammate’s name, status, local time with city and offset and next moment under 768 px, and a table with all its columns from 768 px', async ({
    page,
    teamPage,
  }) => {
    await rememberTeam(page);
    await page.setViewportSize({ width: 320, height: 800 });
    await teamPage.open();
    const tomas = teamPage.cells(teamPage.row('Tomás Herrera'));
    await expect(tomas.link).toBeVisible();

    await atEveryWidth(page, [768], async (width) => {
      await expect(tomas.status, `${width} px`).toHaveText('Early morning');
      await expect(tomas.time, `${width} px`).toHaveText('08:05');
      await expect(tomas.momentTitle, `${width} px`).toHaveText('Día de Muertos');
      if (width < 768) {
        await expect(tomas.phone, `${width} px`).toHaveText('Mexico City · 7h behind');
        await expect(teamPage.columns.first(), `${width} px`).toBeHidden();
        for (const hidden of [tomas.location, tomas.offset, tomas.weather])
          await expect(hidden, `${width} px`).toBeHidden();
      } else {
        await expect(tomas.phone, `${width} px`).toBeHidden();
        await expect(teamPage.columns, `${width} px`).toHaveCount(6);
        for (const column of await teamPage.columns.all())
          await expect(column, `${width} px`).toBeVisible();
        for (const shown of [tomas.location, tomas.offset, tomas.weather])
          await expect(shown, `${width} px`).toBeVisible();
      }
    });
  });

  test('Profile & Settings puts the pin’s card above the settings under 1024 px, and beside them, kept in view as they scroll, from 1024 px', async ({
    page,
    profilePage,
  }) => {
    await rememberTeam(page);
    await page.setViewportSize({ width: 320, height: 800 });
    await profilePage.open();
    await expect(profilePage.city).toBeVisible();

    await atEveryWidth(page, [1024], async (width) => {
      if (width < 1024) await above(profilePage.pinCard, profilePage.settings, width);
      else await beside(profilePage.pinCard, profilePage.settings, width);
    });

    await page.setViewportSize({ width: 1200, height: 700 });
    const before = await boxOf(profilePage.pinCard);
    await page.mouse.wheel(0, 500);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    expect((await boxOf(profilePage.pinCard)).y).toBeGreaterThanOrEqual(0);
    expect((await boxOf(profilePage.pinCard)).y).toBeLessThanOrEqual(before.y);
  });

  test('from 1200 px text keeps a readable measure, capped and centred, while the Globe’s globe grows', async ({
    page,
    globePage,
    teamPage,
    momentsPage,
    profilePage,
  }) => {
    await rememberTeam(page);
    const sizes: number[] = [];
    for (const width of [1200, 1920]) {
      await page.setViewportSize({ width, height: width === 1200 ? 900 : 1080 });
      for (const [open, main, ready] of [
        [() => teamPage.open(), teamPage.main, teamPage.table],
        [() => momentsPage.open(), momentsPage.main, momentsPage.rows.first()],
        [() => profilePage.open(), profilePage.main, profilePage.city],
      ] as const) {
        await open();
        await expect(ready).toBeVisible();
        const box = await boxOf(main);
        expect(box.width, `${width} px: capped`).toBeLessThan(width - 40);
        expect(centredIn(box, width), `${width} px: centred`).toBe(true);
      }
      await globePage.open();
      await expect(globePage.globe).toBeVisible();
      sizes.push((await boxOf(globePage.globe)).width);
    }
    expect(sizes[1]).toBeGreaterThan(sizes[0]);
  });

  test('a page that says one thing is one centred column at every width: the wordmark, a small globe, a title, a line and its ways on', async ({
    page,
    leftTeamPage,
    inviteNeededPage,
    notFoundPage,
  }) => {
    const screens = [
      { address: '/left', notice: leftTeamPage, ways: 2 },
      { address: '/team', notice: inviteNeededPage, ways: 2 },
      { address: '/nowhere', notice: notFoundPage, ways: 1 },
    ];
    for (const { address, notice, ways } of screens) {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(address);
      await expect(notice.title).toBeVisible();
      await expect(notice.actions, address).toHaveCount(ways);
      await atEveryWidth(page, [576], async (width) => {
        const parts = [notice.wordmark, notice.globe, notice.title, notice.text];
        let bottom = 0;
        for (const part of parts) {
          const box = await boxOf(part);
          expect(box.y, `${address} at ${width} px: in order`).toBeGreaterThanOrEqual(bottom - 1);
          bottom = box.y + box.height;
        }
        for (const part of [notice.globe, notice.title])
          expect(centredIn(await boxOf(part), width), `${address} at ${width} px: centred`).toBe(
            true,
          );
        expect((await boxOf(notice.actions.first())).y).toBeGreaterThanOrEqual(bottom - 1);
      });
    }
  });

  test('“Leave Northwind?” is a sheet from the bottom under 576 px and a dialog in the middle from 576 px', async ({
    page,
    profilePage,
    leaveDialog,
  }) => {
    await rememberTeam(page);
    await page.setViewportSize({ width: 375, height: 740 });
    await profilePage.open();
    await profilePage.leave.click();
    await expect(leaveDialog.dialog).toBeVisible();

    const sheet = await boxOf(leaveDialog.panel);
    expect(sheet.x).toBe(0);
    expect(sheet.width).toBe(375);
    expect(Math.round(sheet.y + sheet.height)).toBe(740);

    await page.setViewportSize({ width: 576, height: 740 });
    const centred = await boxOf(leaveDialog.panel);
    expect(Math.round(centred.x * 2 + centred.width)).toBe(576);
    expect(Math.round(centred.y * 2 + centred.height)).toBe(740);
  });

  test.describe('turning a phone from upright to sideways', () => {
    test.beforeEach(async ({ page }) => {
      await rememberTeam(page);
      await page.setViewportSize({ width: 375, height: 812 });
    });

    const turn = (page: Page) => page.setViewportSize({ width: 812, height: 375 });

    test('keeps the selected pin on the Globe and the filter on Team', async ({
      page,
      globePage,
      teamPage,
    }) => {
      await globePage.openAt(idOf('Tomás Herrera'));
      await expect(globePage.personName).toHaveText('Tomás Herrera');
      await turn(page);
      await expect(globePage.personName).toHaveText('Tomás Herrera');

      await page.setViewportSize({ width: 375, height: 812 });
      await teamPage.open();
      await teamPage.tab('Working now').click();
      await expect(teamPage.tab('Working now')).toHaveAttribute('aria-selected', 'true');
      await turn(page);
      await expect(teamPage.tab('Working now')).toHaveAttribute('aria-selected', 'true');
    });

    test('keeps what was typed on Join and on Profile & Settings', async ({
      page,
      joinPage,
      profilePage,
    }) => {
      await joinPage.open('northwind-7Kq2');
      await joinPage.name.fill('Ana Costa');
      await turn(page);
      await expect(joinPage.name).toHaveValue('Ana Costa');

      await page.setViewportSize({ width: 375, height: 812 });
      await profilePage.open();
      await profilePage.postalCode.fill('10115');
      await turn(page);
      await expect(profilePage.postalCode).toHaveValue('10115');
    });
  });
});
