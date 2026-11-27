// Visual sweep. Runs only when a person asks: npm run e2e:visual
// Mocks: docs/mocks/pages/join/default.html, loading.html, invite-unusable.html, error.html

import { expect, test } from '../fixtures/test';
import { NORTHWIND_INVITE, northwindInvite } from '../fixtures/invites';

const states = {
  default: (api) => api.answer('GET', NORTHWIND_INVITE, northwindInvite()),
  loading: (api) => void api.hold('GET', NORTHWIND_INVITE),
  'invite-unusable': (api) => api.refuse('GET', NORTHWIND_INVITE, 404, 'invite_not_found'),
  error: (api) => api.refuse('GET', NORTHWIND_INVITE, 503, 'unexpected'),
} satisfies Record<string, (api: import('../fixtures/api').ApiFixture) => void>;

for (const [state, answer] of Object.entries(states)) {
  for (const theme of ['light', 'dark'] as const) {
    for (const width of [320, 768, 1280]) {
      test(`Join ${state}, ${theme}, ${width} px`, async ({ api, joinPage }) => {
        answer(api);
        await joinPage.page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
        await joinPage.page.setViewportSize({ width, height: 800 });
        await joinPage.open('northwind-7Kq2');
        await expect(joinPage.footer).toBeVisible();
        await expect(joinPage.page).toHaveScreenshot(`join-${state}-${theme}-${width}.png`, {
          fullPage: true,
        });
      });
    }
  }
}
