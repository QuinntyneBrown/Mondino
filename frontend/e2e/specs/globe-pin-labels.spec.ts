// Acceptance Test
// Traces to: L2-011, L2-013, L2-047
// Description: A pin alone carries a label with its local time, beside it, inside the globe and clear of other pins; pins close together are grouped again as the globe turns; a compact globe labels only the lifted pin; a team of 500 is drawn as a bounded number of group pins

import { expect, test } from '../fixtures/test';
import { northwindPins, NORTHWIND_PINS, northwindPinsOf, teamOf500 } from '../fixtures/pins';
import { rememberTeam } from '../support/membership';

test.describe('Globe: pin labels and group pins', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await rememberTeam(page);
  });

  test('a pin alone is labelled with its local time, inside the globe and clear of every other pin', async ({
    api,
    globePage,
  }) => {
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await globePage.open();
    await expect(globePage.pinButtons).toHaveCount(8);

    // Then each pin alone that faces the viewer carries its local time; the group pin none
    await expect(globePage.labelTimeOf('Lena Fischer')).toHaveText('15:05');
    await expect(globePage.labelTimeOf('Kwame Mensah')).toHaveText('14:05');
    await expect(globePage.labelTimeOf('Ahmed Al-Sayed')).toHaveText('18:05');
    await expect(globePage.labelOf('2 teammates close together')).toHaveCount(0);

    // And every label sits inside the globe and covers no pin
    const globe = (await globePage.globe.boundingBox())!;
    const disc = {
      x: globe.x + globe.width / 2,
      y: globe.y + globe.height / 2,
      r: globe.width * 0.44,
    };
    const pins = await Promise.all(
      (await globePage.pinButtons.all()).map(async (pin) => (await pin.boundingBox())!),
    );
    const labels = await globePage.restingLabels.all();
    expect(labels.length).toBeGreaterThan(3);
    for (const label of labels) {
      const box = (await label.boundingBox())!;
      for (const [x, y] of [
        [box.x, box.y],
        [box.x + box.width, box.y],
        [box.x, box.y + box.height],
        [box.x + box.width, box.y + box.height],
      ])
        expect(Math.hypot(x - disc.x, y - disc.y)).toBeLessThanOrEqual(disc.r);
      for (const pin of pins) {
        const apart =
          box.x >= pin.x + pin.width ||
          pin.x >= box.x + box.width ||
          box.y >= pin.y + pin.height ||
          pin.y >= box.y + box.height;
        expect(apart).toBe(true);
      }
    }
  });

  test('pins that come close together as the globe turns are grouped again', async ({
    api,
    globePage,
  }) => {
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await globePage.open();
    await expect(globePage.pin('Lena Fischer')).toBeVisible();
    await expect(globePage.pin('Mara Lindqvist')).toBeVisible();

    // When the globe turns to Accra, Berlin and Stockholm come close together near the rim
    await globePage.pin('Kwame Mensah').click();

    // Then Lena and Mara are one group pin, and every teammate facing the viewer is drawn once
    await expect(
      globePage.pin('2 teammates close together: Lena Fischer, Mara Lindqvist'),
    ).toBeVisible();
    await expect(globePage.pin('Lena Fischer')).toHaveCount(0);
    await expect(globePage.pin('Mara Lindqvist')).toHaveCount(0);
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 320, height: 700 } });

    test('pins are smaller and only the lifted pin is labelled; Europe’s teammates are each reached once', async ({
      api,
      globePage,
    }) => {
      api.answer(
        'GET',
        NORTHWIND_PINS,
        northwindPinsOf(
          'Sofia Bianchi',
          'Luca Ferri',
          'Lena Fischer',
          'Mara Lindqvist',
          'Liam O’Connor',
        ),
      );
      await globePage.open();
      await expect(globePage.pinButtons.first()).toBeVisible();

      // Then no pin is labelled at rest, and a pin is drawn smaller than its 44 px hit area
      await expect(globePage.restingLabels).toHaveCount(0);
      const first = (await globePage.pinButtons.first().boundingBox())!;
      expect(first.width).toBeLessThan(26);

      // And every one of the five teammates is drawn exactly once, alone or in a group pin
      const counted = await globePage.pinButtons.evaluateAll((buttons) =>
        buttons.reduce((sum, button) => sum + (Number(button.textContent?.trim()) || 1), 0),
      );
      expect(counted).toBe(5);

      // And a pin pointed at is labelled, under it
      await globePage.pinButtons.first().hover();
      await expect(globePage.liftedLabels).toHaveCount(1);
      await expect(globePage.liftedLabels).toBeInViewport();
    });
  });

  test('a team of 500 is drawn as a bounded number of pins, its group pins counting and naming where they stand for', async ({
    api,
    globePage,
  }) => {
    api.answer('GET', NORTHWIND_PINS, teamOf500());
    await globePage.open();
    await expect(globePage.pinButtons.first()).toBeVisible();

    const names = await globePage.pinNames();
    expect(names.length).toBeLessThan(40);
    const groups = names.filter((name) => / teammates close together/.test(name));
    expect(groups.length).toBeGreaterThan(5);
    for (const name of groups) expect(name).toMatch(/^\d+ teammates close together(: .+|, .+)$/);
    expect(groups.some((name) => /^\d+ teammates close together, \d+ cities$/.test(name))).toBe(
      true,
    );
    expect(groups.some((name) => /^\d+ teammates close together, [A-Z][a-z]/.test(name))).toBe(
      true,
    );
    const counts = await globePage.pinButtons.evaluateAll((buttons) =>
      buttons.map((button) => Number(button.textContent?.trim()) || 1),
    );
    expect(Math.max(...counts)).toBeGreaterThan(20);
  });
});
