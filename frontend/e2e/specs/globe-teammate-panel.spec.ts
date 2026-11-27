// Acceptance Test
// Traces to: L2-007, L2-014, L2-015, L2-016, L2-017, L2-018, L2-019, L2-020, L2-023, L2-044, L2-049
// Description: A selected teammate's panel gives their name, city and country, local time and own day, offset, status, weather and the overlap with the viewer, and their upcoming moments, as the mocks draw it; the viewer's own has "(you)" and no offset or overlap; a teammate who shares neither weather nor status has the private note

import { expect, test } from '../fixtures/test';
import { idOf, NORTHWIND_PINS, northwindPins, northwindPinsWhere } from '../fixtures/pins';
import { CAST_MOMENTS, NORTHWIND_MOMENTS, northwindMoments } from '../fixtures/moments';
import { mockPanel } from '../support/mocks';
import { NORTHWIND_MEMBERSHIP, rememberTeam } from '../support/membership';
import type { GlobePage } from '../pages/globe.page';

/** Compares the panel on the screen with the mock's, part by part. */
async function expectPanelAsIn(globePage: GlobePage, mock: string): Promise<void> {
  const drawn = mockPanel(mock);
  await expect(globePage.panel).toHaveAccessibleName(drawn.name!.replace(' (you)', ''));
  await expect(globePage.personName).toHaveText(drawn.name!);
  await expect(globePage.personPlace).toHaveText(drawn.place!);
  await expect(globePage.personClock).toHaveText(drawn.clock!);
  await expect(globePage.personDay).toHaveText(drawn.day!);
  if (drawn.status) await expect(globePage.personStatus).toHaveText(drawn.status);
  else await expect(globePage.personStatus).toHaveCount(0);
  if (drawn.temperature) {
    await expect(globePage.personTemperature).toHaveText(drawn.temperature);
    await expect(globePage.personSky).toHaveText(drawn.sky!);
    await expect(globePage.personWeatherIcon).toHaveAccessibleName(drawn.weatherIconName!);
    expect(await globePage.panelIconShapes()).toEqual(drawn.weatherIcon);
  } else await expect(globePage.personTemperature).toHaveCount(0);
  if (drawn.weatherNote) await expect(globePage.personWeatherNote).toHaveText(drawn.weatherNote);
  if (drawn.note) await expect(globePage.privateNote).toHaveText(drawn.note);
  else await expect(globePage.privateNote).toHaveCount(0);
  if (drawn.overlapWhen) {
    await expect(globePage.overlap).toHaveAccessibleName('Working-hours overlap');
    await expect(globePage.overlapWhen).toHaveText(drawn.overlapWhen);
    await expect(globePage.overlapText).toHaveText(drawn.overlapText!);
    expect(await globePage.overlapBarParts()).toEqual(drawn.barParts);
  } else await expect(globePage.overlap).toHaveCount(0);
  if (drawn.moments.length > 0) expect(await globePage.momentCards()).toEqual(drawn.moments);
  else await expect(globePage.personMoments).toHaveCount(0);
  // Mondino has no chat
  await expect(globePage.messageButton).toHaveCount(0);
}

test.describe('Globe: a teammate’s panel', () => {
  // The still picture holds still; the panel does not depend on what draws the globe
  test.use({ webgl: false });

  test.beforeEach(async ({ page, api }) => {
    await rememberTeam(page);
    // The cast's moments, as the seeded Northwind's are found (find-moments)
    api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());
  });

  test('Tomás’s panel gives his city, time, "7h behind you", status, weather and overlap', async ({
    api,
    globePage,
  }) => {
    // Given Sofia in Milan at 15:05, and Tomás in Mexico City
    api.answer('GET', NORTHWIND_PINS, northwindPins());

    // When she selects Tomás's pin (here through its address)
    await globePage.openAt(idOf('Tomás Herrera'));

    // Then the panel is pages/globe/selected's: "Mexico City, Mexico", "08:05", "Monday 27 Oct ·
    // 7h behind you", "Early morning", "22°C", "Partly cloudy in Mexico City" and the overlap of
    // 16:00 to 18:00 on her clock, with the bar's parts where the mock places them
    await expectPanelAsIn(globePage, 'pages/globe/selected.html');
    await expect(globePage.personAvatar).toHaveText('TH');
    await expect(globePage.personStatus).toHaveClass(/status--morning/);
    await expect(globePage.overlapText).toHaveText(
      'You and Tomás share 2 hours of working hours: 16:00 to 18:00 on your clock.',
    );
  });

  test('Noah’s panel gives Melbourne’s own day, and no working hours shared', async ({
    api,
    globePage,
  }) => {
    api.answer('GET', NORTHWIND_PINS, northwindPins());

    await globePage.openAt(idOf('Noah Williams'));

    // Then it is pages/globe/selected-asleep's: "Tuesday 28 Oct · 10h ahead of you", "Probably
    // asleep", and "None today", his working day 23:00 to 08:00 on her clock, no shared part
    await expectPanelAsIn(globePage, 'pages/globe/selected-asleep.html');
    await expect(globePage.personStatus).toHaveClass(/status--asleep/);
    await expect(globePage.overlapBoth).toHaveCount(0);
  });

  test('the viewer’s own panel says "(you)" and gives no offset or overlap', async ({
    api,
    globePage,
  }) => {
    api.answer('GET', NORTHWIND_PINS, northwindPins());

    await globePage.openAt(NORTHWIND_MEMBERSHIP.teammateId);

    // Then it is pages/globe/selected-self's: "Sofia Bianchi (you)", "Monday 27 Oct" alone,
    // "13°C" and "Foggy in Milan" with the fog icon, and no overlap
    await expectPanelAsIn(globePage, 'pages/globe/selected-self.html');
    await expect(globePage.personYou).toHaveText('(you)');
    await expect(globePage.personDay).toHaveText('Monday 27 Oct');
  });

  test('a teammate on the viewer’s clock is "same time as you", and with no moment has no moments section', async ({
    api,
    globePage,
  }) => {
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    // Luca, in Milan like Sofia, with no moment coming up
    api.answer(
      'GET',
      NORTHWIND_MOMENTS,
      northwindMoments(CAST_MOMENTS.filter((moment) => moment.teammateName !== 'Luca Ferri')),
    );

    await globePage.openAt(idOf('Luca Ferri'));

    await expect(globePage.personDay).toHaveText('Monday 27 Oct · same time as you');
    await expect(globePage.overlapWhen).toHaveText('09:00–18:00 your time');
    await expect(globePage.personClock).toHaveText('15:05');
    await expect(globePage.personMoments).toHaveCount(0);
  });

  test('a teammate who shares neither weather nor status has the private note in their place', async ({
    api,
    globePage,
  }) => {
    // Given Ahmed has turned off both sharing switches
    api.answer(
      'GET',
      NORTHWIND_PINS,
      northwindPinsWhere((pin) =>
        pin.name === 'Ahmed Al-Sayed'
          ? { ...pin, sharesStatus: false, weather: null, weatherState: 'NotShared' }
          : pin,
      ),
    );

    await globePage.openAt(idOf('Ahmed Al-Sayed'));

    // Then it is pages/globe/sharing-off's: his city, "18:05", "3h ahead of you", the note and his
    // moments ("Holiday · 2 Dec", "UAE National Day", and "Formula 1 · 7 Dec", "Abu Dhabi Grand
    // Prix"), with no status, no weather and no working-hours overlap
    await expectPanelAsIn(globePage, 'pages/globe/sharing-off.html');
    await expect(globePage.personWeather).toHaveCount(0);
  });

  test('weather that is unavailable says so for the city, never a zero', async ({
    api,
    globePage,
  }) => {
    api.answer(
      'GET',
      NORTHWIND_PINS,
      northwindPinsWhere((pin) =>
        pin.name === 'Tomás Herrera' ? { ...pin, weather: null, weatherState: 'Unavailable' } : pin,
      ),
    );

    await globePage.openAt(idOf('Tomás Herrera'));

    await expectPanelAsIn(globePage, 'pages/globe/weather-unavailable.html');
    await expect(globePage.personWeatherNote).toContainText('Weather for Mexico City');
  });

  test('a viewer in the United States reads °F on the 12-hour clock, and the overlap’s hours bare', async ({
    api,
    globePage,
  }) => {
    // Given the viewer is Jordan, in Austin, and Luca's Milan is at 13 °C
    api.answer(
      'GET',
      NORTHWIND_PINS,
      northwindPinsWhere((pin) => ({ ...pin, isViewer: pin.name === 'Jordan Lee' })),
    );

    await globePage.openAt(idOf('Luca Ferri'));

    // Then Luca's panel reads "55°F", "3:05 pm", and the overlap on Jordan's 12-hour clock
    await expect(globePage.personTemperature).toHaveText('55°F');
    await expect(globePage.personSky).toHaveText('Foggy in Milan');
    await expect(globePage.personClock).toHaveText('3:05 pm');
    await expect(globePage.personDay).toHaveText('Monday 27 Oct · 6h ahead of you');
    await expect(globePage.overlapWhen).toHaveText('9 am–12 pm your time');
  });

  test('a temperature just under zero reads "0°C", never "−0°C"', async ({ api, globePage }) => {
    api.answer(
      'GET',
      NORTHWIND_PINS,
      northwindPinsWhere((pin) =>
        pin.name === 'Lena Fischer'
          ? { ...pin, weather: { ...pin.weather!, temperatureC: -0.4 } }
          : pin,
      ),
    );

    await globePage.openAt(idOf('Lena Fischer'));

    await expect(globePage.personTemperature).toHaveText('0°C');
  });

  test('the offset follows a daylight-saving change on one side with no reload', async ({
    api,
    globePage,
    page,
  }) => {
    // Given Saturday 25 October 2025, 23:00 in Milan (UTC+2), and Tomás in Mexico City (UTC−6)
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await page.clock.setSystemTime(new Date('2025-10-25T21:00:00Z'));
    await globePage.openAt(idOf('Tomás Herrera'));
    await expect(globePage.personDay).toHaveText('Saturday 25 Oct · 8h behind you');

    // When Milan's clocks go back at 03:00 on Sunday
    await page.clock.pauseAt(new Date('2025-10-26T01:30:00Z'));
    await page.clock.runFor(1_000);

    // Then his offset has changed by one hour
    await expect(globePage.personDay).toHaveText('Saturday 25 Oct · 7h behind you');
  });

  test('a name typed as markup is shown as text', async ({ api, globePage }) => {
    const markup = '<img src=x onerror=alert(1)>';
    api.answer(
      'GET',
      NORTHWIND_PINS,
      northwindPinsWhere((pin) => (pin.name === 'Lena Fischer' ? { ...pin, name: markup } : pin)),
    );

    await globePage.openAt(idOf('Lena Fischer'));

    await expect(globePage.personName).toHaveText(markup);
    await expect(globePage.images).toHaveCount(0);
  });
});
