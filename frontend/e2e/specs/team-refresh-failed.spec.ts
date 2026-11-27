// Acceptance Test
// Traces to: L2-048, L2-049, L2-040
// Description: When a refresh fails, the screen keeps what it shows and its clocks tick, and a banner under the header says so as notifications/refresh-banner/warning draws it, naming the weather alone on Team; "Try again" reads "Trying…" until a refresh works, and the banner then goes with no message

import type { Answer, ApiFixture } from '../fixtures/api';
import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { expect, test } from '../fixtures/test';
import { rememberTeam } from '../support/membership';
import { mockBanner } from '../support/mocks';
import { announcements, listenForAnnouncements } from '../support/accessibility';

const unreachable: Answer = { unanswered: true };

/** Answers the first read of the pins, then each later one as `later` says, counting the reads. */
function answerThenFail(api: ApiFixture): {
  reads: () => number;
  later: (answer: Answer | Promise<Answer>) => void;
} {
  let reads = 0;
  let later: Answer | Promise<Answer> = unreachable;
  api.answer('GET', NORTHWIND_PINS, () => (++reads === 1 ? northwindPins() : later));
  return { reads: () => reads, later: (answer) => (later = answer) };
}

/** The mock's banner, with the time the screen read the team: 15:05 in Milan. */
function bannerAt(time: string) {
  const mock = mockBanner('notifications/refresh-banner/warning.html');
  return { ...mock, text: mock.text.replace('14:50', time) };
}

test.describe('Keep the team fresh: a refresh that fails', () => {
  test.use({ webgl: false });

  test('the Globe keeps its team and its clocks, and the banner offers "Try again" until a refresh works', async ({
    api,
    page,
    globePage,
    refreshBanner,
  }) => {
    // Given Sofia has the Globe open at 15:05 in Milan, read once
    await rememberTeam(page);
    const pins = answerThenFail(api);
    await globePage.open();
    await expect(globePage.title).toHaveText('13 teammates');
    await expect(refreshBanner.banner).toHaveCount(0);
    await listenForAnnouncements(page);

    // When Mondino cannot be reached at the next refresh, 15 minutes on
    await page.clock.fastForward('15:00');

    // Then a banner under the header says so, as the mock draws it, read at 15:05
    await expect(refreshBanner.banner).toBeVisible();
    expect(await refreshBanner.parts()).toEqual(bannerAt('15:05'));
    expect(await refreshBanner.isUnderTheHeader()).toBe(true);

    // And the screen keeps its team, and its clocks tick on: Chloé's is 11:20 in São Paulo
    await expect(globePage.title).toHaveText('13 teammates');
    await expect(globePage.pin('Chloé Martin')).toHaveAccessibleName(
      /^Chloé Martin, São Paulo, 11:20,/,
    );

    // And it is tried again at the next minute, and still says so
    await page.clock.fastForward('01:00');
    await expect.poll(pins.reads).toBe(3);
    await expect(refreshBanner.text).toContainText('from 15:05.');
    // Said once, politely, while the clocks tick on and the tries fail: it keeps what is shown
    expect(
      (await announcements(page)).filter((said) => said.text.startsWith('Couldn’t refresh')),
    ).toEqual([{ politeness: 'polite', text: expect.stringMatching(/^Couldn’t refresh\./) }]);

    // When "Try again" is used while Mondino answers slowly
    let answer!: (answer: Answer) => void;
    pins.later(new Promise<Answer>((resolve) => (answer = resolve)));
    await refreshBanner.tryAgain.click();

    // Then it reads "Trying…" and cannot be used again meanwhile
    await expect(refreshBanner.tryAgain).toHaveText('Trying…');
    await expect(refreshBanner.tryAgain).toBeDisabled();
    expect(pins.reads()).toBe(4);

    // And when the read succeeds, the banner goes, with no message
    answer(northwindPins());
    await expect(refreshBanner.banner).toHaveCount(0);
    await expect(globePage.toast).toHaveCount(0);
  });

  test('on Team the banner names the weather alone, and on Moments the weather and moments', async ({
    api,
    page,
    teamPage,
    momentsPage,
    refreshBanner,
  }) => {
    await rememberTeam(page);
    answerThenFail(api);
    await teamPage.open();
    await expect(teamPage.title).toBeVisible();

    await page.clock.fastForward('15:00');

    await expect(refreshBanner.text).toHaveText(
      'Couldn’t refresh. Clocks are live; weather is from 15:05.',
    );

    await momentsPage.momentsLink.click();
    await expect(momentsPage.title).toBeVisible();
    await expect(refreshBanner.text).toHaveText(
      'Couldn’t refresh. Clocks are live; weather and moments are from 15:05.',
    );
  });
});
