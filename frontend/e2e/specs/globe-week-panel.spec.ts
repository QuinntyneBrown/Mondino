// Acceptance Test
// Traces to: L2-024, L2-023, L2-015, L2-020, L2-044, L2-047
// Description: With no pin selected the panel shows the week around the world, this week's moments six at most, soonest first and the same day west to east, and who is in working hours now, six at most, by local hour then west to east; a row selects its teammate's pin, and closing a teammate's or a group's panel returns to the week

import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import { NOW } from '../fixtures/now';
import {
  idOf,
  NORTHWIND_PINS,
  northwindPins,
  northwindPinsOf,
  northwindPinsWhere,
  teamOf500,
} from '../fixtures/pins';
import { CAST_MOMENTS, momentOf, NORTHWIND_MOMENTS, northwindMoments } from '../fixtures/moments';
import { mockMarkup, mockWeekMoments } from '../support/mocks';
import { rememberTeam } from '../support/membership';

/** Text as the screen reads it, with its spacing taken out: "JordanLee·Austin09:05". */
const bare = (text: string) =>
  text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, '');

/** The rows under "In working hours now" in a mock, and its other words. */
function workingIn(path: string): { rows: string[]; count: string; more: string } {
  const markup = mockMarkup(path);
  const section = /<section aria-labelledby="working-title">([\s\S]*?)<\/section>/.exec(markup)![1];
  return {
    rows: [...section.matchAll(/<a class="row"[^>]*>([\s\S]*?)<\/a>/g)].map(([, row]) => bare(row)),
    count: bare(/<span class="panel__count[^"]*">([\s\S]*?)<\/span><\/div>/.exec(section)![1]),
    more: /<a class="panel__more"[^>]*>([^<]*)</.exec(section)![1].trim(),
  };
}

/** A paragraph of the week's section in a mock, by its class. */
function weekText(path: string, className: string): string {
  return new RegExp(`<p class="${className}">([^<]*)</p>`).exec(mockMarkup(path))![1];
}

async function leaveOpenUntil(page: Page, minutes: number): Promise<void> {
  await page.clock.pauseAt(new Date(NOW.getTime() + minutes * 60_000));
  await page.clock.runFor(1_000);
}

test.describe('Globe: the week around the world', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ page }) => {
    await rememberTeam(page);
  });

  test('reads as the mocks do: no moments yet, and six of the eight in working hours', async ({
    api,
    globePage,
  }) => {
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await globePage.open();

    // The week's section, with no moment found where anyone lives, as pages/globe/no-moments draws it
    await expect(globePage.panel).toHaveAccessibleName('This week around the world');
    await expect(globePage.weekLead).toHaveText(
      weekText('pages/globe/no-moments.html', 'panel__lead'),
    );
    await expect(globePage.weekEmpty).toHaveText(
      weekText('pages/globe/no-moments.html', 'panel__empty'),
    );
    await expect(globePage.allMoments).toHaveText('All moments');
    await expect(globePage.allMoments).toHaveAttribute('href', '/moments');

    // "In working hours now", as pages/globe/default draws it: the count 8, named as teammates,
    // then Jordan to Sofia (you) by local hour and west to east, and "2 more on the Team page"
    const mock = workingIn('pages/globe/default.html');
    await expect(globePage.workingCount).toHaveText('Teammates: 8');
    await expect(globePage.workingCountName).toHaveText('Teammates:');
    expect(mock.count).toBe('Teammates:8');
    await expect(globePage.workingRows).toHaveCount(6);
    expect((await globePage.workingRowTexts()).map(bare)).toEqual(mock.rows);
    await expect(globePage.moreWorking).toHaveText(mock.more);
    await expect(globePage.moreWorking).toHaveAttribute('href', '/team?filter=working');
  });

  test('this week’s moments read as the mock does: six, soonest first and the same day west to east', async ({
    api,
    globePage,
    page,
  }) => {
    // Given the cast's moments: Liam's today, Jordan's in 4 days, three on 1 November in Mexico
    // City, Stockholm and Bengaluru, Tomás's Clásico in 6 days, two more within the week and
    // Chloé's Grand Prix in 13 days
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());
    await globePage.open();

    // Then the week lists the first six as pages/globe/default draws them, today's emblem solid,
    // each with its kind's icon, title, kind and teammate, and when; Chloé's is not among them
    await expect(globePage.weekRows).toHaveCount(6);
    expect(await globePage.weekRowParts()).toEqual(mockWeekMoments('pages/globe/default.html'));
    await expect(globePage.weekRow('São Paulo Grand Prix')).toHaveCount(0);
    await expect(globePage.weekEmpty).toHaveCount(0);
    // And "All moments" is under the list however many it holds
    await expect(globePage.allMoments).toHaveText('All moments');
    await expect(globePage.allMoments).toHaveAttribute('href', '/moments');

    // When the October Bank Holiday row is chosen, Liam's pin is selected and his panel replaces
    // the week
    await globePage.weekRow('October Bank Holiday').click();
    await expect(page).toHaveURL(new RegExp(`/globe\\?teammate=${idOf('Liam O’Connor')}$`));
    await expect(globePage.pin('Liam O’Connor')).toHaveAttribute('aria-pressed', 'true');
    await expect(globePage.personName).toHaveText('Liam O’Connor');
    await expect(globePage.week).toHaveCount(0);
  });

  test('a moment’s title, and its teammate’s name, written as markup are shown as text', async ({
    api,
    globePage,
  }) => {
    // Given Liam is named as markup, and his moment today is titled as markup
    const markup = '<img src=x onerror=alert(1)>';
    api.answer(
      'GET',
      NORTHWIND_PINS,
      northwindPinsWhere((pin) => (pin.name === 'Liam O’Connor' ? { ...pin, name: markup } : pin)),
    );
    api.answer(
      'GET',
      NORTHWIND_MOMENTS,
      northwindMoments([
        {
          ...momentOf('Liam O’Connor', 'holiday', '2025-10-27', '<b>Bank</b> Holiday', '<i>x</i>'),
          teammateName: markup,
        },
        ...CAST_MOMENTS.slice(1),
      ]),
    );
    await globePage.open();

    // Then the row gives both as their literal characters, his first word as the row names a
    // teammate, and no script runs (a page error fails the spec) (L2-044)
    await expect(globePage.weekRow('<b>Bank</b> Holiday')).toHaveCount(1);
    const [first] = await globePage.weekRowParts();
    expect(first.title).toBe('<b>Bank</b> Holiday');
    expect(first.meta).toBe('Holiday, <img · Dublin');
  });

  test('moments that cannot be read leave the week saying there are none, and the rest as it was', async ({
    api,
    globePage,
  }) => {
    // Given the moments are refused (L2-049)
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    api.refuse('GET', NORTHWIND_MOMENTS, 503, 'unavailable');
    await globePage.open();

    // Then the week says "No moments this week.", and who is working is listed as ever
    await expect(globePage.weekEmpty).toHaveText('No moments this week.');
    await expect(globePage.workingRows).toHaveCount(6);
    await expect(globePage.counts).toContainText('12 time zones');
  });

  test('a row selects its teammate’s pin; closing the panel or a group’s returns to the week', async ({
    api,
    globePage,
    page,
  }) => {
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await globePage.open();

    // When Liam's row is chosen
    await globePage.workingRow('Liam O’Connor').click();

    // Then his pin is selected and his panel replaces the week
    await expect(page).toHaveURL(new RegExp(`/globe\\?teammate=${idOf('Liam O’Connor')}$`));
    await expect(globePage.personName).toHaveText('Liam O’Connor');
    await expect(globePage.pin('Liam O’Connor')).toHaveAttribute('aria-pressed', 'true');
    await expect(globePage.week).toHaveCount(0);

    // And when it is closed, the week is back (L2-023 criterion 4)
    await globePage.closePanel.click();
    await expect(globePage.person).toHaveCount(0);
    await expect(globePage.weekLead).toBeVisible();
    await expect(globePage.workingRows).toHaveCount(6);

    // And a group's panel closed by Escape returns to the week too (L2-023 criterion 10)
    await globePage.pin('2 teammates').click();
    await expect(globePage.group).toBeVisible();
    await expect(globePage.week).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(globePage.group).toHaveCount(0);
    await expect(globePage.weekLead).toBeVisible();
  });

  test('nobody in working hours reads “Nobody — it’s quiet everywhere.” with no count', async ({
    api,
    globePage,
    page,
  }) => {
    // Given Sofia, Mara and Liam: at 15:05 in Milan all three are working, so all are listed
    api.answer(
      'GET',
      NORTHWIND_PINS,
      northwindPinsOf('Sofia Bianchi', 'Mara Lindqvist', 'Liam O’Connor'),
    );
    await globePage.open();
    await expect(globePage.workingRows).toHaveCount(3);
    await expect(globePage.moreWorking).toHaveCount(0);

    // And at 23:30 in Milan nobody is, as pages/globe/quiet draws it
    await leaveOpenUntil(page, 8 * 60 + 25);
    await expect(globePage.workingEmpty).toHaveText(
      weekText('pages/globe/quiet.html', 'panel__empty'),
    );
    await expect(globePage.workingCount).toHaveCount(0);
    await expect(globePage.workingRows).toHaveCount(0);
  });

  test('a teammate who does not share their status is not listed or counted', async ({
    api,
    globePage,
  }) => {
    api.answer(
      'GET',
      NORTHWIND_PINS,
      northwindPinsWhere((pin) =>
        pin.name === 'Jordan Lee' ? { ...pin, sharesStatus: false } : pin,
      ),
    );
    await globePage.open();

    await expect(globePage.workingCount).toHaveText('Teammates: 7');
    await expect(globePage.workingRow('Jordan Lee')).toHaveCount(0);
    await expect(globePage.workingRows).toHaveCount(6);
    await expect(globePage.moreWorking).toHaveText('1 more on the Team page');
  });

  test('a team of 500 lists six of its 324 in working hours', async ({ api, globePage }) => {
    api.answer('GET', NORTHWIND_PINS, teamOf500());
    await globePage.open();

    await expect(globePage.workingCount).toHaveText('Teammates: 324');
    await expect(globePage.workingRows).toHaveCount(6);
    await expect(globePage.moreWorking).toHaveText('318 more on the Team page');
  });
});
