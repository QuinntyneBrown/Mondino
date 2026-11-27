// Acceptance Test
// Traces to: L2-048, L2-025, L2-047
// Description: A screen left open reads the team again every 15 minutes while it is visible, never while the tab is hidden, and at once when it is shown after longer; a teammate who joined meanwhile appears and pulses, with no toast, and the selection and the globe's place are kept

import { momentOf, NORTHWIND_MOMENTS, northwindMoments, NO_MOMENTS } from '../fixtures/moments';
import { idOf, NORTHWIND_PINS, northwindPins, northwindPinsOf } from '../fixtures/pins';
import { expect, test } from '../fixtures/test';
import { rememberTeam } from '../support/membership';
import { makeTheTabHideable, setTheTabHidden } from '../support/turning';
import type { ApiFixture } from '../fixtures/api';

/** Northwind before Jordan joined: the cast without him. */
const beforeJordan = [
  'Tomás Herrera',
  'Chloé Martin',
  'Luca Ferri',
  'Priya Raman',
  'Aiko Tanaka',
  'Noah Williams',
  'Ahmed Al-Sayed',
  'Kwame Mensah',
  'Lena Fischer',
  'Liam O’Connor',
  'Mara Lindqvist',
  'Sofia Bianchi',
];

/**
 * Answers the pins as Northwind stood before Jordan joined, then, from the second read on, with him;
 * and counts the reads of the pins and of the moments.
 */
function answerAsJordanJoins(api: ApiFixture): { pins: number; moments: number } {
  const reads = { pins: 0, moments: 0 };
  api.answer('GET', NORTHWIND_PINS, () =>
    ++reads.pins === 1 ? northwindPinsOf(...beforeJordan) : northwindPins(),
  );
  api.answer('GET', NORTHWIND_MOMENTS, () => {
    reads.moments++;
    return NO_MOMENTS;
  });
  return reads;
}

test.describe('Keep the team fresh', () => {
  test('every 15 minutes the team is read again; a teammate who joined appears and pulses, with no toast, and the selection and the globe hold', async ({
    api,
    page,
    globePage,
  }) => {
    // Given Sofia has Tomás's panel open on the Globe at 14:05, before Jordan joined
    await rememberTeam(page);
    const reads = answerAsJordanJoins(api);
    await globePage.openAt(idOf('Tomás Herrera'));
    await expect(globePage.title).toHaveText('12 teammates');
    await expect(globePage.personName).toHaveText('Tomás Herrera');
    await expect.poll(() => globePage.pinPlace('Tomás Herrera')).toEqual({ x: 50, y: 50 });
    await expect(globePage.pin('Jordan Lee')).toHaveCount(0);

    // When 14 minutes pass, nothing is read again
    await page.clock.fastForward('14:00');
    await page.clock.runFor(1_000);
    expect(reads).toEqual({ pins: 1, moments: 1 });

    // And when the 15th minute passes, the pins and the moments are read again
    await page.clock.fastForward('01:00');
    await expect.poll(() => reads).toEqual({ pins: 2, moments: 2 });

    // Then Jordan's pin is on the globe and pulses once, and the counts include him
    await expect(globePage.title).toHaveText('13 teammates');
    await expect(globePage.counts).toHaveText('12 time zones · 8 working · 2 asleep');
    await expect(globePage.pin('Jordan Lee')).toBeVisible();
    await expect(globePage.newPins).toHaveCount(1);
    await expect(globePage.newPins).toHaveAccessibleName(/^Jordan Lee/);

    // And no toast greets him: it is for the teammate who has just joined
    await expect(globePage.toast).toHaveCount(0);

    // And Tomás is still selected, in the address and the panel, and the globe still faces him
    expect(globePage.address()).toBe(`/globe?teammate=${idOf('Tomás Herrera')}`);
    await expect(globePage.personName).toHaveText('Tomás Herrera');
    expect(await globePage.pinPlace('Tomás Herrera')).toEqual({ x: 50, y: 50 });
  });

  test('a hidden tab reads nothing, and one shown after more than 15 minutes reads the team at once', async ({
    api,
    page,
    globePage,
  }) => {
    await makeTheTabHideable(page);
    await rememberTeam(page);
    const reads = answerAsJordanJoins(api);
    await globePage.open();
    await expect(globePage.title).toHaveText('12 teammates');

    // When the tab is hidden for an hour, nothing is read
    await setTheTabHidden(page, true);
    await page.clock.fastForward('01:00:00');
    await page.clock.runFor(1_000);
    expect(reads).toEqual({ pins: 1, moments: 1 });

    // And when it is shown again, the team is read at once, and Jordan is on it
    await setTheTabHidden(page, false);
    await expect.poll(() => reads).toEqual({ pins: 2, moments: 2 });
    await expect(globePage.title).toHaveText('13 teammates');

    // And a tab hidden for 5 minutes, then shown, waits for its 15 minutes
    await setTheTabHidden(page, true);
    await page.clock.fastForward('05:00');
    await setTheTabHidden(page, false);
    await page.clock.runFor(1_000);
    expect(reads).toEqual({ pins: 2, moments: 2 });
  });

  test('at a teammate’s midnight their moments move between Today, This week and Later, with no reload', async ({
    api,
    page,
    momentsPage,
  }) => {
    // Given Luca's moments in Milan tomorrow and in 8 days, at 15:05 in Milan
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    api.answer(
      'GET',
      NORTHWIND_MOMENTS,
      northwindMoments([
        momentOf('Luca Ferri', 'local-event', '2025-10-28', 'Design week', 'Design week in Milan'),
        momentOf('Luca Ferri', 'sport', '2025-11-04', 'Derby della Madonnina', 'Inter v Milan'),
      ]),
    );
    await momentsPage.open();
    await expect(momentsPage.groupRowTitles('This week')).toHaveText(['Design week']);
    await expect(momentsPage.groupRowTitles('Later')).toHaveText(['Derby della Madonnina']);
    await expect(momentsPage.todayMoments).toHaveCount(0);

    // When Milan's midnight passes, with the screen left open
    await page.clock.pauseAt(new Date('2025-10-27T23:00:30Z'));
    await page.clock.runFor(1_000);

    // Then tomorrow's moment is today's, and the one in 8 days is this week's
    await expect(momentsPage.todayTitles).toHaveText(['Design week']);
    await expect(momentsPage.groupRowTitles('This week')).toHaveText(['Derby della Madonnina']);
    await expect(momentsPage.groupRowTitles('Later')).toHaveCount(0);
  });
});
