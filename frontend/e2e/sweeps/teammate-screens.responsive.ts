// Responsive sweep. Runs only when a person asks: npm run e2e:responsive
// Traces to: L2-037, L2-038

import type { Locator } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import { NORTHWIND_MOMENTS, northwindMoments } from '../fixtures/moments';
import { idOf, NORTHWIND_PINS, northwindPins, teamOf500 } from '../fixtures/pins';
import { NORTHWIND_ME, sofiaProfile } from '../fixtures/profile';
import { cutOff, fitsItsWidth, touchTarget, WIDTHS } from '../support/layout';
import { rememberTeam } from '../support/membership';

/** Every pressable control on the page, outside the globe, is at least 44 × 44 px. */
async function targetsOf(controls: Locator): Promise<void> {
  for (const control of await controls.all()) {
    if (!(await control.isVisible())) continue;
    const target = await touchTarget(control);
    expect(Math.min(target.width, target.height), await control.innerText()).toBeGreaterThanOrEqual(
      44,
    );
  }
}

test.use({ webgl: false });

test.beforeEach(async ({ api, page }) => {
  await rememberTeam(page);
  api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());
  api.answer('GET', NORTHWIND_ME, sofiaProfile());
});

for (const width of WIDTHS) {
  for (const height of [800, 480]) {
    test(`the four teammate screens fit ${width} × ${height} px`, async ({
      api,
      page,
      appHeader,
      globePage,
      teamPage,
      momentsPage,
      profilePage,
    }) => {
      api.answer('GET', NORTHWIND_PINS, northwindPins());
      await page.setViewportSize({ width, height });
      const screens: [() => Promise<void>, Locator][] = [
        [() => globePage.open(), globePage.panel],
        [() => globePage.openAt(idOf('Tomás Herrera')), globePage.person],
        [() => teamPage.open(), teamPage.main],
        [() => momentsPage.open(), momentsPage.rows.first()],
        [() => profilePage.open(), profilePage.city],
      ];
      for (const [open, ready] of screens) {
        await open();
        await expect(ready).toBeVisible();
        expect(await fitsItsWidth(page), 'no horizontal scroll').toBe(true);
        expect(await cutOff(page)).toEqual([]);
        await targetsOf(appHeader.controls);
      }
    });
  }

  test(`a team of 500 fits ${width} px on the Globe and Team`, async ({
    api,
    page,
    globePage,
    teamPage,
  }) => {
    api.answer('GET', NORTHWIND_PINS, teamOf500());
    await page.setViewportSize({ width, height: 800 });
    await globePage.open();
    await expect(globePage.panel).toBeVisible();
    expect(await fitsItsWidth(page), 'no horizontal scroll').toBe(true);
    expect(await cutOff(page)).toEqual([]);
    await teamPage.open();
    await expect(teamPage.search).toBeVisible();
    expect(await fitsItsWidth(page), 'no horizontal scroll').toBe(true);
    expect(await cutOff(page)).toEqual([]);
  });

  test(`the invite dialog and "Leave Northwind?" fit ${width} px`, async ({
    api,
    page,
    globePage,
    inviteDialog,
    profilePage,
    leaveDialog,
  }) => {
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    await page.setViewportSize({ width, height: 800 });
    await globePage.open();
    await globePage.inviteTeammate.click();
    await expect(inviteDialog.dialog).toBeVisible();
    expect(await fitsItsWidth(page), 'no horizontal scroll').toBe(true);
    await targetsOf(inviteDialog.controls);

    await profilePage.open();
    await profilePage.leave.click();
    await expect(leaveDialog.dialog).toBeVisible();
    expect(await fitsItsWidth(page), 'no horizontal scroll').toBe(true);
  });
}
