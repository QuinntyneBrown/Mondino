// Acceptance Test
// Traces to: L2-029, L2-049, L2-054, L2-025, L2-044
// Description: Moments while it loads, when it fails, with nothing ahead, with titles that are markup, and its header's "Invite teammate"

import { expect, test } from '../fixtures/test';
import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { momentOf, NORTHWIND_MOMENTS, NO_MOMENTS, northwindMoments } from '../fixtures/moments';
import { mockText } from '../support/mocks';
import { rememberTeam } from '../support/membership';

const markup = '<img src=x onerror=alert(1)>';

test.describe('Moments: its states', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ api, page }) => {
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
  });

  test('while the moments are read it shows the placeholder, and when they fail "Try again" reads them again', async ({
    api,
    momentsPage,
    page,
  }) => {
    // Given the moments have not come back yet
    const moments = api.hold('GET', NORTHWIND_MOMENTS);
    await momentsPage.open();

    // Then the screen is headed, busy, and announces "Loading moments…" (moments/loading)
    await expect(momentsPage.title).toHaveText('Moments');
    await expect(momentsPage.main).toHaveAttribute('aria-busy', 'true');
    await expect(momentsPage.loading).toBeVisible();
    await expect(momentsPage.loadingAnnouncement).toHaveText('Loading moments…');

    // When Mondino does not answer, the screen is moments/error
    moments.release({ unanswered: true });
    await expect(momentsPage.errorTitle).toHaveText(
      mockText('pages/moments/error.html', 'empty__title')!,
    );
    await expect(momentsPage.errorTitle).toHaveRole('heading');
    await expect(momentsPage.errorText).toHaveText(
      mockText('pages/moments/error.html', 'empty__text')!,
    );
    await expect(momentsPage.backToGlobe).toHaveAttribute('href', '/globe');
    await expect(momentsPage.header).toBeVisible();

    // When Mondino answers again and "Try again" is used, the moments are listed
    api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());
    await momentsPage.tryAgain.click();
    await expect(momentsPage.rows).toHaveCount(14);
    await expect(momentsPage.error).toHaveCount(0);
    await expect(page).toHaveURL('/moments');
  });

  test('with nothing ahead it says "Nothing coming up" and shows no filter', async ({
    api,
    momentsPage,
  }) => {
    // Given no moment where any teammate lives in the next 90 days
    api.answer('GET', NORTHWIND_MOMENTS, NO_MOMENTS);
    await momentsPage.open();

    // Then the screen is moments/empty
    await expect(momentsPage.emptyTitle).toHaveText(
      mockText('pages/moments/empty.html', 'empty__title')!,
    );
    await expect(momentsPage.emptyTitle).toHaveRole('heading');
    await expect(momentsPage.emptyText).toHaveText(
      mockText('pages/moments/empty.html', 'empty__text')!,
    );
    await expect(momentsPage.backToGlobe).toHaveAttribute('href', '/globe');
    await expect(momentsPage.filters).toHaveCount(0);
    await expect(momentsPage.rows).toHaveCount(0);
  });

  test('a title and detail typed as markup are shown as their characters, and "Invite teammate" opens the invite dialog', async ({
    api,
    momentsPage,
    inviteDialog,
  }) => {
    // Given a moment whose title and detail are markup
    api.answer(
      'GET',
      NORTHWIND_MOMENTS,
      northwindMoments([momentOf('Jordan Lee', 'local-event', '2025-10-31', markup, markup)]),
    );
    await momentsPage.open();

    // Then they read as typed, and make no image (L2-044)
    const row = momentsPage.row(markup, 'Jordan');
    await expect(row).toContainText(markup);
    await expect(momentsPage.images).toHaveCount(0);

    // When "Invite teammate" in the header is used, the invite dialog opens (L2-054, L2-025)
    await momentsPage.inviteTeammate.click();
    await expect(inviteDialog.title).toHaveText('Invite teammates to Northwind');
  });
});
