// Accessibility sweep. Runs only when a person asks: npm run e2e:accessibility
// Traces to: L2-039, L2-041, L2-005, L2-007, L2-008, L2-010, L2-012, L2-014, L2-015, L2-016, L2-017, L2-018, L2-019, L2-021, L2-023, L2-024, L2-025, L2-033, L2-034, L2-049

import type { Page } from '@playwright/test';
import type { ApiFixture } from '../fixtures/api';
import { expect, test } from '../fixtures/test';
import {
  lookupAnswer,
  NORTHWIND_INVITE,
  NORTHWIND_JOINS,
  NORTHWIND_LOOKUPS,
  northwindInvite,
  SOFIA_JOINED,
} from '../fixtures/invites';
import { NORTHWIND_MOMENTS, northwindMoments } from '../fixtures/moments';
import { NOW } from '../fixtures/now';
import {
  idOf,
  NORTHWIND_PINS,
  northwindPins,
  northwindPinsOf,
  northwindPinsWhere,
  teamOf500,
} from '../fixtures/pins';
import type { GlobePage } from '../pages/globe.page';
import type { JoinPage } from '../pages/join.page';
import { expectNoViolations } from '../support/axe';
import { rememberTeam } from '../support/membership';
import { pauseTheClock } from '../support/turning';

interface Given {
  api: ApiFixture;
  page: Page;
  globePage: GlobePage;
  joinPage: JoinPage;
}

interface State {
  /** Reaches the state, and gives back what lets go of an answer it holds, if it holds one. */
  reach: (given: Given) => Promise<(() => void) | void>;
  /** Whether the 3D globe is drawn: the still picture stands in for it otherwise. */
  webgl?: boolean;
  /** Whether the state is reached with the page's clock paused. */
  clockPaused?: boolean;
}

/** Sofia, on Northwind, opens the Globe at the address given, the team answered as `pins`. */
async function openNorthwind(
  { api, page, globePage }: Given,
  pins = northwindPins(),
  teammateId?: string,
): Promise<void> {
  await rememberTeam(page);
  api.answer('GET', NORTHWIND_PINS, pins);
  await (teammateId ? globePage.openAt(teammateId) : globePage.open());
}

/** Each drawn state of the Globe, reached as the behaviour specs reach it. */
const states: Record<string, State> = {
  default: {
    webgl: true,
    reach: async (given) => {
      given.api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());
      await openNorthwind(given);
      await expect(given.globePage.canvas).toBeVisible();
      await expect(given.globePage.week).toBeVisible();
    },
  },
  selected: {
    reach: async (given) => {
      given.api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());
      await openNorthwind(given, northwindPins(), idOf('Tomás Herrera'));
      await expect(given.globePage.personName).toHaveText('Tomás Herrera');
    },
  },
  'selected-self': {
    reach: async (given) => {
      await openNorthwind(given, northwindPins(), idOf('Sofia Bianchi'));
      await expect(given.globePage.personYou).toBeVisible();
    },
  },
  'selected-asleep': {
    reach: async (given) => {
      given.api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());
      await openNorthwind(given, northwindPins(), idOf('Noah Williams'));
      await expect(given.globePage.personName).toHaveText('Noah Williams');
    },
  },
  'pin-lifted': {
    reach: async (given) => {
      const { api, page, globePage } = given;
      await page.emulateMedia({ reducedMotion: 'reduce' });
      api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());
      await openNorthwind(given);
      await expect(globePage.markerOf('Liam O’Connor')).toBeVisible();
      await globePage.pin('Liam O’Connor').hover();
      await expect(globePage.labelMomentOf('Liam O’Connor')).toBeVisible();
    },
  },
  'just-joined': {
    clockPaused: true,
    reach: async ({ api, joinPage, globePage }) => {
      api.answer('GET', NORTHWIND_INVITE, northwindInvite());
      api.answer('POST', NORTHWIND_LOOKUPS, (route) =>
        lookupAnswer(route.request().postDataJSON()),
      );
      api.answer('POST', NORTHWIND_JOINS, SOFIA_JOINED);
      api.answer('GET', NORTHWIND_PINS, northwindPins());
      await joinPage.open('northwind-7Kq2');
      await joinPage.fill({ name: 'Sofia Bianchi', country: 'Italy', postalCode: '20121' });
      await joinPage.leavePostalCode();
      await expect(joinPage.submit).toHaveText('Join Northwind');
      // The toast goes by itself after 4 seconds; the clock stands still so it is there for axe
      await pauseTheClock(joinPage.page);
      await joinPage.submit.click();
      await expect
        .poll(async () => {
          await globePage.page.clock.runFor(16);
          return globePage.toast.count();
        })
        .toBe(1);
      await expect
        .poll(async () => {
          await globePage.page.clock.runFor(16);
          return globePage.youLabel.count();
        })
        .toBe(1);
    },
  },
  group: {
    reach: async (given) => {
      await openNorthwind(given);
      await given.globePage.pin('2 teammates close together').click();
      await expect(given.globePage.groupTitle).toHaveText('2 teammates close together');
    },
  },
  hundreds: {
    reach: async (given) => {
      await openNorthwind(given, teamOf500());
      await expect(given.globePage.title).toHaveText('500 teammates');
    },
  },
  'sharing-off': {
    reach: async (given) => {
      await openNorthwind(
        given,
        northwindPinsWhere((pin) =>
          pin.name === 'Ahmed Al-Sayed'
            ? { ...pin, sharesStatus: false, weather: null, weatherState: 'NotShared' }
            : pin,
        ),
        idOf('Ahmed Al-Sayed'),
      );
      await expect(given.globePage.privateNote).toBeVisible();
    },
  },
  quiet: {
    clockPaused: true,
    reach: async (given) => {
      const { page, globePage } = given;
      await openNorthwind(
        given,
        northwindPinsOf('Sofia Bianchi', 'Mara Lindqvist', 'Liam O’Connor'),
      );
      await expect(globePage.title).toHaveText('3 teammates');
      // Left open until 23:30 in Milan, when nobody is in working hours
      await page.clock.pauseAt(new Date(NOW.getTime() + (8 * 60 + 25) * 60_000));
      await page.clock.runFor(1_000);
      await expect(globePage.workingEmpty).toBeVisible();
    },
  },
  'no-moments': {
    reach: async (given) => {
      await openNorthwind(given);
      await expect(given.globePage.weekEmpty).toBeVisible();
    },
  },
  loading: {
    reach: async ({ api, page, globePage }) => {
      await rememberTeam(page);
      const held = api.hold('GET', NORTHWIND_PINS);
      await globePage.open();
      await expect(globePage.placeholder).toBeVisible();
      await expect(globePage.announcement).toHaveText('Loading your team…');
      return () => held.release(northwindPins());
    },
  },
  empty: {
    reach: async (given) => {
      await openNorthwind(given, northwindPinsOf('Sofia Bianchi'));
      await expect(given.globePage.inviteCard).toBeVisible();
    },
  },
  error: {
    reach: async (given) => {
      await openNorthwind(given, { unanswered: true });
      await expect(given.globePage.errorTitle).toBeVisible();
    },
  },
  'globe-unavailable': {
    webgl: false,
    reach: async (given) => {
      await openNorthwind(given);
      await expect(given.globePage.stillPicture).toBeVisible();
      await expect(given.globePage.panel).toBeVisible();
    },
  },
  'fahrenheit-12-hour': {
    reach: async (given) => {
      given.api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());
      await openNorthwind(
        given,
        northwindPinsWhere((pin) => ({ ...pin, isViewer: pin.name === 'Jordan Lee' })),
        idOf('Tomás Herrera'),
      );
      await expect(given.globePage.personTemperature).toHaveText(/°F$/);
    },
  },
  'weather-unavailable': {
    reach: async (given) => {
      await openNorthwind(
        given,
        northwindPinsWhere((pin) => ({ ...pin, weather: null, weatherState: 'Unavailable' })),
        idOf('Tomás Herrera'),
      );
      await expect(given.globePage.personWeatherNote).toBeVisible();
    },
  },
};

for (const [state, { reach, webgl = false, clockPaused = false }] of Object.entries(states)) {
  test.describe(`Globe ${state}`, () => {
    test.use({ webgl });

    for (const theme of ['light', 'dark'] as const) {
      test(`Globe ${state} has no WCAG 2.2 AA violation, ${theme}`, async ({
        api,
        page,
        globePage,
        joinPage,
      }) => {
        await page.emulateMedia({ colorScheme: theme });
        const release = await reach({ api, page, globePage, joinPage });

        await expectNoViolations(page, { clockPaused });
        release?.();
      });
    }
  });
}
