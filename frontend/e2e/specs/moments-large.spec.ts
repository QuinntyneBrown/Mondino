// Acceptance Test
// Traces to: L2-047, L2-029
// Description: For a team of 500, Moments holds a bounded number of rows in the page as it is scrolled from top to bottom and back

import { expect, test } from '../fixtures/test';
import { NORTHWIND_PINS, type PinJson, teamOf500 } from '../fixtures/pins';
import { momentsOf500, NORTHWIND_MOMENTS, northwindMoments } from '../fixtures/moments';
import { rememberTeam } from '../support/membership';

/** The most moments the page holds at once (ADR 0021). */
const limit = 60;

test.describe('Moments: a team of hundreds', () => {
  test.use({ webgl: false });

  test('scrolled from top to bottom and back, the page holds at most 60 moments', async ({
    api,
    momentsPage,
    page,
  }) => {
    // Given a team of 500 with 1,502 moments ahead
    await rememberTeam(page);
    const team = teamOf500();
    const pins = (team.json as { pins: PinJson[] }).pins;
    api.answer('GET', NORTHWIND_PINS, team);
    api.answer('GET', NORTHWIND_MOMENTS, northwindMoments(momentsOf500(pins)));

    // When the Moments screen is opened, the first moment is today's
    await momentsPage.open();
    await expect(momentsPage.todayMoments).toHaveText(/The first of the 500/);
    expect(await momentsPage.momentsInPage()).toBeLessThanOrEqual(limit);

    // And scrolled to the bottom, step by step, the page never holds more than 60
    const last = momentsPage.row('The last of the 500', '');
    for (let step = 0; step < 200 && !(await last.isVisible()); step++) {
      await momentsPage.scrollToBottom();
      await momentsPage.settle();
      expect(await momentsPage.momentsInPage()).toBeLessThanOrEqual(limit);
    }
    await expect(last).toBeInViewport();
    await expect(momentsPage.groupTitles).toHaveText(['Later']);

    // And scrolled back to the top, the first moment is there again
    for (let step = 0; step < 200 && !(await momentsPage.todayMoments.isVisible()); step++) {
      await momentsPage.scrollToTop();
      await momentsPage.settle();
      expect(await momentsPage.momentsInPage()).toBeLessThanOrEqual(limit);
    }
    await expect(momentsPage.todayMoments).toBeInViewport();
  });
});
