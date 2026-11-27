// Acceptance Test
// Traces to: L2-026, L2-007, L2-016, L2-018, L2-019, L2-020, L2-054, L2-025
// Description: The Team screen lists everyone west to east as pages/team/default does, each row with its city, local time, offset, weather and next moment, and a row opens the Globe with that teammate selected

import { expect, test } from '../fixtures/test';
import { idOf, NORTHWIND_PINS, northwindPins, northwindPinsWhere } from '../fixtures/pins';
import { NORTHWIND_MOMENTS, northwindMoments } from '../fixtures/moments';
import { mockComingUp, mockMarkup, mockTeamRows } from '../support/mocks';
import { rememberTeam } from '../support/membership';
import { fitsItsWidth } from '../support/layout';

test.describe('Team: everyone, west to east', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ page }) => {
    await rememberTeam(page);
  });

  test('reads as the default mock does, row by row, from 768 px', async ({ api, teamPage }) => {
    // Given Northwind's thirteen at 14:05 UTC, seen by Sofia in Milan, and the cast's moments
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());

    // When the Team screen is opened
    await teamPage.open();

    // Then it is headed as the mock heads it, and the header marks Team as the screen shown
    await expect(teamPage.title).toHaveText('Where everyone is in their day');
    await expect(teamPage.lead).toHaveText('13 teammates · 12 time zones · live');
    await expect(teamPage.teamLink).toHaveAttribute('aria-current', 'page');
    await expect(teamPage.listHeading).toHaveText('Everyone, west to east');

    // And the table has the mock's columns and caption
    await expect(teamPage.caption).toHaveText('Everyone, west to east');
    await expect(teamPage.columns).toHaveText([
      'Person',
      'Location',
      'Local time',
      'Compared to you',
      'Weather',
      'Coming up',
    ]);

    // And every row is the mock's, in its order: Mexico City, Austin, São Paulo, Dublin, … Tokyo, Melbourne
    const expected = mockTeamRows('pages/team/default.html');
    const comingUp = mockComingUp('pages/team/default.html');
    await expect(teamPage.rows).toHaveCount(expected.length);
    for (const [index, mock] of expected.entries()) {
      const row = teamPage.rows.nth(index);
      await expect(teamPage.cells(row).link).toHaveText(mock.name);
      await expect(teamPage.cells(row).status).toHaveText(mock.status ?? '');
      await expect(teamPage.cells(row).location).toHaveText(mock.city + mock.country);
      await expect(teamPage.cells(row).time).toHaveText(mock.time);
      await expect(teamPage.cells(row).offset).toHaveText(mock.offset);
      await expect(teamPage.cells(row).weather).toHaveText(mock.degrees);
      // The weather icon is read as its word (L2-018) and drawn as the mock draws it
      const icon = teamPage.cells(row).weatherIcon;
      await expect(icon).toHaveAttribute('role', 'img');
      await expect(icon).toHaveAccessibleName(mock.weatherName!);
      expect(await teamPage.weatherIconShapes(row)).toEqual(mock.weatherIcon);
      // "Coming up" is the next moment's kind icon, named by its kind, its title and when: "Today",
      // "In 5 days", "In 7 days" for Noah's Melbourne Cup, then "9 Nov" (L2-020, L2-026)
      const next = comingUp.get(mock.name)!;
      await expect(teamPage.cells(row).momentIcon).toHaveAccessibleName(next.iconName!);
      expect(await teamPage.momentIconShapes(row)).toEqual(next.icon);
      await expect(teamPage.cells(row).momentTitle).toHaveText(next.title);
      await expect(teamPage.cells(row).momentWhen).toHaveText(next.when);
    }

    // And the viewer's row says "(you)" and gives no offset, named "You"
    const sofia = teamPage.row('Sofia Bianchi');
    await expect(teamPage.cells(sofia).you).toHaveText('(you)');
    await expect(teamPage.cells(sofia).offsetDash).toHaveAccessibleName('You');

    // And no postal code is anywhere on the screen (L2-007)
    await expect(teamPage.main).not.toContainText('20121');
  });

  test('under 768 px a row gives the name, status, local time and city with the offset', async ({
    api,
    teamPage,
    page,
  }) => {
    // Given a phone 390 px wide, and the cast's moments
    await page.setViewportSize({ width: 390, height: 844 });
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());
    await teamPage.open();

    // Then Tomás's row reads "Tomás Herrera", "Early morning", "08:05" and "Mexico City · 7h behind" (L2-016)
    const tomas = teamPage.cells(teamPage.row('Tomás Herrera'));
    await expect(tomas.link).toBeVisible();
    await expect(tomas.status).toHaveText('Early morning');
    await expect(tomas.time).toHaveText('08:05');
    await expect(tomas.phone).toHaveText('Mexico City · 7h behind');
    await expect(teamPage.cells(teamPage.row('Sofia Bianchi')).phone).toHaveText('Milan');

    // And his next moment, "Día de Muertos · In 5 days", under them
    await expect(tomas.moment).toBeVisible();
    await expect(tomas.momentTitle).toHaveText('Día de Muertos');
    await expect(tomas.momentWhen).toHaveText('· In 5 days');

    // And the table's other columns are not shown
    for (const hidden of [tomas.location, tomas.offset, tomas.weather])
      await expect(hidden).toBeHidden();
    await expect(teamPage.columns.first()).toBeHidden();

    // And the page does not scroll sideways
    expect(await fitsItsWidth(page)).toBe(true);
  });

  test('a row chosen by pointer or keyboard opens the Globe with that teammate selected', async ({
    api,
    teamPage,
    globePage,
    page,
  }) => {
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await teamPage.open();

    // A row is one link, to the Globe with that pin selected
    const tomas = teamPage.link(teamPage.row('Tomás Herrera'));
    await expect(tomas).toHaveAttribute('href', `/globe?teammate=${idOf('Tomás Herrera')}`);

    // With no moment found for him, "Coming up" is a dash named in words (L2-026 criterion 4)
    await expect(
      teamPage.cells(teamPage.row('Tomás Herrera')).nothingComingUp,
    ).toHaveAccessibleName('Nothing coming up');

    // When Tomás's row is clicked anywhere, the Globe opens with his panel
    await teamPage.row('Tomás Herrera').click();
    await expect(page).toHaveURL(`/globe?teammate=${idOf('Tomás Herrera')}`);
    await expect(globePage.personName).toHaveText('Tomás Herrera');

    // And back on Team, a row reached by keyboard and chosen with Enter does the same
    await page.goBack();
    await teamPage.link(teamPage.row('Noah Williams')).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(`/globe?teammate=${idOf('Noah Williams')}`);
    await expect(globePage.personName).toHaveText('Noah Williams');
  });

  test('a viewer in °F on the 12-hour clock reads the rows in theirs', async ({
    api,
    teamPage,
  }) => {
    // Given Sofia's pin is in a country that reads °F and the 12-hour clock
    api.answer(
      'GET',
      NORTHWIND_PINS,
      northwindPinsWhere((pin) => (pin.isViewer ? { ...pin, country: 'United States' } : pin)),
    );
    await teamPage.open();

    // Then Milan's 13 °C reads "55°" and its time "3:05 pm", as pages/team/edge does (L2-019)
    const luca = teamPage.row('Luca Ferri');
    await expect(teamPage.cells(luca).weather).toHaveText('55°');
    await expect(teamPage.cells(luca).time).toHaveText('3:05 pm');
    expect(mockMarkup('pages/team/edge.html')).toContain('55°</span>');
  });

  test('"Invite teammate" in the header opens the invite dialog on Team', async ({
    api,
    teamPage,
    inviteDialog,
  }) => {
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await teamPage.open();
    await expect(teamPage.rows).toHaveCount(13);

    await teamPage.inviteTeammate.click();
    await expect(inviteDialog.title).toHaveText('Invite teammates to Northwind');
  });
});
