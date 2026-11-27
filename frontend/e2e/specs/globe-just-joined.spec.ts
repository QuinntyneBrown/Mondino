// Acceptance Test
// Traces to: L2-005, L2-042
// Description: Straight after joining, the Globe shows the new pin pulsing once and a toast that says so and dismisses itself

import { expect, test } from '../fixtures/test';
import {
  lookupAnswer,
  NORTHWIND_INVITE,
  NORTHWIND_JOINS,
  NORTHWIND_LOOKUPS,
  northwindInvite,
  SOFIA_JOINED,
} from '../fixtures/invites';

test.describe('Globe: just joined', () => {
  test.beforeEach(({ api }) => {
    api.answer('GET', NORTHWIND_INVITE, northwindInvite());
    api.answer('POST', NORTHWIND_LOOKUPS, (route) => lookupAnswer(route.request().postDataJSON()));
    api.answer('POST', NORTHWIND_JOINS, SOFIA_JOINED);
  });

  async function join(joinPage: import('../pages/join.page').JoinPage): Promise<void> {
    await joinPage.open('northwind-7Kq2');
    await joinPage.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });
    await joinPage.leavePostalCode();
    await expect(joinPage.submit).toHaveText('Join Northwind');
    await joinPage.submit.click();
  }

  test('the new pin is on the globe, lifted and pulsing, and a toast says so', async ({
    joinPage,
    globePage,
  }) => {
    // When Sofia joins Northwind
    await join(joinPage);

    // Then the Globe opens, and a toast, in a region that announces it once, says she is on the map
    await expect(globePage.page).toHaveURL('/globe');
    await expect(globePage.toastRegion).toHaveAttribute('role', 'status');
    await expect(globePage.toast).toHaveText(
      'You’re on the map. Northwind can now see your pin in Milan.',
    );

    // And it dismisses itself after 4 seconds
    await globePage.page.clock.runFor(3_900);
    await expect(globePage.toast).toBeVisible();
    await globePage.page.clock.runFor(200);
    await expect(globePage.toast).toHaveCount(0);

    // And her pin is on the globe, lifted and labelled, pulsing once
    await expect(globePage.youLabel).toHaveText('Sofia Bianchi (you) · Milan');
    await expect(globePage.youPin).toHaveClass(/pin-dot--new/);
    expect(await globePage.pulse()).not.toBe('none');
    await expect(globePage.globe).toHaveAccessibleName('The globe, with your new pin in Milan');
  });

  test('the toast can be dismissed', async ({ joinPage, globePage }) => {
    await join(joinPage);

    await globePage.dismiss.click();

    await expect(globePage.toast).toHaveCount(0);
  });

  test('the new pin does not pulse under reduced motion', async ({ joinPage, globePage }) => {
    await globePage.page.emulateMedia({ reducedMotion: 'reduce' });

    await join(joinPage);

    await expect(globePage.youPin).toBeVisible();
    expect(await globePage.pulse()).toBe('none');
  });

  test('the Globe opened again shows no toast and no new pin', async ({ joinPage, globePage }) => {
    await join(joinPage);
    await expect(globePage.toast).toBeVisible();

    await globePage.page.reload();

    await expect(globePage.globe).toBeVisible();
    await expect(globePage.toast).toHaveCount(0);
    await expect(globePage.allPins).toHaveCount(0);
  });
});
