// Accessibility sweep. Runs only when a person asks: npm run e2e:accessibility
// Traces to: L2-039, L2-041, L2-025, L2-048, L2-049, L2-054, L2-055
//
// The invite dialog, the toasts about the invite link and the banner of a refresh that failed.
// "Leave Northwind?", "Leave without saving?" and the bar for unsaved changes are swept with
// Profile & Settings (profile.accessibility.ts), and the toast of a pin just placed with the Globe.

import type { Page } from '@playwright/test';
import type { ApiFixture } from '../fixtures/api';
import { expect, test } from '../fixtures/test';
import { NORTHWIND_PINS, northwindPins, northwindPinsOf } from '../fixtures/pins';
import type { GlobePage } from '../pages/globe.page';
import type { InviteDialogPage } from '../pages/invite-dialog.page';
import type { RefreshBannerPage } from '../pages/refresh-banner.page';
import { expectNoViolations } from '../support/axe';
import { pauseNow } from '../support/clock';
import { rememberTeam } from '../support/membership';

interface Given {
  api: ApiFixture;
  page: Page;
  globePage: GlobePage;
  inviteDialog: InviteDialogPage;
  refreshBanner: RefreshBannerPage;
}

interface State {
  reach: (given: Given) => Promise<void>;
  /** Whether the state is reached with the page's clock paused. */
  clockPaused?: boolean;
}

/** Lets the page write to the clipboard, as the invite specs do. Call before the screen opens. */
async function allowCopying(page: Page): Promise<void> {
  await page
    .context()
    .grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:4310' });
}

const states: Record<string, State> = {
  'invite dialog default': {
    reach: async ({ api, page, globePage, inviteDialog }) => {
      await allowCopying(page);
      api.answer('GET', NORTHWIND_PINS, northwindPins());
      await globePage.open();
      await globePage.inviteTeammate.click();
      await expect(inviteDialog.copyLink).toBeFocused();
    },
  },
  'invite dialog copy-failed': {
    reach: async ({ api, globePage, inviteDialog }) => {
      await globePage.refuseCopy();
      api.answer('GET', NORTHWIND_PINS, northwindPins());
      await globePage.open();
      await globePage.inviteTeammate.click();
      await inviteDialog.copyLink.click();
      await expect(globePage.alertToast).toBeVisible();
      await expect(inviteDialog.dialog).toBeVisible();
    },
  },
  'invite-link toast success': {
    // The toast goes by itself after 4 seconds; the clock stands still so it is there for axe
    clockPaused: true,
    reach: async ({ api, page, globePage }) => {
      await allowCopying(page);
      api.answer('GET', NORTHWIND_PINS, northwindPinsOf('Sofia Bianchi'));
      await globePage.open();
      await globePage.copy.click();
      await expect(globePage.statusToast).toBeVisible();
      await pauseNow(page);
    },
  },
  'invite-link toast danger': {
    reach: async ({ api, globePage }) => {
      await globePage.refuseCopy();
      api.answer('GET', NORTHWIND_PINS, northwindPinsOf('Sofia Bianchi'));
      await globePage.open();
      await globePage.copy.click();
      await expect(globePage.alertToast).toBeVisible();
    },
  },
  'refresh banner warning': {
    reach: async ({ api, page, globePage, refreshBanner }) => {
      // The first read of the team answers; the refresh 15 minutes on cannot reach Mondino
      let reads = 0;
      api.answer('GET', NORTHWIND_PINS, () =>
        ++reads === 1 ? northwindPins() : { unanswered: true },
      );
      await globePage.open();
      await expect(globePage.title).toHaveText('13 teammates');
      await page.clock.fastForward('15:00');
      await expect(refreshBanner.tryAgain).toBeVisible();
    },
  },
};

test.use({ webgl: false });

test.beforeEach(async ({ page }) => {
  await rememberTeam(page);
});

for (const [state, { reach, clockPaused = false }] of Object.entries(states)) {
  for (const theme of ['light', 'dark'] as const) {
    test(`The ${state} has no WCAG 2.2 AA violation, ${theme}`, async ({
      api,
      page,
      globePage,
      inviteDialog,
      refreshBanner,
    }) => {
      await page.emulateMedia({ colorScheme: theme });
      await reach({ api, page, globePage, inviteDialog, refreshBanner });

      await expectNoViolations(page, { clockPaused });
    });
  }
}
