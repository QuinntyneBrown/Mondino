// Acceptance Test
// Traces to: L2-046
// Description: The Globe opens quickly on the reference phone, usable before its globe, and the initial bundle stays small without the renderer

import { gzipSync } from 'node:zlib';
import { expect, test } from '../fixtures/test';
import {
  holdTheRenderer,
  layoutShift,
  LoadRecord,
  RendererMark,
  watchLayoutShifts,
} from '../support/load-model';
import { rememberTeam } from '../support/membership';
import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';

test.describe('Globe: fast to load', () => {
  test.beforeEach(async ({ api, page }) => {
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
  });

  test('the initial bundle is at most 150 kB compressed and holds neither the renderer nor its assets', async ({
    page,
    notFoundPage,
    globePage,
  }) => {
    // Given the built app, its initial bundle: the scripts and styles the page itself names
    const shell = await (await page.request.get('/')).text();
    const initial = [...shell.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(
      ([, file]) => file,
    );
    expect(initial.length).toBeGreaterThan(0);
    let bytes = gzipSync(shell).length;
    for (const file of new Set(initial)) {
      const body = await (await page.request.get(`/${file}`)).body();
      bytes += gzipSync(body).length;
      // It holds no renderer, and names none of the globe's assets
      expect(body.toString('utf8')).not.toContain(RendererMark);
      expect(body.toString('utf8')).not.toMatch(/globe-(low|high)-\w+\.glb|surface-\w+\.png/);
    }

    // Then it is at most 150 kB compressed
    expect(bytes, `${bytes} bytes compressed`).toBeLessThanOrEqual(150_000);

    // And on a screen with no 3D globe, neither the renderer nor an asset of the globe is fetched
    const renderers: string[] = [];
    page.on('response', async (response) => {
      const url = response.url();
      if (
        /\.(glb|png)$/.test(url) ||
        (url.endsWith('.js') && (await response.text()).includes(RendererMark))
      )
        renderers.push(new URL(url).pathname);
    });
    await notFoundPage.open('/somewhere-else');
    await expect(notFoundPage.main).toBeVisible();
    expect(renderers).toEqual([]);

    // Until a globe is first drawn
    await notFoundPage.backToTheGlobe.click();
    await expect(globePage.canvas).toBeVisible();
    expect(renderers).toContainEqual(expect.stringMatching(/^\/chunk-.+\.js$/));
    expect(renderers).toContainEqual(expect.stringMatching(/^\/media\/globe-low-\w+\.glb$/));
  });

  test('the heading, the counts and the panel are usable before the 3D globe arrives', async ({
    page,
    globePage,
  }) => {
    // Given the globe's renderer is still on its way
    const renderer = await holdTheRenderer(page);

    // When a teammate opens the Globe
    await globePage.open();

    // Then the team's name, its counts and the panel are there, and the panel works
    await expect(globePage.title).toHaveText('13 teammates');
    await expect(globePage.counts).toHaveText('12 time zones · 8 working · 2 asleep');
    await expect(globePage.placeholder).toBeVisible();
    await globePage.workingRows.first().click();
    await expect(globePage.person).toBeVisible();
    await expect(globePage.canvas).toBeHidden();

    // And when the renderer arrives, the 3D globe is drawn
    renderer.release();
    await expect(globePage.canvas).toBeVisible();
  });

  test.describe('on the reference phone', () => {
    test.use({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });

    test('a first visit shows the screen within 2.5 seconds and a globe that can be spun within 5, with no layout shift', async ({
      page,
      globePage,
    }) => {
      await watchLayoutShifts(page);
      const record = new LoadRecord(page);
      // The screen is drawn once the team's pins have arrived, and the globe once its assets
      // have; what either brings in after (a font swapped in, the finer model) is not waited for.
      const pins = /\/pins$/;
      const assets = /\/media\/(globe-low-\w+\.glb|surface-\w+\.png|clouds-\w+\.png)$/;

      // When a teammate opens the Globe on a first visit
      await globePage.open();

      // Then the heading, the counts and the panel are shown within 2.5 seconds on its connection
      await expect(globePage.counts).toHaveText('12 time zones · 8 working · 2 asleep');
      await expect(globePage.working).toBeVisible();
      const shown = await record.secondsUntil(pins);
      expect(shown, record.describe(pins)).toBeLessThanOrEqual(2.5);

      // And the 3D globe is drawn, and can be spun, within 5 seconds
      await expect(globePage.canvas).toBeVisible();
      const drawn = await record.secondsUntil(assets);
      expect(drawn, record.describe(assets)).toBeLessThanOrEqual(5);

      // And nothing moved as it arrived
      expect(await layoutShift(page)).toBeLessThan(0.1);
    });
  });
});
