// Accessibility sweep. Runs only when a person asks: npm run e2e:accessibility
// Traces to: L2-039, L2-041, L2-020, L2-029, L2-030, L2-049

import type { ApiFixture } from '../fixtures/api';
import { expect, test } from '../fixtures/test';
import { CAST_MOMENTS, NO_MOMENTS, NORTHWIND_MOMENTS, northwindMoments } from '../fixtures/moments';
import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import type { MomentsPage } from '../pages/moments.page';
import { expectNoViolations } from '../support/axe';
import { rememberTeam } from '../support/membership';

/** Reaches a state, and gives back what lets go of an answer it holds, if it holds one. */
type Reach = (api: ApiFixture, page: MomentsPage) => Promise<(() => void) | void>;

/** Each drawn state of Moments, reached as the behaviour specs reach it. */
const states: Record<string, Reach> = {
  default: async (api, page) => {
    api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());
    await page.open();
    await expect(page.todayMoments).toHaveCount(1);
  },
  filtered: async (api, page) => {
    api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());
    await page.open();
    await page.chip('Formula 1').click();
    await expect(page.chip('Formula 1')).toHaveAttribute('aria-pressed', 'true');
  },
  'no-results': async (api, page) => {
    api.answer(
      'GET',
      NORTHWIND_MOMENTS,
      northwindMoments(CAST_MOMENTS.filter((moment) => moment.kind !== 'sport')),
    );
    await page.open();
    await page.chip('Sport').click();
    await expect(page.note).toBeVisible();
  },
  loading: async (api, page) => {
    const held = api.hold('GET', NORTHWIND_MOMENTS);
    await page.open();
    await expect(page.loadingAnnouncement).toHaveText('Loading moments…');
    return () => held.release(NO_MOMENTS);
  },
  empty: async (api, page) => {
    api.answer('GET', NORTHWIND_MOMENTS, NO_MOMENTS);
    await page.open();
    await expect(page.emptyTitle).toBeVisible();
  },
  error: async (api, page) => {
    api.answer('GET', NORTHWIND_MOMENTS, { unanswered: true });
    await page.open();
    await expect(page.errorTitle).toBeVisible();
  },
};

test.use({ webgl: false });

test.beforeEach(async ({ api, page }) => {
  await rememberTeam(page);
  api.answer('GET', NORTHWIND_PINS, northwindPins());
});

for (const [state, reach] of Object.entries(states)) {
  for (const theme of ['light', 'dark'] as const) {
    test(`Moments ${state} has no WCAG 2.2 AA violation, ${theme}`, async ({
      api,
      momentsPage,
    }) => {
      await momentsPage.page.emulateMedia({ colorScheme: theme });
      const release = await reach(api, momentsPage);

      await expectNoViolations(momentsPage.page);
      release?.();
    });
  }
}
