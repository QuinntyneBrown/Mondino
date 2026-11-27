// Performance sweep: the frame rate, the response to an interaction and the first paint, measured
// on the running app. Runs only when a person asks: npm run e2e:performance
// Traces to: L2-046
// Description: On the reference laptop the globe is dragged at 50 frames a second, 30 on the reference phone; an interaction responds within 200 ms; the Globe paints within 2.5 s on a throttled 4G connection

import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import { NORTHWIND_PINS, northwindPins, teamOf500 } from '../fixtures/pins';
import { rememberTeam } from '../support/membership';

/** A team of 100: the first hundred teammates of the team of 500. */
function teamOf100() {
  const team = teamOf500().json as { pins: unknown[] };
  return { json: { ...team, pins: team.pins.slice(0, 100) } };
}

/** Frames drawn a second over `ms` of real time, counted by the browser's own frames. */
async function framesPerSecond(page: Page, during: () => Promise<void>): Promise<number> {
  await page.evaluate(() => {
    const counter = { frames: 0, on: true };
    Object.assign(window, { __counter: counter });
    const count = () => {
      counter.frames++;
      if (counter.on) requestAnimationFrame(count);
    };
    requestAnimationFrame(count);
  });
  const started = Date.now();
  await during();
  const seconds = (Date.now() - started) / 1000;
  const frames = await page.evaluate(() => {
    const counter = (window as unknown as { __counter: { frames: number; on: boolean } }).__counter;
    counter.on = false;
    return counter.frames;
  });
  return frames / seconds;
}

test.describe('Fast to load: measured', () => {
  test.beforeEach(async ({ page }) => {
    // The real clock: a frame rate and a paint are measured in real time.
    await page.clock.resume();
    await rememberTeam(page);
  });

  for (const [device, throttling, least] of [
    ['the reference laptop', 1, 50],
    ['the reference phone', 4, 30],
  ] as const)
    test(`a team of 100 is dragged at ${least} frames a second or more on ${device}`, async ({
      api,
      page,
      globePage,
    }) => {
      api.answer('GET', NORTHWIND_PINS, teamOf100());
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttling });
      await globePage.open();
      await expect(globePage.canvas).toBeVisible();

      const fps = await framesPerSecond(page, async () => {
        for (let drag = 0; drag < 5; drag++) await globePage.dragWithTheMouse(240, 0);
      });
      expect(fps).toBeGreaterThanOrEqual(least);
    });

  test('selecting a pin and changing a filter respond within 200 ms', async ({
    api,
    page,
    globePage,
    teamPage,
  }) => {
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await page.addInitScript(() => {
      const longest = { ms: 0 };
      Object.assign(window, { __interaction: longest });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) longest.ms = Math.max(longest.ms, entry.duration);
      }).observe({
        type: 'event',
        durationThreshold: 16,
        buffered: true,
      } as PerformanceObserverInit);
    });
    await globePage.open();
    await expect(globePage.canvas).toBeVisible();
    await globePage.workingRows.first().click();
    await expect(globePage.person).toBeVisible();
    await teamPage.open();
    await teamPage.tab('Working now').click();
    const longest = await page.evaluate(
      () => (window as unknown as { __interaction: { ms: number } }).__interaction.ms,
    );
    expect(longest).toBeLessThanOrEqual(200);
  });

  test('a first visit on a 4G connection paints the Globe within 2.5 s with a layout shift under 0.1', async ({
    api,
    page,
    globePage,
  }) => {
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: 1_600_000 / 8,
      uploadThroughput: 750_000 / 8,
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.addInitScript(() => {
      const paint = { lcp: 0, cls: 0 };
      Object.assign(window, { __paint: paint });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) paint.lcp = entry.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & { value: number })[])
          paint.cls += entry.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await globePage.open();
    await expect(globePage.canvas).toBeVisible({ timeout: 10_000 });
    const paint = await page.evaluate(
      () => (window as unknown as { __paint: { lcp: number; cls: number } }).__paint,
    );
    expect(paint.lcp).toBeLessThanOrEqual(2_500);
    expect(paint.cls).toBeLessThan(0.1);
  });
});
