// Acceptance Test
// Traces to: L2-012, L2-013, L2-009, L2-042
// Description: A pin lifts when pointed at or focused and settles back; Enter, Space, a click or a tap selects it, the globe turns to it and holds, and a tap off the pins clears it

import { expect, test } from '../fixtures/test';
import { northwindPins, NORTHWIND_PINS } from '../fixtures/pins';
import { rememberTeam } from '../support/membership';
import { letTimePass, pauseTheClock } from '../support/turning';

/** How far a place is from the centre of the globe's box, in % of its width and height. */
const offCentre = ({ x, y }: { x: number; y: number }) => Math.hypot(x - 50, y - 50);

test.describe('Globe: a pin lifts and is selected', () => {
  test.beforeEach(async ({ api, page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
  });

  test('pointed at, a pin lifts within 200 ms with its label, and settles back when the pointer leaves', async ({
    page,
    globePage,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await globePage.open();
    const lena = globePage.pin('Lena Fischer');
    await expect(lena).toBeVisible();
    await pauseTheClock(page);
    const resting = (await lena.boundingBox())!.width;
    expect(
      await lena.evaluate((button) => parseFloat(getComputedStyle(button).transitionDuration)),
    ).toBeLessThanOrEqual(0.2);

    // When the pointer moves over Lena's pin
    await lena.hover();
    await page.clock.runFor(200);

    // Then it is lifted, larger and in front, with its label naming her, her city and local time
    await expect(globePage.pinItem('Lena Fischer')).toHaveClass(/globe__pin--lifted/);
    await expect(globePage.labelOf('Lena Fischer')).toHaveClass(/pin-label--lifted/);
    await expect(globePage.labelOf('Lena Fischer')).toHaveText('Lena Fischer · Berlin15:05');
    expect((await lena.boundingBox())!.width).toBeGreaterThan(resting);
    const front = (name: string) =>
      globePage.pinItem(name).evaluate((item) => Number(getComputedStyle(item).zIndex));
    expect(await front('Lena Fischer')).toBeGreaterThan(await front('Mara Lindqvist'));

    // When the pointer leaves, it settles back
    await page.mouse.move(0, 0);
    await page.clock.runFor(200);
    await expect(globePage.pinItem('Lena Fischer')).not.toHaveClass(/globe__pin--lifted/);
    await expect(globePage.labelOf('Lena Fischer')).not.toHaveClass(/pin-label--lifted/);
  });

  test('under reduced motion a pin changes size at once, without the rising animation', async ({
    globePage,
  }) => {
    await globePage.open();
    const lena = globePage.pin('Lena Fischer');
    await expect(lena).toBeVisible();

    expect(
      await lena.evaluate((button) => parseFloat(getComputedStyle(button).transitionDuration)),
    ).toBe(0);
    await lena.hover();
    await expect(globePage.pinItem('Lena Fischer')).toHaveClass(/globe__pin--lifted/);
  });

  test('Tab lifts a pin as the pointer does; Enter and Space select it, and it stays lifted', async ({
    page,
    globePage,
  }) => {
    await globePage.open();
    await expect(globePage.pinButtons).toHaveCount(8);
    await globePage.globe.focus();

    // When Tab moves to the first pin, it lifts
    await page.keyboard.press('Tab');
    await expect(globePage.pin('Chloé Martin')).toBeFocused();
    await expect(globePage.pinItem('Chloé Martin')).toHaveClass(/globe__pin--lifted/);
    await expect(globePage.labelOf('Chloé Martin')).toHaveText('Chloé Martin · São Paulo11:05');

    // And Enter selects it
    await page.keyboard.press('Enter');
    await expect(globePage.pin('Chloé Martin')).toHaveAttribute('aria-pressed', 'true');
    await expect(globePage.pin('Liam O’Connor')).toHaveCount(0);

    // And the globe turns to São Paulo, and when Tab moves on to the next pin, Kwame's in Accra,
    // the selected pin stays lifted and the next one lifts too
    await page.keyboard.press('Tab');
    await expect(globePage.pin('Kwame Mensah')).toBeFocused();
    await expect(globePage.pinItem('Kwame Mensah')).toHaveClass(/globe__pin--lifted/);
    await expect(globePage.pinItem('Chloé Martin')).toHaveClass(/globe__pin--lifted/);

    // And Space selects that one in its place, keeping focus on it
    await page.keyboard.press('Space');
    await expect(globePage.pin('Kwame Mensah')).toHaveAttribute('aria-pressed', 'true');
    await expect(globePage.pin('Kwame Mensah')).toBeFocused();
    await expect(globePage.pin('Chloé Martin')).toHaveAttribute('aria-pressed', 'false');
  });

  test('a selected pin turns the globe to it within a second and holds there, until a click off the pins lets it go', async ({
    page,
    globePage,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await globePage.open();
    await expect(globePage.pin('Kwame Mensah')).toBeVisible();
    await pauseTheClock(page);
    await page.clock.runFor(32);

    // When Kwame's pin, in Accra, is clicked
    await globePage.pin('Kwame Mensah').click();
    await page.clock.runFor(32);
    await expect(globePage.pin('Kwame Mensah')).toHaveAttribute('aria-pressed', 'true');

    // Then within a second the globe has turned to face it, and holds there
    await letTimePass(page, 1_000);
    await page.clock.runFor(32);
    const facing = await globePage.pinPlace('Kwame Mensah');
    expect(offCentre(facing)).toBeLessThan(1);
    await letTimePass(page, 10_000);
    expect(await globePage.pinPlace('Kwame Mensah')).toEqual(facing);

    // When the globe is clicked off the pins, the selection is cleared and the pin settles
    await globePage.tapOffThePins();
    await page.clock.runFor(32);
    await expect(globePage.pin('Kwame Mensah')).toHaveAttribute('aria-pressed', 'false');
    await expect(globePage.liftedPins).toHaveCount(0);
  });

  test('a group pin is selected, lifted and pressed, and the globe turns to it', async ({
    page,
    globePage,
  }) => {
    await globePage.open();
    const group = globePage.pin('2 teammates close together');
    await expect(group).toBeVisible();

    await group.click();
    await page.clock.runFor(100);

    await expect(group).toHaveAttribute('aria-pressed', 'true');
    await expect(globePage.pinItem('2 teammates close together')).toHaveClass(/globe__pin--lifted/);
    expect(offCentre(await globePage.pinPlace('2 teammates close together'))).toBeLessThan(1);
  });

  test('every pin and group pin takes the pointer over at least 44 × 44 px', async ({
    globePage,
  }) => {
    await globePage.open();
    await expect(globePage.pinButtons).toHaveCount(8);

    for (const name of ['Lena Fischer', '2 teammates close together']) {
      const area = await globePage.hitArea(name);
      expect(area.width).toBeGreaterThanOrEqual(44);
      expect(area.height).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('Globe: a pin is selected by touch', () => {
  test.use({ hasTouch: true, viewport: { width: 375, height: 812 } });

  test('a tap selects a pin and lifts it, and a tap elsewhere on the globe clears it', async ({
    api,
    page,
    globePage,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await globePage.open();

    // On a phone the globe is compact: pins are small, with no label until one is lifted
    await expect(globePage.pin('Kwame Mensah')).toBeVisible();
    await expect(globePage.restingLabels).toHaveCount(0);
    const area = await globePage.hitArea('Kwame Mensah');
    expect(area.width).toBeGreaterThanOrEqual(44);

    // When Kwame's pin is tapped, it is selected and lifted, with its label
    await globePage.pin('Kwame Mensah').tap();
    await expect(globePage.pin('Kwame Mensah')).toHaveAttribute('aria-pressed', 'true');
    await expect(globePage.labelOf('Kwame Mensah')).toHaveText('Kwame Mensah · Accra14:05');
    await expect(globePage.liftedLabels).toHaveCount(1);

    // When the globe is tapped where there is no pin, the selection is cleared
    await globePage.tapOffThePinsByTouch();
    await expect(globePage.pin('Kwame Mensah')).toHaveAttribute('aria-pressed', 'false');
    await expect(globePage.liftedLabels).toHaveCount(0);
  });
});
