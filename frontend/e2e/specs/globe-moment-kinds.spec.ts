// Acceptance Test
// Traces to: L2-022, L2-021, L2-024, L2-010, L2-031
// Description: Only the kinds of moment the viewer chose mark pins and fill "This week around the world"; with every kind off no pin is marked, the legend leaves out "Moment this week" and the panel says so; another teammate's choice changes nothing

import { expect, test } from '../fixtures/test';
import { idOf, NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { momentOf, NORTHWIND_MOMENTS, northwindMoments } from '../fixtures/moments';
import { NORTHWIND_ME, SOFIA_PROFILE } from '../fixtures/profile';
import { mockMarkup } from '../support/mocks';
import { chooseKinds, NORTHWIND_MEMBERSHIP, rememberTeam } from '../support/membership';

/** A race for Kwame alone, and a race and a fixture for Mara, this week; Liam's holiday today. */
const MOMENTS = [
  momentOf('Liam O’Connor', 'holiday', '2025-10-27', 'October Bank Holiday', ''),
  momentOf('Kwame Mensah', 'formula-1', '2025-10-30', 'Grand Prix screening', ''),
  momentOf('Mara Lindqvist', 'sport', '2025-10-31', 'AIK at home', ''),
  momentOf('Mara Lindqvist', 'formula-1', '2025-11-01', 'Race weekend', ''),
];

/** The quiet mock's note, its parts as text. */
function quietNote(): { strong: string; text: string; link: string } {
  const note = /<div class="panel__note">[\s\S]*?<\/svg><div>([\s\S]*?)<\/div><\/div>/.exec(
    mockMarkup('pages/globe/quiet.html'),
  )![1];
  return {
    strong: /<strong>([^<]*)<\/strong>/.exec(note)![1],
    text: /<\/strong>([^<]*)<a/.exec(note)![1].trim(),
    link: /<a[^>]*>([^<]*)<\/a>/.exec(note)![1],
  };
}

test.describe('Globe: only the kinds the viewer chose', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ api }) => {
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    api.answer('GET', NORTHWIND_MOMENTS, northwindMoments(MOMENTS));
  });

  test('with Formula 1 turned off, a race alone marks no pin and leaves the week, and a pin counts only the kinds on', async ({
    globePage,
    page,
  }) => {
    // Given Sofia has turned off "Formula 1 race weekends"
    await rememberTeam(page);
    await chooseKinds(page, ['holiday', 'local-event', 'sport']);
    await globePage.open();
    await expect(globePage.markerOf('Liam O’Connor')).toBeVisible();

    // Then Kwame, whose only moment this week is a race, carries no marker, and the race is not in
    // "This week around the world"
    await expect(globePage.markerOf('Kwame Mensah')).toHaveCount(0);
    await expect(globePage.pin('Kwame Mensah')).toHaveAccessibleName(
      'Kwame Mensah, Accra, 14:05, Working hours, Clear 30°',
    );
    await expect(globePage.weekRows).toHaveCount(2);
    await expect(globePage.weekRow('Grand Prix screening')).toHaveCount(0);
    await expect(globePage.weekRow('Race weekend')).toHaveCount(0);

    // And Mara, with a fixture and a race, carries the fixture's icon and no count
    await expect(globePage.markerOf('Mara Lindqvist')).not.toHaveClass(/moment-marker--count/);
    await expect(globePage.pin('Mara Lindqvist')).toHaveAccessibleName(
      'Mara Lindqvist, Stockholm, 15:05, Working hours, Cloudy 6°, AIK at home, in 4 days',
    );
  });

  test('with every kind off, no pin is marked, the legend leaves out "Moment this week", and the panel says so', async ({
    api,
    globePage,
    profilePage,
    page,
  }) => {
    // Given Sofia has turned every kind off
    await rememberTeam(page);
    await chooseKinds(page, []);
    await globePage.open();
    await expect(globePage.weekNote).toBeVisible();

    // Then no pin carries a marker
    await expect(globePage.pin('Liam O’Connor')).toBeVisible();
    await expect(globePage.allMarkers).toHaveCount(0);

    // And the legend is pages/globe/quiet's, with no "Moment this week" (over the still picture
    // its last entry says why the globe is still)
    await expect(globePage.legendEntries).toHaveText([
      'Night side',
      /Teammates close together/,
      /Still view/,
    ]);

    // And the week's lead, rows and "All moments" give way to the quiet mock's note
    const note = quietNote();
    await expect(globePage.weekNoteTitle).toHaveText(note.strong);
    await expect(globePage.weekNote).toContainText(note.text);
    await expect(globePage.chooseMoments).toHaveText(note.link);
    await expect(globePage.chooseMoments).toHaveAttribute('href', '/profile');
    await expect(globePage.weekLead).toHaveCount(0);
    await expect(globePage.weekRows).toHaveCount(0);
    await expect(globePage.allMoments).toHaveCount(0);

    // When "Choose moments" is used, it leads to Profile & Settings
    api.answer('GET', NORTHWIND_ME, SOFIA_PROFILE);
    await globePage.chooseMoments.click();
    await expect(page).toHaveURL('/profile');
    await expect(profilePage.title).toHaveText('Your pin');
  });

  test('a choice Sofia made in this browser changes nothing for Luca', async ({
    globePage,
    page,
  }) => {
    // Given Sofia turned every kind off, and Luca now has the team in this browser
    await rememberTeam(page, { ...NORTHWIND_MEMBERSHIP, teammateId: idOf('Luca Ferri') });
    await chooseKinds(page, []);
    await globePage.open();

    // Then Luca sees every kind mark the pins and fill the week, as they would for anyone
    await expect(globePage.markerOf('Liam O’Connor')).toBeVisible();
    await expect(globePage.markerOf('Kwame Mensah')).toBeVisible();
    await expect(globePage.markerOf('Mara Lindqvist')).toHaveText('2');
    await expect(globePage.weekRows).toHaveCount(4);
    await expect(globePage.legendEntries).toHaveCount(4);
  });
});
