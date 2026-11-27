import type { Page } from '@playwright/test';
import { expect } from '../fixtures/test';
import type { ApiFixture } from '../fixtures/api';
import { NORTHWIND_PINS, northwindPinsOf } from '../fixtures/pins';
import { rememberTeam } from './membership';
import type { GlobePage } from '../pages/globe.page';

/**
 * Sofia opens Northwind's Globe, on a team of her alone in Milan, and waits for her pin: how it
 * moves is how the globe turns. Her pin is not selected, so nothing holds the globe.
 */
export async function openTheGlobe(api: ApiFixture, globePage: GlobePage): Promise<void> {
  await rememberTeam(globePage.page);
  api.answer('GET', NORTHWIND_PINS, northwindPinsOf('Sofia Bianchi'));
  await globePage.open();
  await expect(globePage.pin('Sofia Bianchi (you)')).toBeVisible();
}

/**
 * Stops the clock where it is, give or take a few milliseconds, so time passes only when the spec
 * says: frames, and Angular's rendering, then come only with `page.clock.runFor`.
 */
export async function pauseTheClock(page: Page): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    const now = await page.evaluate(() => Date.now());
    try {
      await page.clock.pauseAt(now + 20);
      return;
    } catch (error) {
      // The page's clock ran past the moment before it was paused; try the next one.
      if (attempt === 4 || !String(error).includes('to the past')) throw error;
    }
  }
}

/** Lets a spec hide and show the tab, as switching to another tab would. Call before opening. */
export async function makeTheTabHideable(page: Page): Promise<void> {
  await page.addInitScript(() => {
    let hidden = false;
    Object.defineProperty(document, 'hidden', { get: () => hidden });
    Object.defineProperty(document, 'visibilityState', {
      get: () => (hidden ? 'hidden' : 'visible'),
    });
    Object.assign(window, {
      __setHidden(value: boolean) {
        hidden = value;
        document.dispatchEvent(new Event('visibilitychange'));
      },
    });
  });
}

export async function setTheTabHidden(page: Page, hidden: boolean): Promise<void> {
  await page.evaluate(
    (value) => (window as unknown as { __setHidden(v: boolean): void }).__setHidden(value),
    hidden,
  );
}

/**
 * Turns reduced motion on or off while the page is open, as the system setting would. The browser
 * tells the page at its next rendering, which the paused clock does not bring about, so a
 * one-pixel picture of the page does.
 */
export async function changeReducedMotion(page: Page, reduce: boolean): Promise<void> {
  await page.emulateMedia({ reducedMotion: reduce ? 'reduce' : 'no-preference' });
  await page.screenshot({ clip: { x: 0, y: 0, width: 1, height: 1 } });
}

/**
 * Lets `ms` pass on the paused clock in one step, then draws: the globe's next frame reports the
 * whole time since the one before (ADR 0013), so seconds of turning cost one frame, not one a
 * 16 ms. The globe's frame loop must already be running, as it is a frame after it was last
 * asked to move.
 */
export async function letTimePass(page: Page, ms: number): Promise<void> {
  await page.clock.fastForward(ms);
  await page.clock.runFor(32);
}
