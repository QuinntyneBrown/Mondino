// Acceptance Test
// Traces to: L2-011, L2-012, L2-013, L2-040, L2-043, L2-044
// Description: The Globe shows the team's pins as a list of buttons: initials in each teammate's colour, the viewer's own marked, two in one city as one group pin, the far side hidden

import { expect, test } from '../fixtures/test';
import { northwindPins, NORTHWIND_PINS, northwindPinsOf } from '../fixtures/pins';
import { rememberTeam } from '../support/membership';

test.describe('Globe: the team’s pins', () => {
  test.beforeEach(async ({ page }) => {
    // The globe holds still at its starting orientation, Europe and Africa at the front
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await rememberTeam(page);
  });

  test('each teammate facing the viewer is a pin, west to east, named for a screen reader', async ({
    api,
    globePage,
  }) => {
    // Given Northwind's thirteen teammates
    api.answer('GET', NORTHWIND_PINS, northwindPins());

    // When Sofia opens the Globe
    await globePage.open();

    // Then the pins facing the viewer are a list of buttons, from west to east, each named by
    // its teammate, city, local time and status; Sofia and Luca, both in Milan, are one group pin "2"
    await expect(globePage.pinButtons).toHaveCount(8);
    expect(await globePage.pinNames()).toEqual([
      'Chloé Martin, São Paulo, 11:05, Working hours',
      'Liam O’Connor, Dublin, 14:05, Working hours',
      'Kwame Mensah, Accra, 14:05, Working hours',
      '2 teammates close together: Sofia Bianchi (you), Luca Ferri',
      'Lena Fischer, Berlin, 15:05, Working hours',
      'Mara Lindqvist, Stockholm, 15:05, Working hours',
      'Ahmed Al-Sayed, Dubai, 18:05, Evening',
      'Priya Raman, Bengaluru, 19:35, Evening',
    ]);
    await expect(globePage.pin('2 teammates')).toHaveText('2');
    await expect(globePage.pin('2 teammates')).toHaveClass(/pin--group/);

    // And each pin shows its teammate's initials in their own colour, none of them pressed
    await expect(globePage.pin('Lena Fischer')).toHaveText('LF');
    await expect(globePage.pin('Lena Fischer')).toHaveClass(/hue-4/);
    await expect(globePage.pin('Liam O’Connor')).toHaveText('LO');
    for (const button of await globePage.pinButtons.all())
      await expect(button).toHaveAttribute('aria-pressed', 'false');

    // And the pins on the far side, Mexico City, Austin, Tokyo and Melbourne, are not drawn
    for (const name of ['Tomás Herrera', 'Jordan Lee', 'Aiko Tanaka', 'Noah Williams'])
      await expect(globePage.pin(name)).toHaveCount(0);
  });

  test('a pin near the rim is drawn fainter and unlabelled, and one turned away is hidden', async ({
    api,
    globePage,
  }) => {
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await globePage.open();
    await expect(globePage.pin('Priya Raman')).toBeVisible();
    await expect(globePage.pinItem('Priya Raman')).not.toHaveClass(/globe__pin--far/);

    // When the globe is dragged east by 52 px, about 25°, Bengaluru is near the rim
    // (it is near the rim from 40 px to 64 px at this size, and turned away from 72 px)
    const priya = globePage.pinItem('Priya Raman');
    await globePage.dragWithTheMouse(52, 0);

    // Then Priya's pin is drawn fainter, without its label, until it is lifted
    await expect(priya).toHaveClass(/globe__pin--far/);
    await expect(globePage.labelOf('Priya Raman')).toHaveCount(0);
    await globePage.pin('Priya Raman').hover();
    await expect(globePage.labelOf('Priya Raman')).toHaveClass(/pin-label--lifted/);

    // And dragged further it is on the far side: not drawn, and not in the list
    await globePage.dragWithTheMouse(60, 0);
    await expect(globePage.pin('Priya Raman')).toHaveCount(0);
  });

  test('the viewer’s own pin is marked "(you)" and by a ring, not by colour alone', async ({
    api,
    globePage,
  }) => {
    // Given a team where Sofia is alone in Milan
    api.answer('GET', NORTHWIND_PINS, northwindPinsOf('Sofia Bianchi', 'Lena Fischer'));

    await globePage.open();

    // Then her pin is named "(you)", and carries the ring of the viewer's own pin, thicker than another's
    const sofia = globePage.pin('Sofia Bianchi (you)');
    await expect(sofia).toHaveAccessibleName('Sofia Bianchi (you), Milan, 15:05, Working hours');
    await expect(sofia).toHaveClass(/pin--you/);
    const ring = (name: string) =>
      globePage.pin(name).evaluate((button) => parseFloat(getComputedStyle(button).borderTopWidth));
    expect(await ring('Sofia Bianchi (you)')).toBeGreaterThan(await ring('Lena Fischer'));
  });

  test('Tab reaches every pin in the list, after the globe', async ({ api, page, globePage }) => {
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await globePage.open();
    await expect(globePage.pinButtons).toHaveCount(8);

    await globePage.globe.focus();
    for (let index = 0; index < 8; index++) {
      await page.keyboard.press('Tab');
      await expect(globePage.pinButtons.nth(index)).toBeFocused();
    }
  });

  test('names typed as markup are shown as their characters on the pins', async ({
    api,
    globePage,
  }) => {
    const markup = '<img src=x onerror=alert(1)>';
    const answer = northwindPinsOf('Sofia Bianchi', 'Lena Fischer');
    const team = answer.json as { pins: { name: string; cityName: string }[] };
    team.pins[0].name = markup;
    api.answer('GET', NORTHWIND_PINS, answer);

    await globePage.open();

    await expect(globePage.pin(markup)).toHaveAccessibleName(
      `${markup}, Berlin, 15:05, Working hours`,
    );
    await expect(globePage.pin(markup)).toHaveText('<S');
    await expect(globePage.images).toHaveCount(0);
  });

  test('a team the session no longer has says an invite link is needed, and is forgotten', async ({
    api,
    page,
    globePage,
    inviteNeededPage,
  }) => {
    // Given a browser that remembers Northwind, whose session has ended
    api.refuse('GET', NORTHWIND_PINS, 401, 'session_required');

    // When the Globe is opened
    await globePage.open();

    // Then it says an invite link is needed, at the same address, and the team is forgotten
    await expect(inviteNeededPage.title).toHaveText('You need an invite link');
    await expect(page).toHaveURL('/globe');
    expect(await page.evaluate(() => localStorage.getItem('mondino.membership'))).toBeNull();
  });

  test('a team that is not the session’s is answered as no team', async ({
    api,
    page,
    globePage,
    inviteNeededPage,
  }) => {
    api.refuse('GET', NORTHWIND_PINS, 404, 'team_not_found');

    await globePage.open();

    await expect(inviteNeededPage.title).toHaveText('You need an invite link');
    expect(await page.evaluate(() => localStorage.getItem('mondino.membership'))).toBeNull();
  });
});
