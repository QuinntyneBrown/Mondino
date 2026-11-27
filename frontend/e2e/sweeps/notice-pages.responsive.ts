// Responsive sweep. Runs only when a person asks: npm run e2e:responsive
// Traces to: L2-037, L2-038, L2-053

import { expect, test } from '../fixtures/test';
import { cutOff, fitsItsWidth, smallestTarget, WIDTHS } from '../support/layout';

for (const width of WIDTHS) {
  test(`Create Team, Left Team and "You need an invite link" fit ${width} px`, async ({
    page,
    createTeamPage,
    leftTeamPage,
    inviteNeededPage,
  }) => {
    await page.setViewportSize({ width, height: 800 });

    await createTeamPage.open();
    await expect(createTeamPage.title).toBeVisible();
    expect(await fitsItsWidth(page), 'no horizontal scroll').toBe(true);
    expect(await cutOff(page)).toEqual([]);
    for (const control of [
      createTeamPage.teamName,
      createTeamPage.postalCode,
      createTeamPage.submit,
    ])
      expect(await smallestTarget(control)).toBeGreaterThanOrEqual(44);

    await page.goto('/left');
    await expect(leftTeamPage.title).toBeVisible();
    expect(await fitsItsWidth(page), 'no horizontal scroll').toBe(true);
    expect(await cutOff(page)).toEqual([]);
    for (const action of await leftTeamPage.actions.all())
      expect(await smallestTarget(action)).toBeGreaterThanOrEqual(44);

    await page.goto('/moments');
    await expect(inviteNeededPage.title).toBeVisible();
    expect(await fitsItsWidth(page), 'no horizontal scroll').toBe(true);
    expect(await cutOff(page)).toEqual([]);
    for (const action of await inviteNeededPage.actions.all())
      expect(await smallestTarget(action)).toBeGreaterThanOrEqual(44);
  });
}
