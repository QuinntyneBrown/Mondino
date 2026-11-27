import type { Page } from '@playwright/test';
import { expect } from '../fixtures/test';
import type { ApiFixture } from '../fixtures/api';
import {
  lookupAnswer,
  NORTHWIND_INVITE,
  NORTHWIND_JOINS,
  NORTHWIND_LOOKUPS,
  northwindInvite,
  SOFIA_JOINED,
} from '../fixtures/invites';
import type { GlobePage } from '../pages/globe.page';
import type { JoinPage } from '../pages/join.page';

/**
 * Sofia joins Northwind from Milan and lands on the Globe screen, her pin on the 3D globe: the one
 * pin the Globe screen draws until the team's pins are built, so how it moves is how the globe
 * turns.
 */
export async function joinFromMilan(
  api: ApiFixture,
  joinPage: JoinPage,
  globePage: GlobePage,
): Promise<void> {
  api.answer('GET', NORTHWIND_INVITE, northwindInvite());
  api.answer('POST', NORTHWIND_LOOKUPS, (route) => lookupAnswer(route.request().postDataJSON()));
  api.answer('POST', NORTHWIND_JOINS, SOFIA_JOINED);
  await joinPage.open('northwind-7Kq2');
  await joinPage.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });
  await joinPage.leavePostalCode();
  await expect(joinPage.submit).toHaveText('Join Northwind');
  await joinPage.submit.click();
  await expect(globePage.youPin).toBeVisible();
}

/**
 * Stops the clock a second from now, so time passes only when the spec says: frames, and Angular's
 * rendering, then come only with `page.clock.runFor`.
 */
export async function pauseTheClock(page: Page): Promise<void> {
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 1_000);
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
