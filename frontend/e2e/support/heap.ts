import type { Page } from '@playwright/test';

/** The page's JavaScript heap after garbage collection, in bytes, as Chromium reports it. */
export async function heapAfterCollection(page: Page): Promise<number> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.enable');
  // Twice, so what the first collection freed for finalising is gone too.
  await cdp.send('HeapProfiler.collectGarbage');
  await cdp.send('HeapProfiler.collectGarbage');
  const { usedSize } = await cdp.send('Runtime.getHeapUsage');
  await cdp.detach();
  return usedSize;
}
