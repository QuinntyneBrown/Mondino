// Acceptance Test
// Traces to: L2-033, L2-019, L2-035
// Description: The viewer chooses °F and the 12-hour clock in Display and saves; every time, overlap and temperature on the Globe and Team follows, on a later day too; a choice changed back leaves nothing to save

import type { Request } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import { idOf, NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { NORTHWIND_ME, SOFIA_SETTINGS, sofiaProfile } from '../fixtures/profile';
import { rememberTeam } from '../support/membership';

test.describe('Profile & Settings: display', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ api, page }) => {
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    api.answer('GET', NORTHWIND_ME, sofiaProfile());
  });

  test('°F and the 12-hour clock, saved, are what every screen shows, and still are the next day', async ({
    api,
    globePage,
    page,
    profilePage,
    teamPage,
  }) => {
    // Given Sofia in Milan, whose settings are her country's: °C and the 24-hour clock
    await profilePage.open();
    const celsius = profilePage.option(profilePage.temperature, '°C');
    const fahrenheit = profilePage.option(profilePage.temperature, '°F');
    const twentyFour = profilePage.option(profilePage.clock, '24-hour');
    const twelve = profilePage.option(profilePage.clock, '12-hour');

    // Then each choice is a radio group whose chosen option is checked and carries a tick, not a colour alone
    await expect(celsius).toHaveAttribute('aria-checked', 'true');
    await expect(fahrenheit).toHaveAttribute('aria-checked', 'false');
    await expect(twentyFour).toHaveAttribute('aria-checked', 'true');
    await expect(profilePage.tick(celsius)).toBeVisible();
    await expect(profilePage.tick(fahrenheit)).toBeHidden();
    await expect(profilePage.time).toHaveText('15:05 local · Central European Time');
    await expect(profilePage.saveBar).toHaveCount(0);

    // When she chooses °F, then °C again, nothing is left to save
    await fahrenheit.click();
    await expect(fahrenheit).toHaveAttribute('aria-checked', 'true');
    await expect(profilePage.tick(fahrenheit)).toBeVisible();
    await expect(profilePage.saveBar).toHaveText(/You have unsaved changes\s*Save changes/);
    await celsius.click();
    await expect(profilePage.saveBar).toHaveCount(0);

    // When she chooses °F with the mouse and the 12-hour clock with the arrow key
    await fahrenheit.click();
    await twentyFour.focus();
    await page.keyboard.press('ArrowRight');
    await expect(twelve).toHaveAttribute('aria-checked', 'true');
    await expect(twelve).toBeFocused();

    // And saves, only the settings are sent, and nothing changes before the save answers
    const saves: Request[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === NORTHWIND_ME && request.method() === 'PUT')
        saves.push(request);
    });
    const save = api.hold('PUT', NORTHWIND_ME);
    await profilePage.saveChanges.click();
    await expect(profilePage.saveBar).toContainText('Saving…');
    expect(saves[0].postDataJSON()).toEqual({
      settings: { ...SOFIA_SETTINGS, temperatureUnit: 'fahrenheit', clockFormat: '12-hour' },
    });
    await expect(profilePage.time).toHaveText('15:05 local · Central European Time');
    const chosen = sofiaProfile({ temperatureUnit: 'fahrenheit', clockFormat: '12-hour' });
    save.release(chosen);

    // Then her own local time is on the 12-hour clock
    await expect(profilePage.time).toHaveText('3:05 pm local · Central European Time');

    // And on the Globe, without a reload, every time, temperature and overlap follows, as
    // globe/fahrenheit-12-hour draws Chloé
    await globePage.navigationLinks.filter({ hasText: 'Globe' }).click();
    await expect(globePage.pin('Chloé Martin')).toHaveAccessibleName(
      'Chloé Martin, São Paulo, 11:05 am, Working hours, Showers 79°',
    );
    await globePage.pin('Chloé Martin').click();
    await expect(globePage.personClock).toHaveText('11:05 am');
    await expect(globePage.personTemperature).toHaveText('79°F');
    await expect(globePage.overlapWhen).toHaveText('1 pm–6 pm your time');

    // And on Team, Tomás's row
    await globePage.navigationLinks.filter({ hasText: 'Team' }).click();
    await expect(teamPage.row('Tomás Herrera')).toContainText('8:05 am');
    await expect(teamPage.row('Tomás Herrera')).toContainText('72°');

    // When she comes back the next day, before anything has answered the profile, both choices hold
    await page.clock.setSystemTime(new Date('2025-10-28T14:05:00Z'));
    await globePage.openAt(idOf('Tomás Herrera'));
    await expect(globePage.personClock).toHaveText('8:05 am');
    await expect(globePage.personTemperature).toHaveText('72°F');
    await expect(globePage.overlapWhen).toHaveText('4 pm–6 pm your time');

    // And Profile & Settings reads them back from the backend
    api.answer('GET', NORTHWIND_ME, chosen);
    await profilePage.open();
    await expect(fahrenheit).toHaveAttribute('aria-checked', 'true');
    await expect(twelve).toHaveAttribute('aria-checked', 'true');
  });
});
