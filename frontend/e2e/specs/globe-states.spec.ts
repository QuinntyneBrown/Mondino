// Acceptance Test
// Traces to: L2-049
// Description: Globe while the team is first read shows its placeholder and says "Loading your team…" politely; when the read fails it says so with "Try again" and shows nothing of the team

import { expect, test } from '../fixtures/test';
import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { rememberTeam } from '../support/membership';

test.describe('Globe: its states', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ page }) => {
    await rememberTeam(page);
  });

  test('while the team is read it shows the placeholder, announced politely as "Loading your team…"', async ({
    api,
    globePage,
  }) => {
    // Given the pins have not come back yet
    const pins = api.hold('GET', NORTHWIND_PINS);
    await globePage.open();

    // Then the screen is pages/globe/loading: the heading named "Your team", the globe's place
    // and the panel's held by placeholders, and the wait said once, politely
    await expect(globePage.loadingTitle).toHaveText('Your team');
    await expect(globePage.placeholder).toBeVisible();
    await expect(globePage.loading).toHaveAttribute('aria-busy', 'true');
    await expect(globePage.announcement).toHaveText('Loading your team…');
    await expect(globePage.announcement).toHaveAttribute('aria-live', 'polite');
    await expect(globePage.pinButtons).toHaveCount(0);

    // When they come back, the team takes its place
    pins.release(northwindPins());
    await expect(globePage.title).toHaveText('13 teammates');
    await expect(globePage.pinButtons).toHaveCount(8);
    await expect(globePage.loading).toHaveCount(0);
    await expect(globePage.announcement).toHaveText('');
  });

  test('when the team cannot be read it says so with "Try again", and shows nothing of the team', async ({
    api,
    globePage,
    page,
  }) => {
    // Given Mondino does not answer
    api.answer('GET', NORTHWIND_PINS, { unanswered: true });
    await globePage.open();

    // Then the screen is pages/globe/error
    await expect(globePage.errorTitle).toHaveText('The globe didn’t load');
    await expect(globePage.errorTitle).toHaveRole('heading');
    await expect(globePage.errorText).toHaveText(
      'We couldn’t reach Mondino to fetch your team. Check your connection — nothing you set has been lost.',
    );

    // And no pin, count or panel of the team is shown
    await expect(globePage.main).toHaveCount(0);
    await expect(globePage.allPins).toHaveCount(0);
    await expect(globePage.panel).toHaveCount(0);

    // When Mondino answers again and "Try again" is used, the team is shown
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await globePage.tryAgain.click();
    await expect(globePage.pinButtons).toHaveCount(8);
    await expect(globePage.error).toHaveCount(0);
    await expect(page).toHaveURL('/globe');
  });
});
