import type { Page } from '@playwright/test';

/**
 * Pauses the page's clock about now, as soon as a timed message is seen. The page's clock runs on
 * while its time is read, so it is paused 20 ms ahead of the time read; a pause that lands in the
 * past (the machine was slow between the two calls) reads the time again.
 */
export async function pauseNow(page: Page): Promise<void> {
  for (;;) {
    const now = await page.evaluate(() => Date.now());
    try {
      await page.clock.pauseAt(new Date(now + 20));
      return;
    } catch (error) {
      if (!String(error).includes('Cannot fast-forward to the past')) throw error;
    }
  }
}
