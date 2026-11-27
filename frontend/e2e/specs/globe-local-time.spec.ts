// Acceptance Test
// Traces to: L2-014, L2-015
// Description: Each pin gives its teammate's local time and their status in words, worked out in the browser from one clock that ticks every local time together; a status changes at its hour, and a teammate who hides it has none

import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import { NOW } from '../fixtures/now';
import { NORTHWIND_PINS, northwindPins, northwindPinsWhere } from '../fixtures/pins';
import { mockMarkup } from '../support/mocks';
import { rememberTeam } from '../support/membership';

/** The pins' accessible names in a mock, up to their weather: the moments come later. */
function namesIn(mock: string, parts: number): string[] {
  return [...mockMarkup(mock).matchAll(/<button class="pin [^"]*"[^>]*aria-label="([^"]*)"/g)].map(
    ([, name]) =>
      name.startsWith('2 teammates')
        ? name
        : name.replaceAll('&amp;', '&').split(', ').slice(0, parts).join(', '),
  );
}

/** The time `minutes` after the mocks' now. */
const minutesAfterNow = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

/**
 * Leaves the screen open until `minutes` after the mocks' now, then lets one second pass: with the
 * page's clock paused nothing renders until it runs (docs/lessons-learned.md, journey 9).
 */
async function leaveOpenUntil(page: Page, minutes: number): Promise<void> {
  await page.clock.pauseAt(minutesAfterNow(minutes));
  await page.clock.runFor(1_000);
}

test.describe('Globe: local time and status', () => {
  // The still picture shows the pins the mocks draw, from Mexico City to Bengaluru, and holds still
  test.use({ webgl: false });

  test.beforeEach(async ({ page }) => {
    await rememberTeam(page);
  });

  test('each pin gives its teammate’s local time and status as the mock does, on a 24-hour clock', async ({
    api,
    globePage,
  }) => {
    // Given it is 14:05 UTC on Monday 27 October 2025 and Sofia, in Milan, is on the 24-hour clock
    api.answer('GET', NORTHWIND_PINS, northwindPins());

    // When she opens the Globe
    await globePage.open();

    // Then each pin facing her is named with its teammate's local time and status, as the mock
    // names it: "Chloé Martin, São Paulo, 11:05, Working hours" to "Priya Raman, Bengaluru, 19:35, Evening"
    await expect(globePage.pinButtons).toHaveCount(8);
    const mock = namesIn('pages/globe/default.html', 5);
    for (const name of await globePage.pinNames()) expect(mock).toContain(name);
    expect(await globePage.pinNames()).toContain(
      'Kwame Mensah, Accra, 14:05, Working hours, Clear 30°',
    );
    expect(await globePage.pinNames()).toContain(
      'Ahmed Al-Sayed, Dubai, 18:05, Evening, Clear 32°',
    );
    expect(await globePage.pinNames()).toContain(
      'Priya Raman, Bengaluru, 19:35, Evening, Stormy 27°',
    );

    // And each label shows the local time
    await expect(globePage.labelTimeOf('Chloé Martin')).toHaveText('11:05');
    await expect(globePage.labelTimeOf('Priya Raman')).toHaveText('19:35');
  });

  test('a teammate who joined from the United States reads every local time on a 12-hour clock', async ({
    api,
    globePage,
  }) => {
    // Given the viewer is Jordan, who joined from Austin, and has not chosen a clock
    api.answer(
      'GET',
      NORTHWIND_PINS,
      northwindPinsWhere((pin) => ({ ...pin, isViewer: pin.name === 'Jordan Lee' })),
    );

    // When Jordan opens the Globe
    await globePage.open();

    // Then each local time is on the 12-hour clock, as the 12-hour mock gives it
    await expect(globePage.labelTimeOf('Chloé Martin')).toHaveText('11:05 am');
    await expect(globePage.labelTimeOf('Liam O’Connor')).toHaveText('2:05 pm');
    await expect(globePage.labelTimeOf('Priya Raman')).toHaveText('7:35 pm');
    const mock = namesIn('pages/globe/fahrenheit-12-hour.html', 5);
    for (const name of ['Chloé Martin', 'Liam O’Connor']) {
      const named = (await globePage.pinNames()).find((each) => each.startsWith(name));
      expect(mock).toContain(named);
    }
    await expect(globePage.pin('Ahmed Al-Sayed')).toHaveAccessibleName(
      'Ahmed Al-Sayed, Dubai, 6:05 pm, Evening, Clear 90°',
    );
  });

  test('every local time changes together when the minute changes', async ({
    api,
    page,
    globePage,
  }) => {
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await globePage.open();
    await expect(globePage.labelTimeOf('Chloé Martin')).toHaveText('11:05');
    const before = await globePage.restingTimes.allTextContents();

    // When the clock reaches 14:06
    await leaveOpenUntil(page, 1);

    // Then within a second every label reads one minute later, all at once
    await expect(globePage.labelTimeOf('Chloé Martin')).toHaveText('11:06');
    expect(await globePage.restingTimes.allTextContents()).toEqual(
      before.map((time) => time.replace(/5$/, '6')),
    );
  });

  test('a status changes at its hour with no reload', async ({ api, page, globePage }) => {
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await globePage.open();
    await expect(globePage.pin('Ahmed Al-Sayed')).toBeVisible();

    // Given the screen is left open until Ahmed's local time is 08:59 the next morning, "Early morning"
    await leaveOpenUntil(page, 14 * 60 + 54);
    await expect(globePage.pin('Ahmed Al-Sayed')).toHaveAccessibleName(
      'Ahmed Al-Sayed, Dubai, 08:59, Early morning, Clear 32°',
    );

    // When the clock reaches 09:00 in Dubai
    await page.clock.runFor(60_000);

    // Then his status is "Working hours"
    await expect(globePage.pin('Ahmed Al-Sayed')).toHaveAccessibleName(
      'Ahmed Al-Sayed, Dubai, 09:00, Working hours, Clear 32°',
    );
  });

  test('a teammate who does not share whether they are working or asleep has no status', async ({
    api,
    globePage,
  }) => {
    // Given Ahmed has turned off "Share whether I’m working or asleep", and his weather, as the
    // sharing-off mock draws him
    api.answer(
      'GET',
      NORTHWIND_PINS,
      northwindPinsWhere((pin) =>
        pin.name === 'Ahmed Al-Sayed'
          ? { ...pin, sharesStatus: false, weather: null, weatherState: 'NotShared' }
          : pin,
      ),
    );

    // When Sofia opens the Globe in his evening
    await globePage.open();

    // Then his pin gives his local time and no status, as the sharing-off mock names it, while
    // Priya's beside it still gives hers
    await expect(globePage.pin('Priya Raman')).toHaveAccessibleName(
      'Priya Raman, Bengaluru, 19:35, Evening, Stormy 27°',
    );
    await expect(globePage.pin('Ahmed Al-Sayed')).toHaveAccessibleName(
      'Ahmed Al-Sayed, Dubai, 18:05',
    );
    expect(namesIn('pages/globe/sharing-off.html', 4)).toContain('Ahmed Al-Sayed, Dubai, 18:05');
  });
});
