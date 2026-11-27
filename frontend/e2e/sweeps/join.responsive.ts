// Responsive sweep. Runs only when a person asks: npm run e2e:responsive
// Traces to: L2-037, L2-001

import { expect, test } from '../fixtures/test';
import { NORTHWIND_INVITE, northwindInvite } from '../fixtures/invites';
import { cutOff, fitsItsWidth, smallestTarget, WIDTHS } from '../support/layout';

for (const width of WIDTHS) {
  test(`Join fits ${width} px`, async ({ api, joinPage }) => {
    api.answer('GET', NORTHWIND_INVITE, northwindInvite());
    await joinPage.page.setViewportSize({ width, height: 800 });
    await joinPage.open('northwind-7Kq2');

    await expect(joinPage.team).toBeVisible();
    expect(await cutOff(joinPage.page)).toEqual([]);
    expect(await fitsItsWidth(joinPage.page), 'no horizontal scroll').toBe(true);
    expect(await smallestTarget(joinPage.placeMyPin)).toBeGreaterThanOrEqual(44);
    expect(await smallestTarget(joinPage.name)).toBeGreaterThanOrEqual(44);
    expect(await smallestTarget(joinPage.country)).toBeGreaterThanOrEqual(44);
  });
}
