// Acceptance Test
// Traces to: L2-023, L2-007
// Description: The selected teammate is held in the address as an opaque teammate id, so a reload or a shared address selects the same teammate; an id that is no pin of the team is taken out of the address

import { expect, test } from '../fixtures/test';
import { idOf, NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { rememberTeam } from '../support/membership';

test.describe('Globe: the selection in the address', () => {
  // The still picture holds still, with Europe and Africa at the front
  test.use({ webgl: false });

  test.beforeEach(async ({ api, page }) => {
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
  });

  test('a selected pin puts its teammate id in the address, and a reload selects them again', async ({
    globePage,
    page,
  }) => {
    // Given Sofia on the Globe with no pin selected
    await globePage.open();
    await expect(globePage.pin('Liam O’Connor')).toHaveAttribute('aria-pressed', 'false');

    // When she selects Liam's pin
    await globePage.pin('Liam O’Connor').click();

    // Then the address carries Liam's teammate id and nothing else: no name, city or postal code
    await expect(page).toHaveURL(/\?teammate=/);
    expect(globePage.address()).toBe(`/globe?teammate=${idOf('Liam O’Connor')}`);
    expect(decodeURIComponent(globePage.address())).not.toMatch(/Liam|Dublin|D02/i);

    // And when the page is reloaded, Liam's pin is selected again
    await page.reload();
    await expect(globePage.pin('Liam O’Connor')).toHaveAttribute('aria-pressed', 'true');
    expect(globePage.address()).toBe(`/globe?teammate=${idOf('Liam O’Connor')}`);
  });

  test('an address shared by a teammate selects the same teammate', async ({ globePage }) => {
    // When Sofia opens an address a teammate shared, with Lena selected
    await globePage.openAt(idOf('Lena Fischer'));

    // Then Lena's pin is selected and lifted
    await expect(globePage.pin('Lena Fischer')).toHaveAttribute('aria-pressed', 'true');
    await expect(globePage.pinItem('Lena Fischer')).toHaveClass(/globe__pin--lifted/);
  });

  test('an id that is no pin of the team selects nobody and leaves the address', async ({
    globePage,
    page,
  }) => {
    // When Sofia opens an address with a teammate id that is not on her team
    await globePage.openAt('00000000-0000-4000-8000-999999999999');

    // Then no pin is selected and the address no longer carries it
    await expect(globePage.pinButtons).toHaveCount(8);
    await expect(page).toHaveURL(/\/globe$/);
    for (const button of await globePage.pinButtons.all())
      await expect(button).toHaveAttribute('aria-pressed', 'false');
  });
});
