// Acceptance Test
// Traces to: L2-021, L2-022
// Description: A pin whose teammate has a moment today or in the next 7 days carries a moment marker in sun: the kind's icon for one, the count for two or more, larger and ringed for today, at least 16 px and clear of the initials on a small globe; the pin's accessible name gives every moment

import { expect, test } from '../fixtures/test';
import { idOf, NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { momentOf, NORTHWIND_MOMENTS, northwindMoments } from '../fixtures/moments';
import { mockLiftedLabel, mockPinMarkers } from '../support/mocks';
import { rememberTeam } from '../support/membership';

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}
const overlaps = (a: Box, b: Box) =>
  a.width > 0 &&
  b.width > 0 &&
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

test.describe('Globe: moment markers on the pins', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ api, page }) => {
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
  });

  test('the cast’s moments this week mark their pins as pages/globe/default draws them', async ({
    api,
    globePage,
  }) => {
    // Given the cast's moments at the mocks' now, every kind on (L2-022)
    api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());
    await globePage.open();
    await expect(globePage.markerOf('Liam O’Connor')).toBeVisible();

    // Then every pin drawn on the still picture is marked as the mock marks it, and no other:
    // Liam's holiday today, larger and ringed, Mara's and Priya's holidays later in the week
    const mock = mockPinMarkers('pages/globe/default.html');
    const drawn = await globePage.pinMarkers();
    const names = await globePage.pinButtons.evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute('aria-label')),
    );
    expect(drawn).toEqual(mock.filter(({ name }) => names.includes(name)));
    expect(drawn.map(({ name }) => name.split(',')[0])).toEqual([
      'Liam O’Connor',
      'Mara Lindqvist',
      'Priya Raman',
    ]);
    await expect(globePage.pin('Liam O’Connor')).toHaveAccessibleName(
      'Liam O’Connor, Dublin, 14:05, Working hours, Rainy 9°, October Bank Holiday, today',
    );
    // And a pin whose nearest moment is 13 days off, Chloé's São Paulo Grand Prix, carries none
    await expect(globePage.markerOf('Chloé Martin')).toHaveCount(0);

    // And today's marker is stronger by size and an ink ring, not by colour alone
    const today = await globePage.markerBoxes('Liam O’Connor');
    const later = await globePage.markerBoxes('Mara Lindqvist');
    expect(today.marker.width).toBe(20);
    expect(later.marker.width).toBe(16);
    expect(today.ring).not.toBe(later.ring);
  });

  test('a marked pin lifted gives its nearest moment and when as text; the marker is no control', async ({
    api,
    globePage,
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());
    await globePage.open();
    await expect(globePage.markerOf('Liam O’Connor')).toBeVisible();

    // When the pointer is over Liam's pin, as pages/globe/pin-lifted draws it
    await globePage.pin('Liam O’Connor').hover();

    // Then his lifted label ends with the holiday's icon and "October Bank Holiday · Today" as text
    const mock = mockLiftedLabel('pages/globe/pin-lifted.html', 'Liam O’Connor · Dublin');
    await expect(globePage.labelMomentOf('Liam O’Connor')).toHaveText(
      'October Bank Holiday · Today',
    );
    expect((await globePage.labelOf('Liam O’Connor').innerText()).replace(/\s+/g, '')).toBe(
      mock.text,
    );
    expect(await globePage.labelMomentIconShapes('Liam O’Connor')).toEqual(mock.momentIcon);

    // And focused, with the pointer gone, Mara's lifts with "Alla helgons dag · In 5 days"
    await page.mouse.move(0, 0);
    await globePage.pin('Mara Lindqvist').focus();
    await expect(globePage.labelMomentOf('Mara Lindqvist')).toHaveText(
      'Alla helgons dag · In 5 days',
    );

    // And a marker is no control of its own: the pins are the only things to press or focus, and
    // the marker is hidden from assistive technology
    const marker = globePage.markerOf('Liam O’Connor');
    await expect(marker).toHaveAttribute('aria-hidden', 'true');
    expect(await marker.evaluate((element) => (element as HTMLElement).tabIndex)).toBe(-1);
    await expect(globePage.pinControls).toHaveCount(await globePage.pinButtons.count());
  });

  test.describe('on the 3D globe', () => {
    test.use({ webgl: true });

    test('Tomás, with two moments this week, carries the count "2", and his name gives both', async ({
      api,
      globePage,
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());
      // When his pin is selected, as pages/globe/selected draws it
      await globePage.openAt(idOf('Tomás Herrera'));
      await expect(globePage.markerOf('Tomás Herrera')).toHaveText('2');

      // Then his marker and Jordan's are the mock's: the count in place of an icon, and the ticket
      const mock = mockPinMarkers('pages/globe/selected.html');
      const drawn = await globePage.pinMarkers();
      for (const name of ['Tomás Herrera', 'Jordan Lee'])
        expect(drawn.find((each) => each.name.startsWith(name))).toEqual(
          mock.find((each) => each.name.startsWith(name)),
        );
      await expect(globePage.pin('Tomás Herrera')).toHaveAccessibleName(
        'Tomás Herrera, Mexico City, 08:05, Early morning, Partly cloudy 22°, 2 moments this week: Día de Muertos, in 5 days; Clásico Nacional, in 6 days',
      );
    });
  });

  test('every kind marks a pin with its own icon, a key for an emblem not held among them, and 8 days off marks none', async ({
    api,
    globePage,
  }) => {
    // Given one moment of each kind this week, and Lena's next one 8 days off
    api.answer(
      'GET',
      NORTHWIND_MOMENTS,
      northwindMoments([
        momentOf('Liam O’Connor', 'holiday', '2025-10-29', 'Samhain', ''),
        momentOf('Kwame Mensah', 'formula-1', '2025-10-30', 'Grand Prix screening', ''),
        {
          ...momentOf('Mara Lindqvist', 'sport', '2025-10-31', 'AIK at home', ''),
          emblemKey: 'aik',
        },
        momentOf('Ahmed Al-Sayed', 'local-event', '2025-11-01', 'Dubai Design Week', ''),
        momentOf('Lena Fischer', 'holiday', '2025-11-04', 'Not this week', ''),
      ]),
    );
    await globePage.open();
    await expect(globePage.markerOf('Liam O’Connor')).toBeVisible();

    // Then each of the four kinds marks its pin with Mondino's own icon for the kind, the icons
    // the week's rows draw (L2-020), the sport's emblem key notwithstanding
    const icons = new Map(
      (await globePage.weekRowParts()).map((row) => [row.title, row.icon.join('|')]),
    );
    const drawn = new Map(
      (await globePage.pinMarkers()).map((marker) => [marker.name.split(',')[0], marker]),
    );
    expect(drawn.get('Liam O’Connor')?.icon.join('|')).toBe(icons.get('Samhain'));
    expect(drawn.get('Kwame Mensah')?.icon.join('|')).toBe(icons.get('Grand Prix screening'));
    expect(drawn.get('Mara Lindqvist')?.icon.join('|')).toBe(icons.get('AIK at home'));
    expect(drawn.get('Ahmed Al-Sayed')?.icon.join('|')).toBe(icons.get('Dubai Design Week'));
    expect(new Set(icons.values()).size).toBe(4);
    await expect(globePage.pin('Mara Lindqvist')).toHaveAccessibleName(/, AIK at home, in 4 days$/);

    // And Lena, whose nearest moment is 8 days off, carries none
    await expect(globePage.markerOf('Lena Fischer')).toHaveCount(0);
    await expect(globePage.pin('Lena Fischer')).toHaveAccessibleName(
      'Lena Fischer, Berlin, 15:05, Working hours, Cloudy 8°',
    );
  });

  test.describe('on a globe under 400 px', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('each marker is at least 16 px across and clear of its pin’s initials', async ({
      api,
      globePage,
      page,
    }) => {
      // A lifted pin changes size at once, so it is measured as it settles
      await page.emulateMedia({ reducedMotion: 'reduce' });
      api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());
      await globePage.open();
      await expect(globePage.markerOf('Liam O’Connor')).toBeVisible();
      expect((await globePage.globeBox.boundingBox())!.width).toBeLessThan(400);

      // When Liam's and Mara's pins are lifted by focus, their initials showing
      for (const name of ['Liam O’Connor', 'Mara Lindqvist']) {
        await globePage.pin(name).focus();
        await expect(globePage.pinItem(name)).toHaveClass(/globe__pin--lifted/);
        const { marker, initials } = await globePage.markerBoxes(name);
        // Then the marker keeps its 16 px and does not cover the initials
        expect(marker.width).toBeGreaterThanOrEqual(16);
        expect(marker.height).toBeGreaterThanOrEqual(16);
        expect(initials.width).toBeGreaterThan(0);
        expect(overlaps(marker, initials)).toBe(false);
      }
    });
  });
});
