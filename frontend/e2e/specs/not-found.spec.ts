// Acceptance Test
// Traces to: L2-038
// Description: An address that belongs to no screen says so and offers the way back to the globe

import { expect, test } from '../fixtures/test';
import { mockMarkup } from '../support/mocks';

test.describe('Not Found', () => {
  test('an address that belongs to no screen says it fell off the map', async ({
    notFoundPage,
  }) => {
    // Given an address that belongs to no screen
    // When it is opened
    await notFoundPage.open('/team/northwind/pins/old');

    // Then a page says so, with the lowercase wordmark and a small globe
    await expect(notFoundPage.title).toHaveText('This page fell off the map');
    await expect(notFoundPage.wordmark).toHaveText('mondino');
    await expect(notFoundPage.globe).toBeVisible();
    await expect(notFoundPage.text).toHaveText(
      `There’s nothing at ${notFoundPage.shownAddress('/team/northwind/pins/old')}. It may have moved, or the link was mistyped.`,
    );
    await expect(notFoundPage.page).toHaveTitle('Page not found · Mondino');
  });

  test('the small globe is the still picture the mock draws', async ({ notFoundPage }) => {
    // Given the still globe the Not Found mock draws
    const drawn = await notFoundPage.globeShapesIn(mockMarkup('pages/not-found/default.html'));

    // When an address that belongs to no screen is opened
    await notFoundPage.open('/team/northwind/pins/old');

    // Then its small globe is that picture, shape for shape
    expect(drawn).not.toEqual([]);
    expect(await notFoundPage.globeShapes()).toEqual(drawn);
  });

  test('the address is shown as text, without its query string', async ({ notFoundPage }) => {
    // Given an address with a query string and markup in its path
    // When it is opened
    await notFoundPage.open('/old/%3Cb%3Ebold%3Cb%3E?token=secret#part');

    // Then the path is shown as its literal characters, and the query string is not shown
    await expect(notFoundPage.address).toHaveText(
      notFoundPage.shownAddress('/old/%3Cb%3Ebold%3Cb%3E'),
    );
    await expect(notFoundPage.text).not.toContainText('secret');
    await expect(notFoundPage.text).not.toContainText('part');
  });

  test('it offers the way back to the globe, where someone on no team is told an invite link is needed', async ({
    notFoundPage,
    inviteNeededPage,
  }) => {
    // Given the Not Found page, opened by someone on no team
    await notFoundPage.open('/nowhere');

    // When "Back to the globe" is used
    await expect(notFoundPage.backToTheGlobe).toHaveAttribute('href', '/globe');
    await notFoundPage.backToTheGlobe.click();

    // Then the address is the Globe screen's, and it says an invite link is needed
    await expect(notFoundPage.page).toHaveURL(/\/globe$/);
    await expect(inviteNeededPage.title).toHaveText('You need an invite link');
  });

  test('"Skip to content" is the first stop and moves focus to the page', async ({
    notFoundPage,
  }) => {
    // Given the Not Found page, drawn
    await notFoundPage.open('/nowhere');
    await expect(notFoundPage.title).toBeVisible();

    // When Tab is pressed once, then Enter
    await notFoundPage.page.keyboard.press('Tab');
    await expect(notFoundPage.skipLink).toBeFocused();
    await notFoundPage.page.keyboard.press('Enter');

    // Then focus is on the page's content, at the same address
    await expect(notFoundPage.main).toBeFocused();
    await expect(notFoundPage.page).toHaveURL(/\/nowhere$/);
  });
});
