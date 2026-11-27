// Acceptance Test
// Traces to: L2-029, L2-030, L2-024, L2-007, L2-020
// Description: Moments lists the team's moments as moments/default draws them, today's first, then This week and Later, reached from the Globe's "All moments"; a moment opens the Globe with its teammate selected

import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import { idOf, NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { momentOf, NORTHWIND_MOMENTS, northwindMoments } from '../fixtures/moments';
import {
  mockFilterChips,
  mockMomentGroups,
  mockMomentRows,
  mockTodayMoment,
} from '../support/mocks';
import { rememberTeam } from '../support/membership';

/** Leaves the screen open until the time given, then lets a second pass. */
async function leaveOpenUntil(page: Page, time: string): Promise<void> {
  await page.clock.pauseAt(new Date(time));
  await page.clock.runFor(1_000);
}

test.describe('Moments: by when they happen', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ api, page }) => {
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
  });

  test('"All moments" on the Globe opens Moments, which reads as the default mock does', async ({
    api,
    globePage,
    momentsPage,
    page,
  }) => {
    // Given Northwind's thirteen and the cast's moments at 14:05 UTC on Monday 27 October
    api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());

    // When "All moments" under "This week around the world" is used (L2-024)
    await page.goto('/globe');
    await globePage.allMoments.click();

    // Then the Moments screen is shown, marked in the header as the screen shown
    await expect(page).toHaveURL('/moments');
    await expect(page).toHaveTitle('Moments · Mondino');
    await expect(momentsPage.title).toHaveText('Moments');
    await expect(momentsPage.lead).toHaveText(
      'Holidays, races and local happenings where your teammates live.',
    );
    await expect(momentsPage.momentsLink).toHaveAttribute('aria-current', 'page');

    // And "Everything" is chosen (L2-030)
    expect(await momentsPage.chipParts()).toEqual(mockFilterChips('pages/moments/default.html'));

    // And Liam's October Bank Holiday comes first, as "Today in Dublin" (L2-029)
    const today = mockTodayMoment('pages/moments/default.html')!;
    await expect(momentsPage.todayMoments).toHaveCount(1);
    expect(await momentsPage.todayParts()).toEqual(today);

    // And then "This week" and "Later", each moment as the mock draws it, in date order and on
    // 1 November west to east: Mexico City, Stockholm, Bengaluru; each naming its teammate
    // by first name and city, with their initials in their colour (L2-007, L2-029)
    await expect(momentsPage.groupTitles).toHaveText(
      mockMomentGroups('pages/moments/default.html'),
    );
    const rows = mockMomentRows('pages/moments/default.html');
    await expect(momentsPage.rows).toHaveCount(rows.length);
    expect(await momentsPage.rowParts()).toEqual(rows);

    // And no postal code is anywhere on the screen (L2-007)
    await expect(momentsPage.main).not.toContainText('20121');

    // When Dublin's midnight passes, with the screen left open
    await leaveOpenUntil(page, '2025-10-28T00:00:30Z');

    // Then the bank holiday has gone and every day counts one fewer, with no reload (L2-020)
    await expect(momentsPage.todayMoments).toHaveCount(0);
    await expect(
      momentsPage.kindOf(momentsPage.row('Halloween on 6th Street', 'Jordan')),
    ).toHaveText('Local event · In 4 days');
    // Melbourne is already on 28 October: its Cup is still 7 days off; Austin's evening is not
    await leaveOpenUntil(page, '2025-10-28T05:00:30Z');
    await expect(
      momentsPage.kindOf(momentsPage.row('Halloween on 6th Street', 'Jordan')),
    ).toHaveText('Local event · In 3 days');
  });

  test('a moment is listed from today to 90 days ahead, and a group with none has no heading', async ({
    api,
    momentsPage,
  }) => {
    // Given a moment yesterday, tomorrow, in 3 days and 90 and 91 days ahead, in Milan
    const at = (date: string, title: string) =>
      momentOf('Luca Ferri', 'local-event', date, title, `${title}, in Milan`);
    api.answer(
      'GET',
      NORTHWIND_MOMENTS,
      northwindMoments([
        at('2025-10-26', 'Yesterday’s fair'),
        at('2025-10-28', 'Tomorrow’s fair'),
        at('2025-10-30', 'Thursday’s fair'),
        at('2026-01-25', 'The 90th day’s fair'),
        at('2026-01-26', 'The 91st day’s fair'),
      ]),
    );

    // When the Moments screen is opened
    await momentsPage.open();

    // Then there is no card for today, and yesterday's and the 91st day's are not listed
    await expect(momentsPage.groupTitles).toHaveText(['This week', 'Later']);
    await expect(momentsPage.todayMoments).toHaveCount(0);
    await expect(momentsPage.rowTitles).toHaveText([
      'Tomorrow’s fair',
      'Thursday’s fair',
      'The 90th day’s fair',
    ]);

    // And they read "Tomorrow" and "In 3 days", beside the weekday, day and month (L2-029)
    expect((await momentsPage.rowParts()).map((row) => [row.date, row.kind])).toEqual([
      ['Tue 28 Oct', 'Local event · Tomorrow'],
      ['Thu 30 Oct', 'Local event · In 3 days'],
      ['Sun 25 Jan', 'Local event · In 90 days'],
    ]);
  });

  test('choosing a moment opens the Globe with its teammate’s pin selected', async ({
    api,
    momentsPage,
    globePage,
    page,
  }) => {
    // Given the cast's moments
    api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());
    await momentsPage.open();

    // When today's "On the globe" is used
    await momentsPage.todayMoments.first().click();

    // Then the Globe opens with Liam selected (L2-029)
    await expect(page).toHaveURL(`/globe?teammate=${idOf('Liam O’Connor')}`);
    await expect(globePage.personName).toHaveText('Liam O’Connor');

    // And from Moments again, Jordan's row selects Jordan, by keyboard
    await page.goBack();
    const jordan = momentsPage.row('Halloween on 6th Street', 'Jordan');
    await jordan.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(`/globe?teammate=${idOf('Jordan Lee')}`);
    await expect(globePage.personName).toHaveText('Jordan Lee');
  });
});
