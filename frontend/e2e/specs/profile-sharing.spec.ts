// Acceptance Test
// Traces to: L2-034, L2-022, L2-035
// Description: The viewer turns off what teammates see and the kinds that mark pins, by keyboard and by pointer; each switch says what its state means, both off adds a note, a save sends them and her own pin card says she still sees what teammates do not; every kind off brings the Globe's note and legend

import type { Request } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import { momentOf, NORTHWIND_MOMENTS, northwindMoments } from '../fixtures/moments';
import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { NORTHWIND_ME, SOFIA_SETTINGS, sofiaProfile } from '../fixtures/profile';
import { rememberTeam } from '../support/membership';

test.describe('Profile & Settings: moments on the globe and what teammates see', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ api, page }) => {
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    api.answer('GET', NORTHWIND_ME, sofiaProfile());
  });

  test('both sharing switches and "Big sporting days" off, as profile/sharing-off draws them, and saved', async ({
    api,
    page,
    profilePage,
  }) => {
    // Given Sofia's switches are all on, each a switch saying so and what it means
    await profilePage.open();
    const sport = profilePage.kindSwitch('Big sporting days');
    for (const label of [
      'Public holidays',
      'Formula 1 race weekends',
      'Local events and festivals',
      'Big sporting days',
    ])
      await expect(profilePage.kindSwitch(label)).toHaveAttribute('aria-checked', 'true');
    await expect(profilePage.shareWeather).toHaveAttribute('aria-checked', 'true');
    await expect(profilePage.stateOf(profilePage.shareWeather)).toHaveText('On');
    await expect(profilePage.hintOf(profilePage.shareWeather)).toHaveText(
      'Shown on your pin and in your panel.',
    );
    await expect(profilePage.hintOf(profilePage.shareStatus)).toHaveText(
      'Worked out from your local time — 09:00 to 18:00 counts as working.',
    );
    await expect(profilePage.sharingNote).toHaveCount(0);
    await expect(profilePage.note).toHaveCount(1);

    // When she turns off "Share my local weather" with Space, the line says what teammates see
    await profilePage.shareWeather.focus();
    await page.keyboard.press('Space');
    await expect(profilePage.shareWeather).toHaveAttribute('aria-checked', 'false');
    await expect(profilePage.stateOf(profilePage.shareWeather)).toHaveText('Off');
    await expect(profilePage.hintOf(profilePage.shareWeather)).toHaveText(
      'Teammates see your local time and no weather.',
    );
    await expect(profilePage.sharingNote).toHaveCount(0);
    await expect(profilePage.saveBar).toHaveText(/You have unsaved changes/);

    // And "Share whether I’m working or asleep" with Enter, the note says teammates see only the rest
    await profilePage.shareStatus.focus();
    await page.keyboard.press('Enter');
    await expect(profilePage.shareStatus).toHaveAttribute('aria-checked', 'false');
    await expect(profilePage.hintOf(profilePage.shareStatus)).toHaveText(
      'Teammates see no status for you, at any hour.',
    );
    await expect(profilePage.sharingNote).toHaveText(
      'Teammates will see only your name, city and local time.',
    );

    // And "Big sporting days" by pointer, its emblem out of the moment colour
    await sport.click();
    await expect(sport).toHaveAttribute('aria-checked', 'false');
    await expect(profilePage.emblemOf(sport)).toHaveClass(/emblem--plain/);

    // Then nothing is applied yet: her pin card does not say teammates miss anything
    await expect(profilePage.note).toHaveCount(1);

    // When she saves, the switches are sent and nothing else
    const saves: Request[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === NORTHWIND_ME && request.method() === 'PUT')
        saves.push(request);
    });
    const saved = {
      momentKinds: ['holiday', 'formula-1', 'local-event'],
      sharesWeather: false,
      sharesStatus: false,
    };
    api.answer('PUT', NORTHWIND_ME, sofiaProfile(saved));
    await profilePage.saveChanges.click();

    // Then her pin card says she still sees her own weather and status, and teammates don’t
    await expect(profilePage.note.nth(1)).toHaveText(
      'You still see your own weather and status. Teammates don’t.',
    );
    expect(saves[0].postDataJSON()).toEqual({ settings: { ...SOFIA_SETTINGS, ...saved } });
    await expect(profilePage.sharingNote).toBeVisible();
  });

  test('every kind turned off here brings the Globe’s note and its legend without "Moment this week"', async ({
    api,
    globePage,
    profilePage,
  }) => {
    // Given Liam has a holiday today, which marks his pin
    api.answer(
      'GET',
      NORTHWIND_MOMENTS,
      northwindMoments([
        momentOf('Liam O’Connor', 'holiday', '2025-10-27', 'October Bank Holiday', ''),
      ]),
    );

    // When Sofia turns every kind off on Profile & Settings and saves
    await profilePage.open();
    for (const label of [
      'Public holidays',
      'Formula 1 race weekends',
      'Local events and festivals',
      'Big sporting days',
    ])
      await profilePage.kindSwitch(label).click();
    api.answer('PUT', NORTHWIND_ME, sofiaProfile({ momentKinds: [] }));
    await profilePage.saveChanges.click();
    await expect(profilePage.saveBar).toContainText('Saved');

    // Then on the Globe no pin is marked, the legend has no "Moment this week", and the week says why
    await globePage.navigationLinks.filter({ hasText: 'Globe' }).click();
    await expect(globePage.pin('Liam O’Connor')).toBeVisible();
    await expect(globePage.allMarkers).toHaveCount(0);
    await expect(globePage.legend).not.toContainText('Moment this week');
    await expect(globePage.weekNoteTitle).toHaveText('Every kind of moment is switched off');
    await expect(globePage.chooseMoments).toHaveAttribute('href', '/profile');
  });
});
