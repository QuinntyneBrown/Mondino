// Acceptance Test
// Traces to: L2-001, L2-008
// Description: The Join screen's stage draws the same 3D globe as the Globe screen, with the team's bare pins as plain markers, and the still picture where it cannot

import { expect, test } from '../fixtures/test';
import {
  lookupAnswer,
  NORTHWIND_INVITE,
  NORTHWIND_LOOKUPS,
  northwindInvite,
} from '../fixtures/invites';
import { BrowserRecord } from '../support/browser-record';

test.describe('Join: the 3D globe', () => {
  test.beforeEach(async ({ api }) => {
    api.answer('GET', NORTHWIND_INVITE, northwindInvite());
    api.answer('POST', NORTHWIND_LOOKUPS, (route) => lookupAnswer(route.request().postDataJSON()));
  });

  test('the stage draws the 3D globe with a bare pin for each teammate on its near side', async ({
    page,
    joinPage,
  }) => {
    const record = new BrowserRecord(page);

    // When a person opens Northwind's invite link
    await joinPage.open('northwind-7Kq2');

    // Then the 3D globe is drawn, named for its 12 pins, with the near side's pins over it
    await expect(joinPage.canvas).toBeVisible();
    await expect(joinPage.stillPicture).toHaveCount(0);
    await expect(joinPage.globe).toHaveAccessibleName(
      'The globe, with 12 pins: one for each teammate already in Northwind',
    );
    await expect(joinPage.pins).toHaveCount(8);
    await expect(joinPage.pinLayer).toHaveAttribute('aria-hidden', 'true');
    expect(record.origins()).toEqual(['http://127.0.0.1:4310']);
  });

  test('the city found puts the person’s own pin on the 3D globe', async ({ joinPage }) => {
    await joinPage.open('northwind-7Kq2');
    await expect(joinPage.canvas).toBeVisible();

    // When Sofia's postal code is found in Milan
    await joinPage.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });
    await joinPage.leavePostalCode();

    // Then her pin is lifted and labelled on the 3D globe
    await expect(joinPage.youLabel).toHaveText('You · Milan');
    await expect(joinPage.canvas).toBeVisible();
  });

  test.describe('in a browser without WebGL', () => {
    test.use({ webgl: false });

    test('the still picture carries the pins instead', async ({ joinPage }) => {
      await joinPage.open('northwind-7Kq2');

      await expect(joinPage.stillPicture).toBeVisible();
      await expect(joinPage.canvas).toHaveCount(0);
      await expect(joinPage.pins).toHaveCount(8);
    });
  });
});
