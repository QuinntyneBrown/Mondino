// Acceptance Test
// Traces to: L2-026, L2-027, L2-049, L2-054, L2-034, L2-044
// Description: Team while it loads, when it fails, for a team of one, without the weather, for a teammate who shares less, and with names that are markup, long or one word

import { expect, test } from '../fixtures/test';
import {
  NORTHWIND_PINS,
  northwindPins,
  northwindPinsOf,
  northwindPinsWhere,
} from '../fixtures/pins';
import { rememberTeam } from '../support/membership';

const markup = '<img src=x onerror=alert(1)>';
const longName = 'Maximiliana Alexandra Oyelaran-Fitzgerald';

test.describe('Team: its states', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ page }) => {
    await rememberTeam(page);
  });

  test('while the team is read it shows the loading placeholder, announced as "Loading team…"', async ({
    api,
    teamPage,
  }) => {
    // Given the pins have not come back yet
    const pins = api.hold('GET', NORTHWIND_PINS);
    await teamPage.open();

    // Then the screen is headed, busy, and draws the placeholder of pages/team/loading
    await expect(teamPage.title).toHaveText('Where everyone is in their day');
    await expect(teamPage.main).toHaveAttribute('aria-busy', 'true');
    await expect(teamPage.loading).toHaveAttribute('aria-label', 'Loading team');
    await expect(teamPage.loadingAnnouncement).toHaveText('Loading team…');

    // When they come back, the list takes its place
    pins.release(northwindPins());
    await expect(teamPage.rows).toHaveCount(13);
    await expect(teamPage.loading).toHaveCount(0);
    await expect(teamPage.main).not.toHaveAttribute('aria-busy', 'true');
  });

  test('when the team cannot be read it says so, and "Try again" reads it again', async ({
    api,
    teamPage,
    page,
  }) => {
    // Given Mondino does not answer
    api.answer('GET', NORTHWIND_PINS, { unanswered: true });
    await teamPage.open();

    // Then the screen is pages/team/error
    await expect(teamPage.errorTitle).toHaveText('The team didn’t load');
    await expect(teamPage.errorTitle).toHaveRole('heading');
    await expect(teamPage.errorText).toHaveText(
      'We couldn’t reach Mondino. Check your connection and try again.',
    );
    await expect(teamPage.backToGlobe).toHaveAttribute('href', '/globe');

    // When Mondino answers again and "Try again" is used, the team is shown
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await teamPage.tryAgain.click();
    await expect(teamPage.rows).toHaveCount(13);
    await expect(teamPage.error).toHaveCount(0);
    await expect(page).toHaveURL('/team');
  });

  test('a team of one shows the viewer’s own hour and the card that invites the team', async ({
    api,
    teamPage,
    inviteDialog,
  }) => {
    // Given Sofia is the only teammate, as pages/team/empty
    api.answer('GET', NORTHWIND_PINS, northwindPinsOf('Sofia Bianchi'));
    await teamPage.open();

    // Then the heading, the ribbon and the card are the mock's
    await expect(teamPage.lead).toHaveText('Just you · 1 time zone · live');
    await expect(teamPage.markers).toHaveCount(1);
    await expect(teamPage.marker('Sofia Bianchi, 15:05')).toBeVisible();
    await expect(teamPage.invitePromptTitle).toHaveText('It’s just you on Northwind so far');
    await expect(teamPage.invitePromptTitle).toHaveRole('heading');
    await expect(teamPage.invitePromptText).toHaveText(
      'This list fills up west to east as teammates join with the invite link.',
    );

    // And there is no filter and no table
    await expect(teamPage.filters).toHaveCount(0);
    await expect(teamPage.table).toHaveCount(0);

    // When "Invite teammates" is used, the invite dialog opens (L2-054)
    await teamPage.inviteTeammates.click();
    await expect(inviteDialog.title).toHaveText('Invite teammates to Northwind');
  });

  test('without the weather every local time is still shown, and a warning says why', async ({
    api,
    teamPage,
  }) => {
    // Given the weather source is down, as pages/team/weather-unavailable
    api.answer(
      'GET',
      NORTHWIND_PINS,
      northwindPinsWhere((pin) => ({ ...pin, weather: null, weatherState: 'Unavailable' })),
    );
    await teamPage.open();

    // Then a polite warning says so above the list
    await expect(teamPage.weatherAlert).toHaveRole('status');
    await expect(teamPage.weatherAlert).toHaveText(
      'Weather is unavailable right now. Local times are still right.',
    );

    // And each row keeps its local time, its weather a mark named "Weather unavailable"
    await expect(teamPage.rows).toHaveCount(13);
    const tomas = teamPage.cells(teamPage.row('Tomás Herrera'));
    await expect(tomas.time).toHaveText('08:05');
    await expect(tomas.weatherIcon).toHaveAccessibleName('Weather unavailable');
  });

  test('a teammate who shares neither status nor weather has neither in their row, and is still on the ribbon', async ({
    api,
    teamPage,
  }) => {
    // Given Ahmed has turned off both, as pages/team/sharing-off
    api.answer(
      'GET',
      NORTHWIND_PINS,
      northwindPinsWhere((pin) =>
        pin.name === 'Ahmed Al-Sayed'
          ? { ...pin, sharesStatus: false, weather: null, weatherState: 'NotShared' }
          : pin,
      ),
    );
    await teamPage.open();

    // Then his row has no status, no status dot, and a dash named "Weather not shared"
    const ahmed = teamPage.cells(teamPage.row('Ahmed Al-Sayed'));
    await expect(ahmed.time).toHaveText('18:05');
    await expect(ahmed.status).toHaveCount(0);
    await expect(ahmed.dot).toHaveCount(0);
    await expect(ahmed.weatherDash).toHaveAccessibleName('Weather not shared');

    // And no warning is shown, since the weather is not unavailable
    await expect(teamPage.weatherAlert).toHaveCount(0);

    // And he is still placed on the ribbon at his local hour (L2-027)
    await expect(teamPage.marker('Ahmed Al-Sayed, 18:05')).toBeVisible();
  });

  test('a name typed as markup, a long name and a one-word name are shown as their characters', async ({
    api,
    teamPage,
  }) => {
    // Given the names of pages/team/edge
    const pins = northwindPinsOf('Sofia Bianchi', 'Lena Fischer', 'Mara Lindqvist', 'Luca Ferri');
    const others = (pins.json as { pins: { name: string; isViewer: boolean }[] }).pins.filter(
      (pin) => !pin.isViewer,
    );
    const names = [markup, longName, 'Björk'];
    for (const [index, name] of names.entries()) others[index].name = name;
    api.answer('GET', NORTHWIND_PINS, pins);
    await teamPage.open();

    // Then each row and each marker gives the name as typed, and nothing is drawn from it
    for (const name of names) {
      await expect(teamPage.cells(teamPage.row(name)).link).toHaveText(name);
      // Berlin, Stockholm and Milan are all at 15:05
      await expect(teamPage.marker(`${name}, 15:05`)).toHaveCount(1);
    }
    await expect(teamPage.images).toHaveCount(0);

    // And the long name, which may be cut short, is given whole as its tooltip
    await expect(teamPage.cells(teamPage.row(longName)).link).toHaveAttribute('title', longName);
  });
});
