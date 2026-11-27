// Responsive sweep. Runs only when a person asks: npm run e2e:responsive
// Traces to: L2-037, L2-038

import { expect, test } from '../fixtures/test';
import { fitsItsWidth, smallestTarget } from '../support/layout';

for (const width of [320, 375, 576, 768, 992, 1200, 1920]) {
  test(`Not Found fits ${width} px`, async ({ notFoundPage }) => {
    await notFoundPage.page.setViewportSize({ width, height: 800 });
    await notFoundPage.open('/team/northwind/pins/a-very-long-address-that-has-to-wrap/old');

    await expect(notFoundPage.title).toBeVisible();
    expect(await fitsItsWidth(notFoundPage.page), 'no horizontal scroll').toBe(true);
    expect(await smallestTarget(notFoundPage.backToTheGlobe)).toBeGreaterThanOrEqual(44);
  });
}
