// Visual sweep. Runs only when a person asks: npm run e2e:visual
// Mock: docs/mocks/pages/not-found/default.html

import { expect, test } from '../fixtures/test';

for (const theme of ['light', 'dark'] as const) {
  for (const width of [320, 768, 1280]) {
    test(`Not Found, ${theme}, ${width} px`, async ({ notFoundPage }) => {
      await notFoundPage.page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await notFoundPage.page.setViewportSize({ width, height: 800 });
      await notFoundPage.open('/team/northwind/pins/old');
      await expect(notFoundPage.title).toBeVisible();
      await expect(notFoundPage.page).toHaveScreenshot(`not-found-${theme}-${width}.png`, {
        fullPage: true,
      });
    });
  }
}
