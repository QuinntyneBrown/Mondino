// Acceptance Test
// Traces to: L2-013, L2-023, L2-042
// Description: A selected group pin's panel says how many teammates are close together and where, lists them city by city with each city's local time, and choosing one selects their pin; close and Escape clear the group

import { expect, test } from '../fixtures/test';
import { idOf, NORTHWIND_PINS, northwindPins, northwindPinsWhere } from '../fixtures/pins';
import { mockMarkup } from '../support/mocks';
import { rememberTeam } from '../support/membership';

test.describe('Globe: a group pin’s panel', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ page }) => {
    await rememberTeam(page);
  });

  test('Sofia and Luca’s group pin lists them under Milan, and choosing Luca selects his pin', async ({
    api,
    globePage,
    page,
  }) => {
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    const mock = mockMarkup('pages/globe/group.html');
    await globePage.open();

    // When the group pin at Milan is selected
    await globePage.pin('2 teammates close together').click();

    // Then the panel is pages/globe/group's, announced once
    await expect(globePage.panel).toHaveAccessibleName('2 teammates close together');
    await expect(globePage.groupTitle).toHaveText('2 teammates close together');
    await expect(globePage.groupLead).toHaveText('All in Milan · pick someone to see their pin');
    expect(mock).toContain('All in Milan · pick someone to see their pin');
    await expect(globePage.groupCityNames).toHaveText(['Milan']);
    await expect(globePage.groupCityTimes).toHaveText(['15:05']);
    await expect(globePage.groupRows).toHaveText(['Sofia Bianchi (you)', 'Luca Ferri']);
    await expect(globePage.announcement).toHaveText('2 teammates close together.');
    await expect(globePage.pin('2 teammates close together')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page).toHaveURL(/\/globe$/);

    // And choosing Luca opens his panel, his pin standing alone and selected
    await globePage.groupRow('Luca Ferri').click();
    await expect(globePage.personName).toHaveText('Luca Ferri');
    expect(globePage.address()).toBe(`/globe?teammate=${idOf('Luca Ferri')}`);
    await expect(globePage.pin('Luca Ferri')).toHaveAttribute('aria-pressed', 'true');
    await expect(globePage.pin('Sofia Bianchi (you)')).toHaveAttribute('aria-pressed', 'false');
  });

  test('a group in three cities says so, the city with the most teammates first', async ({
    api,
    globePage,
  }) => {
    // Given Lena and Liam pinned close to Milan, still in Berlin and Dublin
    api.answer(
      'GET',
      NORTHWIND_PINS,
      northwindPinsWhere((pin) =>
        pin.name === 'Lena Fischer' || pin.name === 'Liam O’Connor'
          ? {
              ...pin,
              position: { latitude: 45.6, longitude: pin.name === 'Lena Fischer' ? 9.4 : 9.0 },
            }
          : pin,
      ),
    );
    await globePage.open();

    await globePage.pin('4 teammates close together').click();

    await expect(globePage.groupTitle).toHaveText('4 teammates close together');
    await expect(globePage.groupLead).toHaveText('3 cities · pick someone to see their pin');
    await expect(globePage.groupCityNames).toHaveText(['Milan', 'Dublin', 'Berlin']);
    await expect(globePage.groupCityTimes).toHaveText(['15:05', '14:05', '15:05']);
  });

  test('the close button and Escape clear the group; from the keyboard focus goes and comes back', async ({
    api,
    globePage,
    page,
  }) => {
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await globePage.open();
    await expect(globePage.pinButtons).toHaveCount(8);

    // Chosen from the keyboard, the group's heading takes focus
    await globePage.pin('2 teammates close together').focus();
    await page.keyboard.press('Enter');
    await expect(globePage.groupTitle).toBeFocused();

    // Escape clears the group and gives focus back to the group pin
    await page.keyboard.press('Escape');
    await expect(globePage.group).toHaveCount(0);
    await expect(globePage.pin('2 teammates close together')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect(globePage.pin('2 teammates close together')).toBeFocused();

    // And the close button, "Close", does the same
    await globePage.pin('2 teammates close together').click();
    await globePage.closePanel.click();
    await expect(globePage.group).toHaveCount(0);
    await expect(globePage.pin('2 teammates close together')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
