// Acceptance Test
// Traces to: L2-027, L2-056, L2-026, L2-047, L2-044, L2-015
// Description: Past 40 teammates, Team draws the day ribbon as a bar chart of how many are at each half hour, and lists the team city by city with a search, as pages/team/hundreds draws it

import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import { NOW } from '../fixtures/now';
import { NORTHWIND_PINS, northwindPins, teamOf500 } from '../fixtures/pins';
import { fitsItsWidth } from '../support/layout';
import { mockBars, mockCitySections, mockScale, mockTeamRows, mockText } from '../support/mocks';
import { rememberTeam } from '../support/membership';

/** Leaves the screen open until `minutes` after the mocks' now, then lets a second pass. */
async function leaveOpenUntil(page: Page, minutes: number): Promise<void> {
  await page.clock.pauseAt(new Date(NOW.getTime() + minutes * 60_000));
  await page.clock.runFor(1_000);
}

test.describe('Team: a team of hundreds', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ page }) => {
    await rememberTeam(page);
  });

  test('the day ribbon is a bar chart of the half hours, as the hundreds mock draws it', async ({
    api,
    teamPage,
    page,
  }) => {
    // Given a team of 500
    api.answer('GET', NORTHWIND_PINS, teamOf500());

    // When the Team screen is opened
    await teamPage.open();

    // Then the ribbon draws 48 bars over the four bands, each as tall as the mock's, and no marker
    const mock = mockBars('pages/team/hundreds.html');
    await expect(teamPage.bars).toHaveCount(48);
    expect(await teamPage.barShares()).toEqual(mock.shares);
    await expect(teamPage.ribbonBands).toHaveText([
      'Night',
      'Morning',
      'Working hours',
      'Evening',
      '',
    ]);
    await expect(teamPage.scale).toHaveText(mockScale('pages/team/hundreds.html'));
    await expect(teamPage.markers).toHaveCount(0);

    // And the count stands over the tallest bar, 123 at 15:00
    await expect(teamPage.barCount).toHaveCount(1);
    await expect(teamPage.countOnBar(mock.count.bar)).toHaveText(mock.count.text);

    // And the chart is one picture that says what it shows, its bars hidden and not controls
    await expect(teamPage.density).toHaveAttribute('role', 'img');
    await expect(teamPage.density).toHaveAccessibleName(mock.name);
    await expect(teamPage.barsGroup).toHaveAttribute('aria-hidden', 'true');
    await expect(teamPage.densityControls).toHaveCount(0);

    // And the line above it counts who is in working hours, following the clock with no reload
    await expect(teamPage.ribbonSummary).toHaveText(mock.summary);
    await expect(teamPage.ribbonSummaryCount).toHaveText('324 of 500');
    // At 15:00 UTC Mexico City and Denver start work and Istanbul, Cairo and Nairobi stop
    await leaveOpenUntil(page, 55);
    await expect(teamPage.ribbonSummary).toHaveText('338 of 500 are in working hours right now');
  });

  test('on a phone the bar chart scrolls sideways inside itself, by keyboard, and the page does not', async ({
    api,
    teamPage,
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    api.answer('GET', NORTHWIND_PINS, teamOf500());
    await teamPage.open();
    await expect(teamPage.bars).toHaveCount(48);

    // Then the region that scrolls is named so, and the page fits its width
    await expect(teamPage.densityScroll).toBeVisible();
    expect(await fitsItsWidth(page)).toBe(true);
    expect(
      await teamPage.densityScroll.evaluate((region) => region.scrollWidth > region.clientWidth),
    ).toBe(true);

    // And the keyboard reaches it and scrolls it
    await teamPage.densityScroll.focus();
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(() => teamPage.densityScroll.evaluate((region) => region.scrollLeft))
      .toBeGreaterThan(0);
  });

  test('a teammate who hides their status is in their half hour’s bar and not in the line about working hours', async ({
    api,
    teamPage,
  }) => {
    // Given the team of 500, with Lena in Berlin (15:05) hiding whether she is working or asleep
    const team = teamOf500();
    for (const pin of (team.json as { pins: { name: string; sharesStatus: boolean }[] }).pins)
      if (pin.name === 'Lena Fischer') pin.sharesStatus = false;
    api.answer('GET', NORTHWIND_PINS, team);
    await teamPage.open();

    // Then the 15:00 bar still counts her, and the line does not
    await expect(teamPage.barCount).toHaveText('123');
    await expect(teamPage.ribbonSummary).toHaveText('323 of 500 are in working hours right now');
  });

  test('a team of 40 or fewer keeps a face per teammate and no bar chart', async ({
    api,
    teamPage,
  }) => {
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await teamPage.open();

    await expect(teamPage.markers).toHaveCount(13);
    await expect(teamPage.bars).toHaveCount(0);
    await expect(teamPage.ribbonSummary).toHaveCount(0);
    await expect(teamPage.densityScroll).toHaveCount(0);
  });

  test('the list is a section per city, west to east, the first two open, as the hundreds mock draws it', async ({
    api,
    teamPage,
  }) => {
    // Given a team of 500 in 38 time zones, 324 in working hours and 42 probably asleep
    api.answer('GET', NORTHWIND_PINS, teamOf500());

    // When the Team screen is opened
    await teamPage.open();

    // Then the heading and the filters count the team, and a search stands beside them
    await expect(teamPage.lead).toHaveText(mockText('pages/team/hundreds.html', 'page__lead')!);
    await expect(teamPage.tabs).toHaveText(['All 500', 'Working now 324', 'Asleep 42']);
    await expect(teamPage.search).toHaveAttribute('placeholder', 'Find a person or city');
    await expect(teamPage.search).toHaveAttribute('maxlength', '60');
    await expect(teamPage.search).toHaveAttribute('aria-controls', 'team-list');

    // And each city is a section, west to east, with its count and local time, the first two open
    expect(await teamPage.sectionHeads()).toEqual(mockCitySections('pages/team/hundreds.html'));
    for (const city of ['Honolulu', 'Vancouver']) {
      const toggle = teamPage.sectionToggle(city);
      await expect(toggle).toHaveAccessibleName(new RegExp(`^${city} 4 teammates \\d\\d:05$`));
      await expect(await teamPage.controlledBy(toggle)).toHaveCount(1);
    }
    await expect(teamPage.sectionToggle('San Francisco')).not.toHaveAttribute('aria-controls');

    // And the open cities' rows are the mock's, with the same columns, and no closed city has one
    await expect(teamPage.teamHead).toHaveAttribute('aria-hidden', 'true');
    await expect(teamPage.teamHead).toBeVisible();
    const expected = mockTeamRows('pages/team/hundreds.html');
    await expect(teamPage.rows).toHaveCount(expected.length);
    for (const [index, mock] of expected.entries()) {
      const row = teamPage.rows.nth(index);
      await expect(teamPage.cells(row).link).toHaveText(mock.name);
      await expect(teamPage.cells(row).status).toHaveText(mock.status ?? '');
      await expect(teamPage.cells(row).location).toHaveText(mock.city + mock.country);
      await expect(teamPage.cells(row).time).toHaveText(mock.time);
      await expect(teamPage.cells(row).offset).toHaveText(mock.offset);
      await expect(teamPage.cells(row).weather).toHaveText(mock.degrees);
      await expect(teamPage.cells(row).weatherIcon).toHaveAccessibleName(mock.weatherName!);
    }
  });

  test('a city’s button opens and closes it, and a row in it opens the Globe', async ({
    api,
    teamPage,
    globePage,
    page,
  }) => {
    api.answer('GET', NORTHWIND_PINS, teamOf500());
    await teamPage.open();
    await expect(teamPage.rows).toHaveCount(8);

    // When San Francisco's button is used, its 27 open
    const sanFrancisco = teamPage.sectionToggle('San Francisco');
    await sanFrancisco.click();
    await expect(sanFrancisco).toHaveAttribute('aria-expanded', 'true');
    await expect(teamPage.sectionRows('San Francisco')).toHaveCount(27);

    // And when Honolulu's is used by keyboard, its rows leave the page
    const honolulu = teamPage.sectionToggle('Honolulu');
    await honolulu.focus();
    await page.keyboard.press('Enter');
    await expect(honolulu).toHaveAttribute('aria-expanded', 'false');
    await expect(teamPage.sectionRows('Honolulu')).toHaveCount(0);
    await expect(teamPage.rows).toHaveCount(31);

    // And a row of an open city opens the Globe with that teammate selected
    await teamPage.link(teamPage.row('Lea Nguyen')).click();
    await expect(page).toHaveURL(/\/globe\?teammate=/);
    await expect(globePage.personName).toHaveText('Lea Nguyen');
  });

  test('a filter leaves each city only its teammates in that status, and a city with none out', async ({
    api,
    teamPage,
  }) => {
    api.answer('GET', NORTHWIND_PINS, teamOf500());
    await teamPage.open('asleep');
    await expect(teamPage.sectionToggles).toHaveCount(6);

    // Then only the cities where it is night are listed, Honolulu and Seoul to Auckland
    expect((await teamPage.sectionHeads()).map(({ name, count }) => `${name} ${count}`)).toEqual([
      'Honolulu 4',
      'Seoul 4',
      'Tokyo 10',
      'Melbourne 10',
      'Sydney 9',
      'Auckland 5',
    ]);
    // And the first two of them are open, each with its own teammates only
    await expect(teamPage.rows).toHaveCount(8);
    await expect(teamPage.cells(teamPage.rows.first()).status).toHaveText('Probably asleep');
  });

  test('an open city of more than 50 lists 50 and says how many more, as the crowded-city mock draws it', async ({
    api,
    teamPage,
  }) => {
    // Given a team of 500 with 64 in London
    api.answer('GET', NORTHWIND_PINS, teamOf500({ London: 64, Berlin: 15 }));
    await teamPage.open();
    await expect(teamPage.rows).toHaveCount(8);

    // When London is opened
    await teamPage.sectionToggle('London').click();

    // Then the sections and the rows are the mock's: London's first 50, west to east and by name
    const path = 'pages/team/hundreds-crowded-city.html';
    await expect(teamPage.sectionRows('London')).toHaveCount(50);
    expect(await teamPage.sectionHeads()).toEqual(mockCitySections(path));
    const expected = mockTeamRows(path);
    await expect(teamPage.rows).toHaveCount(expected.length);
    expect(await teamPage.names()).toEqual(expected.map((row) => row.name));

    // And under them a line says how many more London has, and to search for them
    await expect(teamPage.more).toHaveText(mockText(path, 'city-section__more')!);
    await expect(teamPage.density).toHaveAccessibleName(mockBars(path).name);
  });

  test('the search keeps the teammates whose name or city it matches, under their cities, within the filter', async ({
    api,
    teamPage,
  }) => {
    api.answer('GET', NORTHWIND_PINS, teamOf500());
    await teamPage.open();
    await expect(teamPage.rows).toHaveCount(8);

    // When a name is typed, only that teammate is left, under their city
    await teamPage.search.fill('tara');
    await expect(teamPage.sectionToggles).toHaveCount(1);
    expect(await teamPage.sectionHeads()).toEqual([
      { name: 'Honolulu', count: '1', time: '04:05', expanded: 'true' },
    ]);
    expect(await teamPage.names()).toEqual(['Tara Okafor']);

    // And a city is found without its accents, opened as the first section
    await teamPage.search.fill('sao paulo');
    await expect(teamPage.sectionToggles).toHaveCount(1);
    await expect(teamPage.sectionToggle('São Paulo')).toHaveAttribute('aria-expanded', 'true');
    await expect(teamPage.rows).toHaveCount(18);

    // And within Working now, Berlin's 36 are all at work
    await teamPage.search.fill('Berlin');
    await teamPage.tab('Working now').click();
    await expect(teamPage.tab('Working now')).toHaveAttribute('aria-selected', 'true');
    await expect(teamPage.sectionRows('Berlin')).toHaveCount(36);
    // And the filters still count the whole team
    await expect(teamPage.tabs).toHaveText(['All 500', 'Working now 324', 'Asleep 42']);
    // And what was typed is not in the address
    expect(teamPage.address()).toBe('/team?filter=working');
  });

  test('a search that matches no one says so, and "Show everyone" clears it and returns to All', async ({
    api,
    teamPage,
  }) => {
    api.answer('GET', NORTHWIND_PINS, teamOf500());
    await teamPage.open('asleep');
    await expect(teamPage.rows).toHaveCount(8);

    // When a city where no teammate lives is searched for
    await teamPage.search.fill('Reykjavik');

    // Then the list says so in the mock's words, and no city is left
    const path = 'pages/team/hundreds-no-match.html';
    await expect(teamPage.noteTitle).toHaveText(mockText(path, 'list-note__title')!);
    await expect(teamPage.note).toHaveText(
      new RegExp(`Try another filter\\.\\s*Show everyone\\s*$`),
    );
    await expect(teamPage.note).toHaveAttribute('role', 'status');
    await expect(teamPage.sectionToggles).toHaveCount(0);

    // When "Show everyone" is used, the search is empty, All is chosen, and every city is back
    await teamPage.showEveryone.click();
    await expect(teamPage.search).toHaveValue('');
    await expect(teamPage.tab('All')).toHaveAttribute('aria-selected', 'true');
    await expect(teamPage.sectionToggles).toHaveCount(40);
    expect(teamPage.address()).toBe('/team');
  });

  test('what is typed in the search is held to 60 characters and shown as text', async ({
    api,
    teamPage,
    page,
    problems,
  }) => {
    page.on('dialog', (dialog) => {
      problems.push(`A dialog opened: ${dialog.message()}`);
      void dialog.dismiss();
    });
    api.answer('GET', NORTHWIND_PINS, teamOf500());
    await teamPage.open();
    await expect(teamPage.rows).toHaveCount(8);

    // When markup longer than 60 characters is typed
    const markup = '<img src=x onerror=alert(1)>';
    const typed = `${markup}${'x'.repeat(60)}`;
    await teamPage.search.pressSequentially(typed);

    // Then the field keeps 60 characters, and the note quotes them as text
    await expect(teamPage.search).toHaveValue(typed.slice(0, 60));
    await expect(teamPage.noteTitle).toHaveText(`No one matches “${typed.slice(0, 60)}”`);
    await expect(teamPage.images).toHaveCount(0);
    expect(page.url()).not.toContain('img');
  });

  test('scrolled from top to bottom and searched, the page holds a bounded number of rows', async ({
    api,
    teamPage,
  }) => {
    // Given a team of 500
    api.answer('GET', NORTHWIND_PINS, teamOf500());
    await teamPage.open();
    await expect(teamPage.rows).toHaveCount(8);

    // When the screen is scrolled to its bottom, the closed cities hold no rows
    await teamPage.scrollToBottom();
    await expect(teamPage.sectionToggles).toHaveCount(40);
    await expect(teamPage.rows).toHaveCount(8);
    await expect(teamPage.table).toHaveCount(2);

    // When London, the largest city, is opened as well, the page holds its 43 and no more
    await teamPage.sectionToggle('London').click();
    await expect(teamPage.rows).toHaveCount(51);
    await teamPage.scrollToBottom();
    await expect(teamPage.rows).toHaveCount(51);

    // And a search that matches teammates in many cities holds at most 50 for each city it opens
    await teamPage.search.fill('ada');
    await expect(teamPage.sectionToggles).not.toHaveCount(40);
    const open = await teamPage.sectionToggles.evaluateAll(
      (toggles) =>
        toggles.filter((toggle) => toggle.getAttribute('aria-expanded') === 'true').length,
    );
    expect(await teamPage.rows.count()).toBeLessThanOrEqual(open * 50);
    expect(await teamPage.rows.count()).toBeLessThan(150);
  });
});
