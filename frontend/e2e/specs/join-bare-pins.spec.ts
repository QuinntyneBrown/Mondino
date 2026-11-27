// Acceptance Test
// Traces to: L2-001
// Description: The Join screen's globe shows a bare pin for each teammate; a teammate already in the team goes to the Globe

import { expect, test } from '../fixtures/test';
import { NORTHWIND_INVITE, northwindInvite } from '../fixtures/invites';
import { mockMarkup } from '../support/mocks';

test.describe('Join: the team on the globe', () => {
  // The mock draws the still picture; the 3D globe's pins are join-globe.spec.ts's.
  test.use({ webgl: false });

  test('the globe carries a pin for each of the 12 teammates', async ({ api, joinPage }) => {
    // Given a valid invite link for Northwind, with 12 teammates
    api.answer('GET', NORTHWIND_INVITE, northwindInvite());

    // When a person opens it
    await joinPage.open('northwind-7Kq2');

    // Then the globe is named for its 12 pins, and those on the near side are drawn
    await expect(joinPage.globe).toHaveAccessibleName(
      'The globe, with 12 pins: one for each teammate already in Northwind',
    );
    await expect(joinPage.pins).toHaveCount(8);
  });

  test('the pins are where the mock draws them', async ({ api, joinPage }) => {
    // Given the pins the Join mock draws for Northwind
    const drawn = await joinPage.pinPlacesIn(mockMarkup('pages/join/default.html'));

    // When Northwind's invite link is opened
    api.answer('GET', NORTHWIND_INVITE, northwindInvite());
    await joinPage.open('northwind-7Kq2');
    await expect(joinPage.pins).toHaveCount(drawn.length);

    // Then each pin is within half a percent of the globe of where the mock draws it
    const places = await joinPage.pinPlaces();
    expect(places).toHaveLength(drawn.length);
    places.forEach((place, i) => {
      expect(Math.abs(place.x - drawn[i].x)).toBeLessThan(0.5);
      expect(Math.abs(place.y - drawn[i].y)).toBeLessThan(0.5);
    });
  });

  test('a bare pin has no name, no colour of its own and nothing to read', async ({
    api,
    joinPage,
  }) => {
    // Given a valid invite link
    api.answer('GET', NORTHWIND_INVITE, northwindInvite());

    // When the Join screen is shown
    await joinPage.open('northwind-7Kq2');
    await expect(joinPage.pins).toHaveCount(8);

    // Then each pin is a bare dot in the pin colour, hidden from assistive technology, with no text
    for (const pin of await joinPage.pins.all()) {
      await expect(pin).not.toHaveClass(/hue-/);
      await expect(pin).toHaveText('');
    }
    await expect(joinPage.pinLayer).toHaveAttribute('aria-hidden', 'true');
  });

  test('a teammate already in the team on this device goes to the Globe', async ({
    api,
    joinPage,
  }) => {
    // Given a person whose session already belongs to a teammate of Northwind
    api.answer(
      'GET',
      NORTHWIND_INVITE,
      northwindInvite({ alreadyJoined: true, positions: [], avatars: [] }),
    );

    // When they open the team's invite link
    await joinPage.open('northwind-7Kq2');

    // Then they are taken to the Globe screen, and the Join form is not shown
    await expect(joinPage.page).toHaveURL(/\/globe$/);
    await expect(joinPage.form).toHaveCount(0);
  });
});
