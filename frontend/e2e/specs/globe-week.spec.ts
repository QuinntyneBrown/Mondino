// Acceptance Test
// Traces to: L2-025, L2-015
// Description: With no pin selected the Globe screen heads the globe with the team's counts, which follow the hour with no reload and leave out of working and asleep a teammate who does not share their status

import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import { NOW } from '../fixtures/now';
import {
  NORTHWIND_PINS,
  northwindPins,
  northwindPinsOf,
  northwindPinsWhere,
  teamOf500,
} from '../fixtures/pins';
import { mockMarkup } from '../support/mocks';
import { rememberTeam } from '../support/membership';

/** Leaves the screen open until `minutes` after the mocks' now, then lets a second pass. */
async function leaveOpenUntil(page: Page, minutes: number): Promise<void> {
  await page.clock.pauseAt(new Date(NOW.getTime() + minutes * 60_000));
  await page.clock.runFor(1_000);
}

/** The heading over the globe in a mock: its title and its counts. */
function headingIn(path: string): [string, string] {
  const markup = mockMarkup(path);
  const title = /<h1 id="globe-title">([^<]*)<\/h1>/.exec(markup)?.[1];
  const counts = /<p class="globe-screen__counts[^"]*">([^<]*)<\/p>/.exec(markup)?.[1];
  if (!title || !counts) throw new Error(`No heading in ${path}`);
  return [title, counts];
}

test.describe('Globe: the team’s counts', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ page }) => {
    await rememberTeam(page);
  });

  test('read as the mock does, and change on the hour with no reload', async ({
    api,
    globePage,
    page,
  }) => {
    // Given Northwind's thirteen at 14:05 UTC
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await globePage.open();

    // Then the heading reads as pages/globe/default does: "13 teammates", "12 time zones · 8 working · 2 asleep"
    const [title, counts] = headingIn('pages/globe/default.html');
    await expect(globePage.title).toHaveText(title);
    await expect(globePage.counts).toHaveText(counts);

    // And when the clock passes 15:00 UTC, 09:00 in Mexico City, Tomás is counted as working
    await leaveOpenUntil(page, 55);
    await expect(globePage.counts).toHaveText('12 time zones · 9 working · 2 asleep');
  });

  test('a teammate who does not share their status is counted as neither working nor asleep', async ({
    api,
    globePage,
  }) => {
    // Given Lena (working) and Aiko (asleep) have turned off "Share whether I’m working or asleep"
    api.answer(
      'GET',
      NORTHWIND_PINS,
      northwindPinsWhere((pin) =>
        ['Lena Fischer', 'Aiko Tanaka'].includes(pin.name) ? { ...pin, sharesStatus: false } : pin,
      ),
    );
    await globePage.open();

    // Then they are still teammates in their time zones, and neither working nor asleep
    await expect(globePage.title).toHaveText('13 teammates');
    await expect(globePage.counts).toHaveText('12 time zones · 7 working · 1 asleep');
  });

  test('a smaller team late in the evening reads as the quiet mock does', async ({
    api,
    globePage,
    page,
  }) => {
    // Given Sofia, Mara and Liam, at 23:30 in Milan
    api.answer(
      'GET',
      NORTHWIND_PINS,
      northwindPinsOf('Sofia Bianchi', 'Mara Lindqvist', 'Liam O’Connor'),
    );
    await globePage.open();
    await expect(globePage.title).toHaveText('3 teammates');
    await leaveOpenUntil(page, 8 * 60 + 25);

    // Then the heading reads as pages/globe/quiet does
    const [title, counts] = headingIn('pages/globe/quiet.html');
    await expect(globePage.title).toHaveText(title);
    await expect(globePage.counts).toHaveText(counts);
  });

  test('a team of 500 reads as the hundreds mock does', async ({ api, globePage }) => {
    api.answer('GET', NORTHWIND_PINS, teamOf500());
    await globePage.open();

    const [title, counts] = headingIn('pages/globe/hundreds.html');
    await expect(globePage.title).toHaveText(title);
    await expect(globePage.counts).toHaveText(counts);
  });
});
