// Acceptance Test
// Traces to: L2-008, L2-047
// Description: Leaving the Globe screen leaves no WebGL context, drawing, observer or listener of the globe's behind; a hidden tab draws nothing and is right at once when shown

import { expect, test } from '../fixtures/test';
import { watchWhatIsHeld, whatIsHeld } from '../support/globe-resources';
import { rememberTeam } from '../support/membership';
import { NORTHWIND_PINS, northwindPins, northwindPinsOf } from '../fixtures/pins';
import { brightness, coloursAt, placeOnGlobe } from '../support/globe-pixels';

/** Northwind's counts at 15:05 UTC, an hour after the cast's "now". */
const HOUR_LATER_COUNTS = '12 time zones · 9 working · 2 asleep';

test.describe('Globe: leaving it releases the globe', () => {
  test('entering and leaving the Globe leaves no context, drawing, observer or listener behind', async ({
    api,
    page,
    notFoundPage,
    globePage,
  }) => {
    await watchWhatIsHeld(page);
    await rememberTeam(page);
    api.answer('GET', NORTHWIND_PINS, northwindPinsOf('Sofia Bianchi'));

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

  test('a tab hidden for an hour draws nothing, and shown again has its local times, statuses and night side right at once', async ({
    api,
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
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    // The globe holds still, so the night side's pixels are where the spec looks (ADR 0013).
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // Off the Horn of Africa the sun sets between 14:05 and 15:05 UTC on 27 October
    const hornOfAfrica = placeOnGlobe(0, 50)!;

    // Given the Globe at 14:05 UTC
    await globePage.open();
    await expect(globePage.canvas).toBeVisible();
    await expect(globePage.counts).toHaveText('12 time zones · 8 working · 2 asleep');
    const times = await globePage.workingRowTexts();
    const [day] = await coloursAt(globePage.canvas, [hornOfAfrica]);

    // When the tab is hidden for an hour
    await page.evaluate(() =>
      (window as unknown as { __setHidden(v: boolean): void }).__setHidden(true),
    );
    const hidden = await whatIsHeld(page);
    await page.clock.fastForward('01:00:00');
    await page.clock.runFor(1_000);

    // Then nothing was drawn
    expect((await whatIsHeld(page)).draws).toBe(hidden.draws);

    // And shown again, before the next minute begins, the statuses, the local times and the
    // night side are those of 15:05
    await page.evaluate(() =>
      (window as unknown as { __setHidden(v: boolean): void }).__setHidden(false),
    );
    await expect(globePage.counts).toHaveText(HOUR_LATER_COUNTS);
    expect(await globePage.workingRowTexts()).not.toEqual(times);
    await expect
      .poll(async () => brightness((await coloursAt(globePage.canvas, [hornOfAfrica]))[0]))
      .toBeLessThan(brightness(day) * 0.75);
  });
});
