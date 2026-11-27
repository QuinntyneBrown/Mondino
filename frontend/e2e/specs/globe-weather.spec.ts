// Acceptance Test
// Traces to: L2-011, L2-012, L2-018, L2-019, L2-049
// Description: Each pin carries its city's weather as an icon and its temperature in whole degrees, with its word in the pin's name and in the lifted label; a viewer in the United States reads °F; at night a clear sky takes its night icon; weather that is unavailable or not shared leaves the local time alone, never a zero

import { expect, test } from '../fixtures/test';
import { NOW } from '../fixtures/now';
import { NORTHWIND_PINS, northwindPins, northwindPinsWhere } from '../fixtures/pins';
import { labelIconIn, mockMarkup } from '../support/mocks';
import { rememberTeam } from '../support/membership';

/** The pins' accessible names in a mock, up to their weather: the moments come later. */
function namesIn(mock: string): string[] {
  return [...mockMarkup(mock).matchAll(/<button class="pin [^"]*"[^>]*aria-label="([^"]*)"/g)]
    .map(([, name]) => name)
    .filter((name) => !name.startsWith('2 teammates'))
    .map((name) => name.split(', ').slice(0, 5).join(', '));
}

test.describe('Globe: weather', () => {
  // The still picture shows the pins the mocks draw, and holds still
  test.use({ webgl: false });

  test.beforeEach(async ({ page }) => {
    await rememberTeam(page);
  });

  test('each pin carries its weather as the mock draws it, in °C', async ({ api, globePage }) => {
    // Given Sofia in Milan, and the cast's weather: Berlin cloudy at 8 °C, São Paulo showers at 26 °C
    const defaultMock = mockMarkup('pages/globe/default.html');
    api.answer('GET', NORTHWIND_PINS, northwindPins());

    // When she opens the Globe
    await globePage.open();
    await expect(globePage.pinButtons).toHaveCount(8);

    // Then each pin's name gives its weather's word and its degrees, as the mock names it
    const mock = namesIn('pages/globe/default.html');
    expect(mock).toContain('Lena Fischer, Berlin, 15:05, Working hours, Cloudy 8°');
    for (const name of await globePage.pinNames())
      if (!name.startsWith('2 teammates'))
        expect(mock).toContain(name.split(', ').slice(0, 5).join(', '));

    // And each label carries the local time, the weather's icon and the degrees, with no unit letter
    await expect(globePage.labelTimeOf('Lena Fischer')).toHaveText('15:05');
    await expect(globePage.labelDegreesOf('Lena Fischer')).toHaveText('8°');
    await expect(globePage.labelDegreesOf('Chloé Martin')).toHaveText('26°');
    await expect(globePage.labelIconOf('Lena Fischer')).toHaveAttribute('aria-hidden', 'true');
    expect(await globePage.labelIconShapes('Lena Fischer')).toEqual(
      labelIconIn('pages/globe/default.html', '15:05'),
    );
    expect(await globePage.labelIconShapes('Chloé Martin')).toEqual(
      labelIconIn('pages/globe/default.html', '11:05'),
    );
    expect(defaultMock).toContain('Showers 26°');

    // And when Lena's pin is pointed at, the lifted label names the weather in words too
    await globePage.pin('Lena Fischer').hover();
    await expect(globePage.labelOf('Lena Fischer')).toHaveClass(/pin-label--lifted/);
    await expect(globePage.labelDegreesOf('Lena Fischer')).toHaveText('8°');
    await expect(globePage.labelWordOf('Lena Fischer')).toHaveText('Cloudy');
  });

  test('a viewer who joined from the United States reads every temperature in °F', async ({
    api,
    globePage,
  }) => {
    // Given the viewer is Jordan, in Austin, who has not chosen a unit
    api.answer(
      'GET',
      NORTHWIND_PINS,
      northwindPinsWhere((pin) => ({ ...pin, isViewer: pin.name === 'Jordan Lee' })),
    );

    // When Jordan opens the Globe
    await globePage.open();
    await expect(globePage.pinButtons).toHaveCount(8);

    // Then each temperature is in whole degrees Fahrenheit, as the °F mock gives it
    const names = await globePage.pinNames();
    expect(names).toContain('Liam O’Connor, Dublin, 2:05 pm, Working hours, Rainy 48°');
    expect(names).toContain('Chloé Martin, São Paulo, 11:05 am, Working hours, Showers 79°');
    await expect(globePage.labelDegreesOf('Chloé Martin')).toHaveText('79°');
  });

  test('at night at a teammate’s city a clear sky takes its night icon', async ({
    api,
    page,
    globePage,
  }) => {
    // Given Ahmed in Dubai and Kwame in Accra, both under a clear sky
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await globePage.open();
    expect(await globePage.labelIconShapes('Ahmed Al-Sayed')).toEqual(
      labelIconIn('pages/globe/default.html', '18:05'),
    );

    // When it is 23:05 in Dubai, and 19:05 in Accra
    await page.clock.pauseAt(new Date(NOW.getTime() + 5 * 3_600_000));
    await page.clock.runFor(1_000);
    await expect(globePage.labelTimeOf('Ahmed Al-Sayed')).toHaveText('23:05');

    // Then Ahmed, probably asleep, has the night icon, as the mock draws Tokyo's clear night
    expect(await globePage.labelIconShapes('Ahmed Al-Sayed')).toEqual(
      labelIconIn('pages/globe/sharing-off.html', '23:05'),
    );
    expect((await globePage.pinNames()).find((name) => name.startsWith('Ahmed'))).toBe(
      'Ahmed Al-Sayed, Dubai, 23:05, Probably asleep, Clear 32°',
    );

    // And Kwame, in his evening, keeps the sun
    await expect(globePage.labelTimeOf('Kwame Mensah')).toHaveText('19:05');
    expect(await globePage.labelIconShapes('Kwame Mensah')).toEqual(
      labelIconIn('pages/globe/default.html', '18:05'),
    );
  });

  test('while the weather is unavailable every pin keeps its local time and status, and no weather', async ({
    api,
    globePage,
  }) => {
    // Given the weather source is failing, so no pin has weather
    api.answer(
      'GET',
      NORTHWIND_PINS,
      northwindPinsWhere((pin) => ({ ...pin, weather: null, weatherState: 'Unavailable' })),
    );

    // When Sofia opens the Globe
    await globePage.open();
    await expect(globePage.pinButtons).toHaveCount(8);

    // Then each pin is named by its teammate, city, local time and status alone, as the mock names it
    const mock = mockMarkup('pages/globe/weather-unavailable.html');
    expect(mock).toContain('aria-label="Chloé Martin, São Paulo, 11:05, Working hours"');
    expect(mock).toContain('aria-label="Liam O’Connor, Dublin, 14:05, Working hours, October');
    const names = await globePage.pinNames();
    expect(names).toContain('Chloé Martin, São Paulo, 11:05, Working hours');
    expect(names).toContain('Liam O’Connor, Dublin, 14:05, Working hours');
    for (const name of names) expect(name).not.toContain('°');

    // And each label is the local time alone: no icon, no degrees, never a zero
    await expect(globePage.labelOf('Chloé Martin')).toHaveText('11:05');
    await expect(globePage.labelIconOf('Chloé Martin')).toHaveCount(0);
    await expect(globePage.labelOf('Lena Fischer')).toHaveText('15:05');
  });

  test('a teammate who does not share their weather shows their local time and status, and none', async ({
    api,
    globePage,
  }) => {
    // Given Ahmed has turned off "Share my local weather" and still shares his status
    api.answer(
      'GET',
      NORTHWIND_PINS,
      northwindPinsWhere((pin) =>
        pin.name === 'Ahmed Al-Sayed' ? { ...pin, weather: null, weatherState: 'NotShared' } : pin,
      ),
    );

    // When Sofia opens the Globe
    await globePage.open();

    // Then his pin gives his local time and status and no weather, his label the time alone,
    // while Priya's beside it keeps hers
    await expect(globePage.pin('Ahmed Al-Sayed')).toHaveAccessibleName(
      'Ahmed Al-Sayed, Dubai, 18:05, Evening',
    );
    await expect(globePage.labelOf('Ahmed Al-Sayed')).toHaveText('18:05');
    await expect(globePage.pin('Priya Raman')).toHaveAccessibleName(
      'Priya Raman, Bengaluru, 19:35, Evening, Stormy 27°',
    );
  });
});
