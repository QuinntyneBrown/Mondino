import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect } from '../fixtures/test';

/** The rules every screen is held to: WCAG 2.2 AA (L2-041). */
const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];

/**
 * Checks the page as it stands against WCAG 2.2 AA with axe, and fails naming every violation.
 *
 * axe hands each rule's result on with a timer, which a paused page clock holds; a state reached
 * with the clock paused (a message that goes by itself after 4 seconds, an hour later in the day)
 * says so with `clockPaused`, and the clock is then moved on a millisecond at a time while axe
 * runs, far less than any timed message lasts.
 */
export async function expectNoViolations(
  page: Page,
  { clockPaused = false }: { clockPaused?: boolean } = {},
): Promise<void> {
  const analysis = new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
  if (clockPaused) {
    let finished = false;
    analysis.then(
      () => (finished = true),
      () => (finished = true),
    );
    while (!finished) await page.clock.runFor(1);
  }
  const results = await analysis;
  expect(results.violations).toEqual([]);
}
