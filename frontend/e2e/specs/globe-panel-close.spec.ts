// Acceptance Test
// Traces to: L2-012, L2-023, L2-039, L2-042
// Description: A teammate's panel closes by its close button or Escape, clearing the selection; it changes to another teammate with a fade of 180 ms, none under reduced motion; opened from the keyboard, focus moves to its heading and back to the pin; what was selected is announced once

import { expect, test } from '../fixtures/test';
import { idOf, NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { mockPanel } from '../support/mocks';
import { rememberTeam } from '../support/membership';

test.describe('Globe: opening and closing a teammate’s panel', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ api, page }) => {
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
  });

  test('the close button clears the selection, and the pin settles back', async ({
    globePage,
    page,
  }) => {
    // Given Lena's panel is open
    await globePage.openAt(idOf('Lena Fischer'));
    await expect(globePage.personName).toHaveText('Lena Fischer');

    // When the close button, "Close Lena Fischer", is used
    await globePage.closePanel.click();

    // Then the panel is gone, Lena's pin is no longer selected or lifted, and the address has no id
    await expect(globePage.person).toHaveCount(0);
    await expect(globePage.pin('Lena Fischer')).toHaveAttribute('aria-pressed', 'false');
    await expect(globePage.pinItem('Lena Fischer')).not.toHaveClass(/globe__pin--lifted/);
    await expect(page).toHaveURL(/\/globe$/);
  });

  test('from the keyboard, focus moves to the heading, Escape closes and focus returns to the pin', async ({
    globePage,
    page,
  }) => {
    await globePage.open();
    await expect(globePage.pinButtons).toHaveCount(8);

    // When Lena's pin is chosen from the keyboard
    await globePage.pin('Lena Fischer').focus();
    await page.keyboard.press('Enter');

    // Then her panel opens with focus on its heading
    await expect(globePage.personName).toHaveText('Lena Fischer');
    await expect(globePage.personName).toBeFocused();

    // And when Escape is pressed, the panel closes and focus is back on her pin
    await page.keyboard.press('Escape');
    await expect(globePage.person).toHaveCount(0);
    await expect(globePage.pin('Lena Fischer')).toHaveAttribute('aria-pressed', 'false');
    await expect(globePage.pin('Lena Fischer')).toBeFocused();
    await expect(page).toHaveURL(/\/globe$/);
  });

  test('chosen by pointer, focus stays where it was', async ({ globePage }) => {
    await globePage.open();
    await globePage.pin('Lena Fischer').click();

    await expect(globePage.personName).toHaveText('Lena Fischer');
    await expect(globePage.personName).not.toBeFocused();
  });

  test('the panel changes to another teammate with a fade of 180 ms', async ({ globePage }) => {
    await globePage.openAt(idOf('Lena Fischer'));
    await expect(globePage.personName).toHaveText('Lena Fischer');
    await globePage.markPanel();

    await globePage.pin('Liam O’Connor').click();

    // Liam's panel is drawn afresh, so it fades in over --duration-base
    await expect(globePage.personName).toHaveText('Liam O’Connor');
    expect(await globePage.panelIsMarked()).toBe(false);
    const fade = await globePage.fade();
    expect(fade.name).toMatch(/fade-in$/);
    expect(fade.duration).toBe('0.18s');
  });

  test('under reduced motion the panel changes with no fade', async ({ globePage, page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await globePage.openAt(idOf('Lena Fischer'));
    await globePage.pin('Liam O’Connor').click();

    await expect(globePage.personName).toHaveText('Liam O’Connor');
    expect((await globePage.fade()).name).toBe('none');
  });

  test('what was selected is announced once, as the mocks word it', async ({ globePage, page }) => {
    // Given the mocks' announcement for Tomás
    expect(mockPanel('pages/globe/selected.html').announcement).toBe(
      'Tomás Herrera, Mexico City, selected.',
    );

    await globePage.openAt(idOf('Liam O’Connor'));
    await expect(globePage.announcement).toHaveText('Liam O’Connor, Dublin, selected.');
    await expect(globePage.announcement).toHaveAttribute('aria-live', 'polite');

    // And the minute ticking over changes nothing to announce
    await page.clock.runFor(60_000);
    await expect(globePage.personClock).toHaveText('14:06');
    await expect(globePage.announcement).toHaveText('Liam O’Connor, Dublin, selected.');

    // And the viewer's own pin is announced with "you", as selected-self words it
    await globePage.openAt(idOf('Sofia Bianchi'));
    await expect(globePage.announcement).toHaveText(
      mockPanel('pages/globe/selected-self.html').announcement!,
    );
  });
});
