// Acceptance Test
// Traces to: L2-008, L2-047
// Description: Leaving the Globe screen leaves no WebGL context, drawing, observer or listener of the globe's behind; a hidden tab draws nothing

import { expect, test } from '../fixtures/test';
import { watchWhatIsHeld, whatIsHeld } from '../support/globe-resources';
import { rememberTeam } from '../support/membership';

test.describe('Globe: leaving it releases the globe', () => {
  test('entering and leaving the Globe leaves no context, drawing, observer or listener behind', async ({
    page,
    notFoundPage,
    globePage,
  }) => {
    await watchWhatIsHeld(page);
    await rememberTeam(page);

    // Given a teammate on another screen, who goes to the Globe from it
    await notFoundPage.open('/somewhere-else');
    const before = await whatIsHeld(page);
    await notFoundPage.backToTheGlobe.click();
    await expect(globePage.canvas).toBeVisible();
    const drawn = await whatIsHeld(page);
    expect(drawn.liveContexts).toBe(1);

    // When they leave the Globe for the screen before it, three times over
    for (let visit = 0; visit < 3; visit++) {
      await page.goBack();
      await expect(notFoundPage.main).toBeVisible();
      if (visit < 2) {
        await page.goForward();
        await expect(globePage.canvas).toBeVisible();
      }
    }

    // Then every context the globe made is lost, and nothing of it observes or listens
    const left = await whatIsHeld(page);
    expect(left.contexts).toBe(3);
    expect(left.liveContexts).toBe(0);
    expect(left.observing).toBe(before.observing);
    expect(left.schemeListeners).toBe(before.schemeListeners);
    expect(left.visibilityListeners).toBe(before.visibilityListeners);

    // And nothing is drawn as time passes
    await page.clock.runFor(2_000);
    expect((await whatIsHeld(page)).draws).toBe(left.draws);
  });

  test('a hidden tab draws nothing, and draws again when it is shown', async ({
    page,
    globePage,
  }) => {
    await watchWhatIsHeld(page);
    await page.addInitScript(() => {
      let hidden = false;
      Object.defineProperty(document, 'hidden', { get: () => hidden });
      Object.assign(window, {
        __setHidden(value: boolean) {
          hidden = value;
          document.dispatchEvent(new Event('visibilitychange'));
        },
      });
    });
    await rememberTeam(page);
    await globePage.open();
    await expect(globePage.canvas).toBeVisible();

    // When the tab is hidden for an hour
    await page.evaluate(() =>
      (window as unknown as { __setHidden(v: boolean): void }).__setHidden(true),
    );
    const hidden = await whatIsHeld(page);
    await page.clock.fastForward('01:00:00');
    await page.clock.runFor(1_000);

    // Then nothing was drawn
    expect((await whatIsHeld(page)).draws).toBe(hidden.draws);

    // And shown again, the globe is drawn at once, with the sun where it is now
    await page.evaluate(() =>
      (window as unknown as { __setHidden(v: boolean): void }).__setHidden(false),
    );
    await expect.poll(async () => (await whatIsHeld(page)).draws).toBeGreaterThan(hidden.draws);
  });
});
