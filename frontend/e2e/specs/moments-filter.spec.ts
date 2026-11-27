// Acceptance Test
// Traces to: L2-030, L2-022
// Description: Moments is filtered by kind as moments/filtered and moments/no-results draw it, listing every kind whatever the viewer chose for the globe

import { expect, test } from '../fixtures/test';
import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { CAST_MOMENTS, NORTHWIND_MOMENTS, northwindMoments } from '../fixtures/moments';
import { mockFilterChips, mockMomentGroups, mockMomentRows, mockText } from '../support/mocks';
import { chooseKinds, rememberTeam } from '../support/membership';

test.describe('Moments: filtered by kind', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ api, page }) => {
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
  });

  test('"Formula 1" lists only races, grouped as before, though the viewer turned them off for the globe', async ({
    api,
    momentsPage,
  }) => {
    // Given Sofia has turned Formula 1 off for the globe, and the cast's moments
    await chooseKinds(momentsPage.page, ['holiday', 'local-event', 'sport']);
    api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());
    await momentsPage.open();

    // Then the filters are one group, "Everything" pressed, and the races are listed (L2-022)
    await expect(momentsPage.filters).toBeVisible();
    await expect(momentsPage.row('São Paulo Grand Prix', 'Chloé')).toBeVisible();

    // When "Formula 1" is chosen
    await momentsPage.chip('Formula 1').click();
    await expect(momentsPage.chip('Formula 1')).toHaveAttribute('aria-pressed', 'true');

    // Then it is pressed, by aria-pressed, and the list is the filtered mock's: Later only
    expect(await momentsPage.chipParts()).toEqual(mockFilterChips('pages/moments/filtered.html'));
    await expect(momentsPage.todayMoments).toHaveCount(0);
    await expect(momentsPage.groupTitles).toHaveText(
      mockMomentGroups('pages/moments/filtered.html'),
    );
    expect(await momentsPage.rowParts()).toEqual(mockMomentRows('pages/moments/filtered.html'));

    // When "Everything" is chosen again, every moment is back
    await momentsPage.chip('Everything').click();
    await expect(momentsPage.todayMoments).toHaveCount(1);
    await expect(momentsPage.rows).toHaveCount(14);
  });

  test('a kind with nothing ahead says so, and "Show everything" returns to Everything', async ({
    api,
    momentsPage,
  }) => {
    // Given the Clásico and the Melbourne Cup have passed: no sport ahead
    api.answer(
      'GET',
      NORTHWIND_MOMENTS,
      northwindMoments(CAST_MOMENTS.filter((moment) => moment.kind !== 'sport')),
    );
    await momentsPage.open();

    // When "Sport" is chosen
    await momentsPage.chip('Sport').click();
    await expect(momentsPage.chip('Sport')).toHaveAttribute('aria-pressed', 'true');

    // Then the filters stay, Sport pressed, and the note is the no-results mock's, as a status
    expect(await momentsPage.chipParts()).toEqual(mockFilterChips('pages/moments/no-results.html'));
    await expect(momentsPage.noteTitle).toHaveText(
      mockText('pages/moments/no-results.html', 'list-note__title')!,
    );
    await expect(momentsPage.note).toHaveRole('status');
    await expect(momentsPage.note).toContainText(
      'None of your teammates’ cities have one in the next 90 days.',
    );
    await expect(momentsPage.rows).toHaveCount(0);
    await expect(momentsPage.groupTitles).toHaveCount(0);

    // When "Show everything" is used, Everything is pressed and the moments are back
    await momentsPage.showEverything.click();
    await expect(momentsPage.chip('Everything')).toHaveAttribute('aria-pressed', 'true');
    await expect(momentsPage.chip('Sport')).toHaveAttribute('aria-pressed', 'false');
    await expect(momentsPage.rows).toHaveCount(12);
  });
});
