// Acceptance Test
// Traces to: L2-027, L2-033
// Description: The day ribbon places each teammate at the hour they are living through, as pages/team/default places them, with the day's spans named in words, and a marker opens the Globe with that teammate selected

import { expect, test } from '../fixtures/test';
import { idOf, NORTHWIND_PINS, northwindPins, northwindPinsWhere } from '../fixtures/pins';
import { fitsItsWidth } from '../support/layout';
import { mockMarkers, mockScale } from '../support/mocks';
import { rememberTeam } from '../support/membership';

test.describe('Team: the day ribbon', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ page }) => {
    await rememberTeam(page);
  });

  test('places every teammate as the default mock does, named by their name and local time', async ({
    api,
    teamPage,
  }) => {
    // Given Northwind's thirteen at 14:05 UTC
    api.answer('GET', NORTHWIND_PINS, northwindPins());

    // When the Team screen is opened
    await teamPage.open();

    // Then the ribbon is a region named "The day, hour by hour"
    await expect(teamPage.ribbon).toBeVisible();

    // And its spans are named in words, not by colour alone
    await expect(teamPage.ribbonBands).toHaveText([
      'Night',
      'Morning',
      'Working hours',
      'Evening',
      '',
    ]);

    // And every marker sits where the mock places it, in its row, in the mock's order: Tomás
    // just after 08:00, Liam and Kwame both at 14:05, each in a row of their own
    const expected = mockMarkers('pages/team/default.html');
    expect(await teamPage.markerPlaces()).toEqual(
      expected.map(({ at, row, title }) => ({ at, row, title })),
    );
    await expect(teamPage.markers).toHaveCount(expected.length);
    for (const [index, { name }] of expected.entries())
      await expect(teamPage.markers.nth(index)).toHaveAccessibleName(name);

    // And the hour marks are the mock's, every three hours
    await expect(teamPage.scale).toHaveText(mockScale('pages/team/default.html'));
  });

  test('two teammates at one hour can each be chosen, and open the Globe with them selected', async ({
    api,
    teamPage,
    globePage,
    page,
  }) => {
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await teamPage.open();

    // Given Liam and Kwame, both at 14:05
    const liam = teamPage.marker('Liam O’Connor, 14:05');
    const kwame = teamPage.marker('Kwame Mensah, 14:05');
    await expect(liam).toHaveAttribute('href', `/globe?teammate=${idOf('Liam O’Connor')}`);

    // When Kwame's marker is clicked, the Globe opens with his pin selected
    await kwame.click();
    await expect(page).toHaveURL(`/globe?teammate=${idOf('Kwame Mensah')}`);
    await expect(globePage.personName).toHaveText('Kwame Mensah');

    // And back on Team, Liam's is reached by keyboard and chosen with Enter
    await page.goBack();
    await liam.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(`/globe?teammate=${idOf('Liam O’Connor')}`);
    await expect(globePage.personName).toHaveText('Liam O’Connor');
  });

  test('on the 12-hour clock the hour marks read without minutes, as the edge mock does', async ({
    api,
    teamPage,
  }) => {
    api.answer(
      'GET',
      NORTHWIND_PINS,
      northwindPinsWhere((pin) => (pin.isViewer ? { ...pin, country: 'United States' } : pin)),
    );
    await teamPage.open();

    await expect(teamPage.scale).toHaveText(mockScale('pages/team/edge.html'));
    await expect(teamPage.marker('Tomás Herrera, 8:05 am')).toBeVisible();
  });

  test('under 576 px the ribbon scrolls inside itself and the page does not', async ({
    api,
    teamPage,
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await teamPage.open();
    await expect(teamPage.markers).toHaveCount(13);

    expect(await fitsItsWidth(page)).toBe(true);
    expect(await teamPage.ribbonScrolls()).toBe(true);
    // And the region that scrolls is reached by keyboard
    await expect(teamPage.ribbonScroll).toHaveAttribute('tabindex', '0');
  });
});
