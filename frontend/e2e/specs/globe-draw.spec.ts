// Acceptance Test
// Traces to: L2-008
// Description: The Globe screen draws a lit 3D globe from assets served by the app itself, after a placeholder that holds its place

import { expect, test } from '../fixtures/test';
import { BrowserRecord } from '../support/browser-record';
import { coloursAt, placeOnGlobe } from '../support/globe-pixels';
import { rememberTeam } from '../support/membership';
import { NORTHWIND_PINS, northwindPinsOf } from '../fixtures/pins';

test.describe('Globe: the 3D globe', () => {
  test.beforeEach(async ({ api, page }) => {
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPinsOf('Sofia Bianchi'));
    // The globe holds still at the orientation it starts at, so its pixels are where a spec
    // looks for them (ADR 0013).
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('a placeholder holds the globe’s place, and the 3D globe takes it without moving anything', async ({
    page,
    globePage,
  }) => {
    // Given the globe's model is still on its way
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route('**/media/globe-*.glb', async (route) => {
      await held;
      await route.continue();
    });

    // When a teammate opens the Globe screen
    await globePage.open();

    // Then a placeholder is shown in the globe's place
    await expect(globePage.placeholder).toBeVisible();
    await expect(globePage.canvas).toBeHidden();
    const before = await globePage.globeBox.boundingBox();

    // And when the model arrives, the 3D globe is drawn in the same place
    release();
    await expect(globePage.canvas).toBeVisible();
    await expect(globePage.placeholder).toHaveCount(0);
    expect(await globePage.globeBox.boundingBox()).toEqual(before);
    const canvas = await globePage.canvas.boundingBox();
    expect(canvas!.x + canvas!.width / 2).toBeCloseTo(before!.x + before!.width / 2, 0);
    expect(canvas!.y + canvas!.height / 2).toBeCloseTo(before!.y + before!.height / 2, 0);
  });

  test('the globe is drawn from the app’s own origin, with addresses that change with the assets', async ({
    page,
    globePage,
  }) => {
    const record = new BrowserRecord(page);

    await globePage.open();
    await expect(globePage.canvas).toBeVisible();

    // The model and its masks come from the app itself, under content-hashed names
    expect(record.origins()).toEqual(['http://127.0.0.1:4310']);
    const paths = record.requests.map((url) => new URL(url).pathname);
    expect(paths).toContainEqual(expect.stringMatching(/^\/media\/globe-[A-Z0-9]{8}\.glb$/));
    expect(paths).toContainEqual(expect.stringMatching(/^\/media\/surface-[A-Z0-9]{8}\.png$/));
    expect(paths).toContainEqual(expect.stringMatching(/^\/media\/clouds-[A-Z0-9]{8}\.png$/));
  });

  test('the globe is lit and coloured, with the sea blue and the land not', async ({
    globePage,
  }) => {
    await globePage.open();
    await expect(globePage.canvas).toBeVisible();

    // The Gulf of Guinea, the Sahara and the Congo, all in daylight at the cast's "now"
    const [sea, desert, forest] = await coloursAt(globePage.canvas, [
      placeOnGlobe(-2, -12)!,
      placeOnGlobe(26, 10)!,
      placeOnGlobe(-2, 22)!,
    ]);
    expect(sea[2]).toBeGreaterThan(sea[0] + 60);
    expect(desert[0]).toBeGreaterThan(desert[2] + 60);
    expect(forest[1]).toBeGreaterThan(forest[2]);

    // And the globe is a ball in the box: nothing is drawn in its corners (the bottom right, which
    // the heading over the globe and the invite card do not reach)
    const [corner] = await coloursAt(globePage.canvas, [{ x: 96, y: 96 }]);
    const [page] = await coloursAt(globePage.main, [{ x: 1, y: 1 }]);
    expect(corner).toEqual(page);
  });
});
