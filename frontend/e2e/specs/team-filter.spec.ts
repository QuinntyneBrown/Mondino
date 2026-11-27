// Acceptance Test
// Traces to: L2-028, L2-015, L2-024, L2-026, L2-041
// Description: The Team list is filtered by All, Working now or Asleep, one tab list with each filter's count, following the hour with no reload and leaving a teammate who hides their status under All only

import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import { NOW } from '../fixtures/now';
import {
  NORTHWIND_PINS,
  northwindPins,
  northwindPinsOf,
  northwindPinsWhere,
} from '../fixtures/pins';
import { mockTeamRows } from '../support/mocks';
import { rememberTeam } from '../support/membership';

/** Leaves the screen open until `minutes` after the mocks' now, then lets a second pass. */
async function leaveOpenUntil(page: Page, minutes: number): Promise<void> {
  await page.clock.pauseAt(new Date(NOW.getTime() + minutes * 60_000));
  await page.clock.runFor(1_000);
}

/** The names in a mock's rows, without "(you)". */
const namesIn = (path: string) =>
  mockTeamRows(path).map((row) => row.name.replace(/\s*\(you\)$/, ''));

test.describe('Team: filter by status', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ page }) => {
    await rememberTeam(page);
  });

  test('reads "All 13", "Working now 8" and "Asleep 2", and each filter lists as its mock does', async ({
    api,
    teamPage,
  }) => {
    // Given Northwind's thirteen at 14:05 UTC
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await teamPage.open();

    // Then the filters are one tab list with their counts, All chosen
    await expect(teamPage.tabs).toHaveText(['All 13', 'Working now 8', 'Asleep 2']);
    await expect(teamPage.tab('All')).toHaveAttribute('aria-selected', 'true');
    await expect(teamPage.list).toHaveAccessibleName('All 13');

    // When "Working now" is chosen, the list is pages/team/working's, still west to east
    await teamPage.tab('Working now').click();
    await expect(teamPage.tab('Working now')).toHaveAttribute('aria-selected', 'true');
    expect(teamPage.address()).toBe('/team?filter=working');
    await expect(teamPage.caption).toHaveText('Teammates in working hours, west to east');
    await expect(teamPage.rows).toHaveCount(8);
    expect(await teamPage.names()).toEqual(namesIn('pages/team/working.html'));

    // And "Asleep" lists pages/team/asleep's
    await teamPage.tab('Asleep').click();
    expect(teamPage.address()).toBe('/team?filter=asleep');
    await expect(teamPage.caption).toHaveText('Teammates probably asleep, west to east');
    await expect(teamPage.rows).toHaveCount(2);
    expect(await teamPage.names()).toEqual(namesIn('pages/team/asleep.html'));

    // And the ribbon still places everyone
    await expect(teamPage.markers).toHaveCount(13);
  });

  test('the arrow keys move between the tabs and choose the one they reach', async ({
    api,
    teamPage,
    page,
  }) => {
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await teamPage.open();
    await expect(teamPage.rows).toHaveCount(13);

    // One tab is in the tab order: the chosen one
    await expect(teamPage.tab('All')).toHaveAttribute('tabindex', '0');
    await expect(teamPage.tab('Working now')).toHaveAttribute('tabindex', '-1');

    await teamPage.tab('All').focus();
    await page.keyboard.press('ArrowRight');
    await expect(teamPage.tab('Working now')).toBeFocused();
    await expect(teamPage.tab('Working now')).toHaveAttribute('aria-selected', 'true');
    await expect(teamPage.rows).toHaveCount(8);

    await page.keyboard.press('ArrowRight');
    await expect(teamPage.tab('Asleep')).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(teamPage.tab('All')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(teamPage.tab('Asleep')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(teamPage.tab('All')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('End');
    await expect(teamPage.tab('Asleep')).toHaveAttribute('aria-selected', 'true');
    await expect(teamPage.rows).toHaveCount(2);
  });

  test('a filter that leaves no one says so, and "Show everyone" returns to All', async ({
    api,
    teamPage,
    page,
  }) => {
    // Given Sofia, Mara and Liam mid-afternoon in Europe, as pages/team/no-results
    api.answer(
      'GET',
      NORTHWIND_PINS,
      northwindPinsOf('Sofia Bianchi', 'Mara Lindqvist', 'Liam O’Connor'),
    );
    await teamPage.open('asleep');

    // Then Asleep says no one is asleep
    await expect(teamPage.tabs).toHaveText(['All 3', 'Working now 3', 'Asleep 0']);
    await expect(teamPage.note).toHaveRole('status');
    await expect(teamPage.noteTitle).toHaveText('No one is asleep right now');
    await expect(teamPage.note).toContainText('Try another filter.');
    await expect(teamPage.table).toHaveCount(0);

    // And "Show everyone" returns to All
    await teamPage.showEveryone.click();
    await expect(teamPage.tab('All')).toHaveAttribute('aria-selected', 'true');
    expect(teamPage.address()).toBe('/team');
    await expect(teamPage.rows).toHaveCount(3);

    // And at 23:30 in Milan, as pages/team/quiet, Working now says no one is working
    await teamPage.tab('Working now').click();
    await leaveOpenUntil(page, 8 * 60 + 25);
    await expect(teamPage.tabs).toHaveText(['All 3', 'Working now 0', 'Asleep 2']);
    await expect(teamPage.noteTitle).toHaveText('No one is in working hours right now');
    await expect(teamPage.note).toContainText(
      'It’s the quiet gap between time zones. Check back in an hour.',
    );
    await expect(teamPage.showEveryone).toBeVisible();
  });

  test('the list and the counts follow the hour with no reload', async ({
    api,
    teamPage,
    page,
  }) => {
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await teamPage.open('working');
    await expect(teamPage.rows).toHaveCount(8);

    // When the clock passes 15:00 UTC, 09:00 in Mexico City, Tomás is in working hours
    await leaveOpenUntil(page, 55);
    await expect(teamPage.tab('Working now')).toHaveText('Working now 9');
    await expect(teamPage.rows).toHaveCount(9);
    expect((await teamPage.names())[0]).toBe('Tomás Herrera');
  });

  test('a teammate who hides their status is listed under All only, and in neither count', async ({
    api,
    teamPage,
  }) => {
    // Given Lena (working) and Aiko (asleep) have turned off "Share whether I’m working or asleep"
    api.answer(
      'GET',
      NORTHWIND_PINS,
      northwindPinsWhere((pin) =>
        ['Lena Fischer', 'Aiko Tanaka'].includes(pin.name) ? { ...pin, sharesStatus: false } : pin,
      ),
    );
    await teamPage.open();

    // Then they are counted under All only
    await expect(teamPage.tabs).toHaveText(['All 13', 'Working now 7', 'Asleep 1']);
    // And their rows have no status, at any hour
    await expect(teamPage.cells(teamPage.row('Lena Fischer')).status).toHaveCount(0);
    await expect(teamPage.cells(teamPage.row('Aiko Tanaka')).status).toHaveCount(0);

    // And they are under neither Working now nor Asleep
    await teamPage.tab('Working now').click();
    await expect(teamPage.rows).toHaveCount(7);
    expect(await teamPage.names()).not.toContain('Lena Fischer');
    await teamPage.tab('Asleep').click();
    await expect(teamPage.rows).toHaveCount(1);
    expect(await teamPage.names()).toEqual(['Noah Williams']);
  });

  test('"2 more on the Team page" on the Globe opens Team with "Working now" chosen', async ({
    api,
    globePage,
    teamPage,
  }) => {
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await globePage.open();
    await globePage.moreWorking.click();

    await expect(teamPage.tab('Working now')).toHaveAttribute('aria-selected', 'true');
    expect(teamPage.address()).toBe('/team?filter=working');
    await expect(teamPage.rows).toHaveCount(8);
  });
});
