// Acceptance Test
// Traces to: L2-008, L2-010, L2-037, L2-012, L2-013
// Description: Where the 3D globe cannot be drawn the still picture stands in its place, and the legend, or a line under it on a phone, says why

import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import {
  lookupAnswer,
  NORTHWIND_INVITE,
  NORTHWIND_JOINS,
  NORTHWIND_LOOKUPS,
  northwindInvite,
  SOFIA_JOINED,
} from '../fixtures/invites';
import { BrowserRecord } from '../support/browser-record';
import { rememberTeam } from '../support/membership';
import { NORTHWIND_PINS, northwindPins, northwindPinsOf } from '../fixtures/pins';

const still = 'Still view — 3D isn’t available in this browser';

/** Refuses the renderer's chunk, as a network that drops it would. */
async function refuseTheRenderer(page: Page): Promise<void> {
  await page.route(/\/chunk-[\w-]+\.js$/, async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    if (body.includes('GlobeHigh')) await route.abort('failed');
    else await route.fulfill({ response, body });
  });
}

test.describe('Globe: the legend over the 3D globe', () => {
  test('names the night side, moments, teammates close together and how to turn the globe', async ({
    api,
    page,
    globePage,
  }) => {
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPinsOf('Sofia Bianchi'));
    await globePage.open();
    await expect(globePage.canvas).toBeVisible();

    await expect(globePage.legendEntries).toHaveText([
      'Night side',
      'Moment this week',
      '3Teammates close together',
      'Drag to spin',
    ]);
    await expect(globePage.stillLine).toHaveCount(0);
  });

  test('is not shown on a phone', async ({ api, page, globePage }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPinsOf('Sofia Bianchi'));
    await globePage.open();
    await expect(globePage.canvas).toBeVisible();

    await expect(globePage.legend).toBeHidden();
  });
});

test.describe('Globe: the still picture', () => {
  test.describe('in a browser without WebGL', () => {
    test.use({ webgl: false });

    test('the still picture stands in the globe’s place, and the legend says why', async ({
      api,
      page,
      globePage,
    }) => {
      const record = new BrowserRecord(page);
      await rememberTeam(page);
      api.answer('GET', NORTHWIND_PINS, northwindPinsOf('Sofia Bianchi'));

      await globePage.open();

      await expect(globePage.stillPicture).toBeVisible();
      await expect(globePage.canvas).toHaveCount(0);
      await expect(globePage.legendEntries).toHaveText([
        'Night side',
        'Moment this week',
        '3Teammates close together',
        still,
      ]);
      await expect(globePage.stillLine).toBeHidden();
      // Without WebGL, neither the renderer nor the model is downloaded
      expect(record.requests.some((url) => /\.glb$|surface-|clouds-/.test(url))).toBe(false);
    });

    test('on a phone, a line under the globe says why it is still', async ({
      api,
      page,
      globePage,
    }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await rememberTeam(page);
      api.answer('GET', NORTHWIND_PINS, northwindPinsOf('Sofia Bianchi'));

      await globePage.open();

      await expect(globePage.stillPicture).toBeVisible();
      await expect(globePage.stillLine).toHaveText(`${still}. Pins still open.`);
      await expect(globePage.legend).toBeHidden();
    });

    test('the team’s pins are on the still picture, and lift and are selected there', async ({
      api,
      page,
      globePage,
    }) => {
      await rememberTeam(page);
      api.answer('GET', NORTHWIND_PINS, northwindPins());

      await globePage.open();

      await expect(globePage.stillPicture).toBeVisible();
      await expect(globePage.pin('2 teammates close together')).toHaveText('2');
      await expect(globePage.labelTimeOf('Lena Fischer')).toHaveText('15:05');
      await expect(globePage.pin('Aiko Tanaka')).toHaveCount(0);
      await globePage.pin('Lena Fischer').hover();
      await expect(globePage.labelOf('Lena Fischer')).toHaveText(
        'Lena Fischer · Berlin15:058°Cloudy',
      );
      await globePage.pin('Lena Fischer').click();
      await expect(globePage.pin('Lena Fischer')).toHaveAttribute('aria-pressed', 'true');
    });

    test('the new pin is on the still picture straight after joining', async ({
      api,
      joinPage,
      globePage,
    }) => {
      api.answer('GET', NORTHWIND_INVITE, northwindInvite());
      api.answer('POST', NORTHWIND_LOOKUPS, (route) =>
        lookupAnswer(route.request().postDataJSON()),
      );
      api.answer('POST', NORTHWIND_JOINS, SOFIA_JOINED);
      api.answer('GET', NORTHWIND_PINS, northwindPins());
      await joinPage.open('northwind-7Kq2');
      await joinPage.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });
      await joinPage.leavePostalCode();
      await expect(joinPage.submit).toHaveText('Join Northwind');

      await joinPage.submit.click();

      await expect(globePage.stillPicture).toBeVisible();
      await expect(globePage.youLabel).toHaveText('Sofia Bianchi (you) · Milan');
      await expect(globePage.youPin).toHaveAttribute('aria-pressed', 'true');
      await expect(globePage.globe).toHaveAccessibleName(
        'A still picture of the globe, with 13 teammates’ pins.',
      );
    });
  });

  test('the still picture stands in when the globe’s model cannot be loaded', async ({
    api,
    page,
    globePage,
  }) => {
    await page.route('**/media/globe-*.glb', (route) => route.abort('failed'));
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPinsOf('Sofia Bianchi'));

    await globePage.open();

    await expect(globePage.stillPicture).toBeVisible();
    await expect(globePage.canvas).toHaveCount(0);
    await expect(globePage.legendEntries.last()).toHaveText(still);
  });

  test('the still picture stands in when the renderer cannot be loaded', async ({
    api,
    page,
    globePage,
  }) => {
    await refuseTheRenderer(page);
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPinsOf('Sofia Bianchi'));

    await globePage.open();

    await expect(globePage.stillPicture).toBeVisible();
    await expect(globePage.canvas).toHaveCount(0);
    await expect(globePage.legendEntries.last()).toHaveText(still);
  });

  test('the still picture takes over when the 3D globe loses its context', async ({
    api,
    page,
    globePage,
  }) => {
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPinsOf('Sofia Bianchi'));
    await globePage.open();
    await expect(globePage.canvas).toBeVisible();

    await globePage.loseTheContext();

    await expect(globePage.stillPicture).toBeVisible();
    await expect(globePage.canvas).toHaveCount(0);
    await expect(globePage.legendEntries.last()).toHaveText(still);
  });
});
