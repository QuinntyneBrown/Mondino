// Acceptance Test
// Traces to: L2-005, L2-042, L2-012, L2-013, L2-040
// Description: Straight after joining, the Globe shows the new pin pulsing once and a toast that says so and dismisses itself

import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { expect, test } from '../fixtures/test';
import {
  lookupAnswer,
  NORTHWIND_INVITE,
  NORTHWIND_JOINS,
  NORTHWIND_LOOKUPS,
  northwindInvite,
  SOFIA_JOINED,
} from '../fixtures/invites';
import { letTimePass, pauseTheClock } from '../support/turning';
import { announcements, fastRepeats, listenForAnnouncements } from '../support/accessibility';

test.describe('Globe: just joined', () => {
  test.beforeEach(({ api }) => {
    api.answer('GET', NORTHWIND_INVITE, northwindInvite());
    api.answer('POST', NORTHWIND_LOOKUPS, (route) => lookupAnswer(route.request().postDataJSON()));
    api.answer('POST', NORTHWIND_JOINS, SOFIA_JOINED);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
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
    // When Sofia joins Northwind. The clock is stopped before she presses "Join", so the toast's
    // 4 seconds pass only as the steps below say, however slow the machine is
    await joinPage.open('northwind-7Kq2');
    await joinPage.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });
    await joinPage.leavePostalCode();
    await expect(joinPage.submit).toHaveText('Join Northwind');
    await pauseTheClock(joinPage.page);
    await listenForAnnouncements(joinPage.page);
    await joinPage.submit.click();

    // Then the Globe opens, and a toast, in a region that announces it once, says she is on the map
    await expect
      .poll(async () => {
        await globePage.page.clock.runFor(16);
        return globePage.toast.count();
      })
      .toBe(1);
    await expect(globePage.page).toHaveURL('/globe');
    await expect(globePage.toastRegion).toHaveAttribute('role', 'status');
    await expect(globePage.toast).toHaveText(
      'You’re on the map. Northwind can now see your pin in Milan.',
    );
    const toasts = async () =>
      (await announcements(globePage.page)).filter((said) => said.text.startsWith('You’re on'));
    // And the new pin's pulse runs once, and nothing repeats more than three times a second
    expect(await fastRepeats(globePage.page)).toEqual([]);
    expect(await toasts()).toEqual([
      {
        politeness: 'polite',
        text: expect.stringMatching(
          /^You’re on the map\. Northwind can now see your pin in Milan\./,
        ),
      },
    ]);

    // And the toast dismisses itself after 4 seconds
    await letTimePass(globePage.page, 3_000);
    await expect(globePage.toast).toBeVisible();
    await letTimePass(globePage.page, 1_000);
    await expect(globePage.toast).toHaveCount(0);
    expect(await toasts()).toHaveLength(1);

    // And her pin is on the globe, lifted and labelled, pulsing once; the clock stays stopped so
    // the globe does not turn her pin out of view while it is looked at
    await expect
      .poll(async () => {
        await globePage.page.clock.runFor(16);
        return globePage.youLabel.count();
      })
      .toBe(1);
    await expect(globePage.youLabel).toHaveText('Sofia Bianchi (you) · Milan');
    await expect(globePage.youPin).toHaveClass(/pin--new/);
    expect(await globePage.pulse()).not.toBe('none');
    await expect(globePage.globe).toHaveAccessibleName(
      'The globe, with 13 teammates’ pins. Drag to spin, or use the arrow keys.',
    );

    // And her pin is selected, so it stands alone, apart from Luca's in the same city
    await expect(globePage.youPin).toHaveAttribute('aria-pressed', 'true');
    await expect(globePage.pin('Luca Ferri')).toHaveAccessibleName(
      'Luca Ferri, Milan, 15:05, Working hours, Foggy 13°',
    );
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

  test('the Globe opened again shows no toast, and no pin new or selected', async ({
    joinPage,
    globePage,
  }) => {
    await join(joinPage);
    await expect(globePage.toast).toBeVisible();

    await globePage.page.reload();

    await expect(globePage.globe).toBeVisible();
    await expect(globePage.toast).toHaveCount(0);
    await expect(globePage.pin('2 teammates close together')).toBeVisible();
    await expect(globePage.liftedPins).toHaveCount(0);
    await expect(globePage.newPins).toHaveCount(0);
  });
});
