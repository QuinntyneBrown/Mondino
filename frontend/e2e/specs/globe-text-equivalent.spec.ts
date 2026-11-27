// Acceptance Test
// Traces to: L2-040, L2-042, L2-041
// Description: The globe is one labelled group holding the list of pins, each named in full, with its canvas hidden, and the still picture holds the same list; a selection by keyboard, click or address is announced once, politely, and a minute passing announces nothing; under reduced motion a pin selected by keyboard faces the viewer at once; in dark the globe is the same picture a little deeper with a light outline

import { expect, test } from '../fixtures/test';
import { NORTHWIND_MOMENTS, northwindMoments } from '../fixtures/moments';
import { idOf, NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { announcements, listenForAnnouncements } from '../support/accessibility';
import { brightness, coloursAt, placeOnGlobe } from '../support/globe-pixels';
import { rememberTeam } from '../support/membership';
import { pauseTheClock } from '../support/turning';

const tomas =
  'Tomás Herrera, Mexico City, 08:05, Early morning, Partly cloudy 22°, 2 moments this week: Día de Muertos, in 5 days; Clásico Nacional, in 6 days';

const liam = 'Liam O’Connor, Dublin, 14:05, Working hours, Rainy 9°, October Bank Holiday, today';

/** A group's accessibility tree holds a list of pin buttons, a group pin with its count, and nothing else. */
const onlyAListOfPins =
  /^- group "[^"]+":\n {2}- list:\n( {4}- listitem:\n {6}- '?button "[^"]+"( \[pressed\])?'?(: "\d+")?\n?)+$/;

const offCentre = ({ x, y }: { x: number; y: number }) => Math.hypot(x - 50, y - 50);

test.describe('The globe as text', () => {
  test.beforeEach(async ({ api, page }) => {
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());
  });

  test('the 3D globe is one labelled group holding the list of pins, named in full, with its canvas hidden', async ({
    page,
    globePage,
  }) => {
    // Given the Globe, turned to Tomás
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await globePage.openAt(idOf('Tomás Herrera'));
    await expect(globePage.canvas).toBeVisible();

    // Then the globe is one group, named, holding a list of pins and nothing else
    await expect(globePage.globeGroup).toHaveAccessibleName(
      'The globe, with 13 teammates’ pins. Drag to spin, or use the arrow keys.',
    );
    expect(await globePage.globeGroup.ariaSnapshot()).toMatch(onlyAListOfPins);
    await expect(globePage.canvas).toHaveAttribute('aria-hidden', 'true');

    // And each pin is announced with the teammate's name, city, local time, status, weather and
    // moments this week
    await expect(globePage.groupPinButtons.first()).toHaveAccessibleName(tomas);
    await expect(globePage.groupPinButtons).toHaveCount(await globePage.pinButtons.count());

    // And, turned to Liam, his is named as the still picture names it
    await globePage.openAt(idOf('Liam O’Connor'));
    await expect(globePage.groupPinButtons.filter({ hasText: 'LO' })).toHaveAccessibleName(liam);
  });

  test.describe('on the still picture', () => {
    test.use({ webgl: false });

    test('the still picture is named as one, with the same list of pins', async ({ globePage }) => {
      await globePage.open();
      await expect(globePage.stillPicture).toBeVisible();

      await expect(globePage.globeGroup).toHaveAccessibleName(
        'A still picture of the globe, with 13 teammates’ pins.',
      );
      expect(await globePage.globeGroup.ariaSnapshot()).toMatch(onlyAListOfPins);
      await expect(globePage.groupPinButtons.filter({ hasText: 'LO' })).toHaveAccessibleName(liam);
    });
  });

  test('a selection by keyboard, click or address is announced once, politely, and the minute passing says nothing', async ({
    page,
    globePage,
  }) => {
    // Given the Globe, listened to as a screen reader listens
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await globePage.openAt(idOf('Lena Fischer'));
    await expect(globePage.personName).toHaveText('Lena Fischer');
    await listenForAnnouncements(page);

    // When Liam's pin is chosen with the keyboard
    await globePage.pin('Liam O’Connor').focus();
    await page.keyboard.press('Enter');
    await expect(globePage.personName).toHaveText('Liam O’Connor');

    // And Kwame's with a click
    await globePage.pin('Kwame Mensah').click();
    await expect(globePage.personName).toHaveText('Kwame Mensah');

    // Then each change was said once, politely
    expect(await announcements(page)).toEqual([
      { politeness: 'polite', text: 'Liam O’Connor, Dublin, selected.' },
      { politeness: 'polite', text: 'Kwame Mensah, Accra, selected.' },
    ]);
    // And the panel is not itself a live region
    expect(await globePage.panelIsLive()).toBe(false);

    // When a minute passes and every clock moves on
    await page.clock.runFor(60_000);
    await expect(globePage.personClock).toHaveText('14:06');
    await expect(globePage.pin('Kwame Mensah')).toHaveAccessibleName(/^Kwame Mensah, Accra, 14:06/);

    // Then nothing more was said
    expect(await announcements(page)).toHaveLength(2);

    // When the Globe is opened at a shared address
    await globePage.openAt(idOf('Tomás Herrera'));
    await listenForAnnouncements(page);
    await expect(globePage.personName).toHaveText('Tomás Herrera');

    // Then the selection is in the polite region from the start
    await expect(globePage.announcement).toHaveText('Tomás Herrera, Mexico City, selected.');
    await expect(globePage.announcement).toHaveAttribute('aria-live', 'polite');
  });

  test('under reduced motion a pin chosen with the keyboard faces the viewer at once, with no turn', async ({
    page,
    globePage,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await globePage.open();
    await expect(globePage.pin('Kwame Mensah')).toBeVisible();
    await pauseTheClock(page);
    await page.clock.runFor(32);

    await globePage.pin('Kwame Mensah').focus();
    await page.keyboard.press('Enter');
    await page.clock.runFor(50);

    expect(offCentre(await globePage.pinPlace('Kwame Mensah'))).toBeLessThan(1);
  });

  test('in dark, the globe is the same picture a little deeper, with a light outline', async ({
    page,
    globePage,
  }) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await globePage.open();
    await expect(globePage.canvas).toBeVisible();
    const sea = placeOnGlobe(-2, -12)!;
    const [lightSea] = await coloursAt(globePage.canvas, [sea]);
    const lightOutline = await globePage.outlineColour();

    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await expect.poll(() => globePage.outlineColour()).not.toBe(lightOutline);
    const [darkSea] = await coloursAt(globePage.canvas, [sea]);

    // The sea is still blue, and deeper
    expect(darkSea[2]).toBeGreaterThan(darkSea[0] + 40);
    expect(brightness(darkSea)).toBeLessThan(brightness(lightSea));
    // And the outline is light where it was ink
    const rgb = (colour: string) =>
      colour.match(/\d+/g)!.slice(0, 3).map(Number) as [number, number, number];
    expect(brightness(rgb(lightOutline))).toBeLessThan(0.3);
    expect(brightness(rgb(await globePage.outlineColour()))).toBeGreaterThan(0.7);
  });
});
