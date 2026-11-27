// Acceptance Test
// Traces to: L2-027, L2-056, L2-026, L2-047, L2-044, L2-015
// Description: Past 40 teammates, Team draws the day ribbon as a bar chart of how many are at each half hour, and lists the team city by city with a search, as pages/team/hundreds draws it

import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import { NOW } from '../fixtures/now';
import { NORTHWIND_PINS, northwindPins, teamOf500 } from '../fixtures/pins';
import { fitsItsWidth } from '../support/layout';
import { mockBars, mockScale } from '../support/mocks';
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
});
