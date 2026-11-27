// Accessibility sweep. Runs only when a person asks: npm run e2e:accessibility
// Traces to: L2-039, L2-041, L2-014, L2-015, L2-019, L2-026, L2-027, L2-028, L2-047, L2-049, L2-056

import type { Page } from '@playwright/test';
import type { ApiFixture } from '../fixtures/api';
import { expect, test } from '../fixtures/test';
import { NORTHWIND_MOMENTS, northwindMoments } from '../fixtures/moments';
import { NOW } from '../fixtures/now';
import {
  NORTHWIND_PINS,
  northwindPins,
  northwindPinsOf,
  northwindPinsWhere,
  teamOf500,
} from '../fixtures/pins';
import type { TeamPage } from '../pages/team.page';
import { expectNoViolations } from '../support/axe';
import { rememberTeam } from '../support/membership';

interface Given {
  api: ApiFixture;
  page: Page;
  teamPage: TeamPage;
}

interface State {
  /** Reaches the state, and gives back what lets go of an answer it holds, if it holds one. */
  reach: (given: Given) => Promise<(() => void) | void>;
  /** Whether the state is reached with the page's clock paused. */
  clockPaused?: boolean;
}

const threeInEurope = () => northwindPinsOf('Sofia Bianchi', 'Mara Lindqvist', 'Liam O’Connor');

/** Each drawn state of Team, reached as the behaviour specs reach it. */
const states: Record<string, State> = {
  default: {
    reach: async ({ api, teamPage }) => {
      api.answer('GET', NORTHWIND_PINS, northwindPins());
      api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());
      await teamPage.open();
      await expect(teamPage.rows).toHaveCount(13);
    },
  },
  working: {
    reach: async ({ api, teamPage }) => {
      api.answer('GET', NORTHWIND_PINS, northwindPins());
      await teamPage.open();
      await teamPage.tab('Working now').click();
      await expect(teamPage.tab('Working now')).toHaveAttribute('aria-selected', 'true');
    },
  },
  asleep: {
    reach: async ({ api, teamPage }) => {
      api.answer('GET', NORTHWIND_PINS, northwindPins());
      await teamPage.open();
      await teamPage.tab('Asleep').click();
      await expect(teamPage.tab('Asleep')).toHaveAttribute('aria-selected', 'true');
    },
  },
  'no-results': {
    reach: async ({ api, teamPage }) => {
      api.answer('GET', NORTHWIND_PINS, threeInEurope());
      await teamPage.open('asleep');
      await expect(teamPage.noteTitle).toHaveText('No one is asleep right now');
    },
  },
  quiet: {
    clockPaused: true,
    reach: async ({ api, page, teamPage }) => {
      api.answer('GET', NORTHWIND_PINS, threeInEurope());
      await teamPage.open();
      await teamPage.tab('Working now').click();
      // Left open until 23:30 in Milan, when nobody is in working hours
      await page.clock.pauseAt(new Date(NOW.getTime() + (8 * 60 + 25) * 60_000));
      await page.clock.runFor(1_000);
      await expect(teamPage.noteTitle).toHaveText('No one is in working hours right now');
    },
  },
  loading: {
    reach: async ({ api, teamPage }) => {
      const held = api.hold('GET', NORTHWIND_PINS);
      await teamPage.open();
      await expect(teamPage.loadingAnnouncement).toHaveText('Loading team…');
      return () => held.release(northwindPins());
    },
  },
  empty: {
    reach: async ({ api, teamPage }) => {
      api.answer('GET', NORTHWIND_PINS, northwindPinsOf('Sofia Bianchi'));
      await teamPage.open();
      await expect(teamPage.invitePrompt).toBeVisible();
    },
  },
  error: {
    reach: async ({ api, teamPage }) => {
      api.answer('GET', NORTHWIND_PINS, { unanswered: true });
      await teamPage.open();
      await expect(teamPage.errorTitle).toBeVisible();
    },
  },
  'weather-unavailable': {
    reach: async ({ api, teamPage }) => {
      api.answer(
        'GET',
        NORTHWIND_PINS,
        northwindPinsWhere((pin) => ({ ...pin, weather: null, weatherState: 'Unavailable' })),
      );
      await teamPage.open();
      await expect(teamPage.weatherAlert).toBeVisible();
    },
  },
  'sharing-off': {
    reach: async ({ api, teamPage }) => {
      api.answer(
        'GET',
        NORTHWIND_PINS,
        northwindPinsWhere((pin) =>
          pin.name === 'Ahmed Al-Sayed'
            ? { ...pin, sharesStatus: false, weather: null, weatherState: 'NotShared' }
            : pin,
        ),
      );
      await teamPage.open();
      await expect(teamPage.row('Ahmed Al-Sayed')).toBeVisible();
    },
  },
  edge: {
    reach: async ({ api, teamPage }) => {
      api.answer(
        'GET',
        NORTHWIND_PINS,
        northwindPinsWhere((pin) => (pin.isViewer ? { ...pin, country: 'United States' } : pin)),
      );
      await teamPage.open();
      await expect(teamPage.marker('Tomás Herrera, 8:05 am')).toBeVisible();
    },
  },
  hundreds: {
    reach: async ({ api, teamPage }) => {
      api.answer('GET', NORTHWIND_PINS, teamOf500());
      await teamPage.open();
      await expect(teamPage.rows).toHaveCount(8);
    },
  },
  'hundreds-crowded-city': {
    reach: async ({ api, teamPage }) => {
      api.answer('GET', NORTHWIND_PINS, teamOf500({ London: 64, Berlin: 15 }));
      await teamPage.open();
      await expect(teamPage.rows).toHaveCount(8);
      await teamPage.sectionToggle('London').click();
      await expect(teamPage.more).toBeVisible();
    },
  },
  'hundreds-no-match': {
    reach: async ({ api, teamPage }) => {
      api.answer('GET', NORTHWIND_PINS, teamOf500());
      await teamPage.open('asleep');
      await expect(teamPage.rows).toHaveCount(8);
      await teamPage.search.fill('Reykjavik');
      await expect(teamPage.note).toBeVisible();
    },
  },
};

test.use({ webgl: false });

test.beforeEach(async ({ page }) => {
  await rememberTeam(page);
});

for (const [state, { reach, clockPaused = false }] of Object.entries(states)) {
  for (const theme of ['light', 'dark'] as const) {
    test(`Team ${state} has no WCAG 2.2 AA violation, ${theme}`, async ({
      api,
      page,
      teamPage,
    }) => {
      await page.emulateMedia({ colorScheme: theme });
      const release = await reach({ api, page, teamPage });

      await expectNoViolations(page, { clockPaused });
      release?.();
    });
  }
}
