import type { Locator, Page } from '@playwright/test';

/** True when the page does not scroll sideways at its current width. */
export function fitsItsWidth(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
}

/** The smaller of a control's width and height, in px: a touch target is at least 44. */
export async function smallestTarget(control: Locator): Promise<number> {
  const box = await control.boundingBox();
  return box ? Math.min(box.width, box.height) : 0;
}
