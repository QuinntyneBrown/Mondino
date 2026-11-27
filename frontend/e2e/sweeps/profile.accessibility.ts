// Accessibility sweep. Runs only when a person asks: npm run e2e:accessibility
// Traces to: L2-039, L2-041, L2-019, L2-022, L2-031, L2-032, L2-033, L2-034, L2-035, L2-036, L2-049

import type { Page } from '@playwright/test';
import type { Answer, ApiFixture } from '../fixtures/api';
import { expect, test } from '../fixtures/test';
import { lookupAnswer } from '../fixtures/invites';
import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { NORTHWIND_ME, NORTHWIND_ME_LOOKUPS, sofiaProfile } from '../fixtures/profile';
import type { AppHeaderPage } from '../pages/app-header.page';
import type { DiscardChangesDialogPage } from '../pages/discard-changes-dialog.page';
import type { LeaveTeamDialogPage } from '../pages/leave-team-dialog.page';
import type { ProfilePage } from '../pages/profile.page';
import { expectNoViolations } from '../support/axe';
import { pauseNow } from '../support/clock';
import { rememberTeam } from '../support/membership';

interface Given {
  api: ApiFixture;
  page: Page;
  profilePage: ProfilePage;
  appHeader: AppHeaderPage;
  discardDialog: DiscardChangesDialogPage;
  leaveDialog: LeaveTeamDialogPage;
}

interface State {
  /** Reaches the state, and gives back what lets go of an answer it holds, if it holds one. */
  reach: (given: Given) => Promise<(() => void) | void>;
  /** Whether the state is reached with the page's clock paused. */
  clockPaused?: boolean;
}

const refused = (status: number, code: string, headers: Record<string, string> = {}): Answer => ({
  status,
  headers: { 'content-type': 'application/problem+json', ...headers },
  json: { status, code },
});

/** Opens Profile & Settings and waits for Sofia's pin in Milan. */
async function openProfile(profilePage: ProfilePage): Promise<void> {
  await profilePage.open();
  await expect(profilePage.city).toHaveText('Milan, Italy');
}

/** Opens Profile & Settings and chooses the 12-hour clock, which brings the bar for unsaved changes. */
async function changeTheClock(profilePage: ProfilePage): Promise<void> {
  await openProfile(profilePage);
  await profilePage.option(profilePage.clock, '12-hour').click();
  await expect(profilePage.saveChanges).toBeVisible();
}

/** Opens Profile & Settings, types Canada and a postal code, and looks it up. */
async function lookUp(profilePage: ProfilePage, postalCode: string): Promise<void> {
  await openProfile(profilePage);
  await profilePage.move('Canada', postalCode);
  await profilePage.lookUp.click();
}

/** Each drawn state of Profile & Settings, of its two dialogs and of its bar for unsaved changes. */
const states: Record<string, State> = {
  default: { reach: ({ profilePage }) => openProfile(profilePage) },
  loading: {
    reach: async ({ api, profilePage }) => {
      const held = api.hold('GET', NORTHWIND_ME);
      await profilePage.open();
      await expect(profilePage.loadingAnnouncement).toHaveText('Loading your pin and settings…');
      return () => held.release(sofiaProfile());
    },
  },
  error: {
    reach: async ({ api, profilePage }) => {
      api.answer('GET', NORTHWIND_ME, { unanswered: true });
      await profilePage.open();
      await expect(profilePage.errorTitle).toBeVisible();
    },
  },
  locating: {
    reach: async ({ api, profilePage }) => {
      const held = api.hold('POST', NORTHWIND_ME_LOOKUPS);
      await lookUp(profilePage, 'M5V 2T6');
      await expect(profilePage.lookup).not.toBeEmpty();
      return () => held.release(lookupAnswer({ countryCode: 'CA', postalCode: 'M5V 2T6' }));
    },
  },
  'location-found': {
    reach: async ({ api, profilePage }) => {
      api.answer('POST', NORTHWIND_ME_LOOKUPS, (route) =>
        lookupAnswer(route.request().postDataJSON()),
      );
      await lookUp(profilePage, 'M5V 2T6');
      await expect(profilePage.saveChanges).toBeVisible();
    },
  },
  invalid: {
    reach: async ({ api, profilePage }) => {
      api.answer('POST', NORTHWIND_ME_LOOKUPS, (route) =>
        lookupAnswer(route.request().postDataJSON()),
      );
      await lookUp(profilePage, 'M5V 2T');
      await expect(profilePage.postalCode).toHaveAttribute('aria-invalid', 'true');
    },
  },
  'lookup-unavailable': {
    reach: async ({ api, profilePage }) => {
      api.answer('POST', NORTHWIND_ME_LOOKUPS, refused(503, 'postal_code_unavailable'));
      await lookUp(profilePage, 'M5V 2T6');
      await expect(profilePage.tryLookupAgain).toBeVisible();
    },
  },
  'rate-limited': {
    reach: async ({ api, profilePage }) => {
      api.answer(
        'POST',
        NORTHWIND_ME_LOOKUPS,
        refused(429, 'rate_limited', { 'retry-after': '42' }),
      );
      await lookUp(profilePage, 'M5V 2T6');
      await expect(profilePage.warning).toBeVisible();
    },
  },
  'sharing-off': {
    reach: async ({ api, profilePage }) => {
      api.answer(
        'GET',
        NORTHWIND_ME,
        sofiaProfile({
          sharesWeather: false,
          sharesStatus: false,
          momentKinds: ['holiday', 'formula-1', 'local-event'],
        }),
      );
      await openProfile(profilePage);
      await expect(profilePage.sharingNote).toBeVisible();
    },
  },

  // The bar for unsaved changes (notifications/settings-bar)
  'settings bar info': { reach: ({ profilePage }) => changeTheClock(profilePage) },
  'settings bar saving': {
    reach: async ({ api, profilePage }) => {
      await changeTheClock(profilePage);
      const held = api.hold('PUT', NORTHWIND_ME);
      await profilePage.saveChanges.click();
      await expect(profilePage.saveBar).toContainText('Saving…');
      return () => held.release(sofiaProfile({ clockFormat: '12-hour' }));
    },
  },
  'settings bar success': {
    // The bar goes by itself 4 seconds after a save; the clock stands still so it is there for axe
    clockPaused: true,
    reach: async ({ api, page, profilePage }) => {
      await changeTheClock(profilePage);
      api.answer('PUT', NORTHWIND_ME, sofiaProfile({ clockFormat: '12-hour' }));
      await profilePage.saveChanges.click();
      await expect(profilePage.saveBarText).toContainText('Saved');
      await pauseNow(page);
    },
  },
  'settings bar danger': {
    reach: async ({ api, profilePage }) => {
      await changeTheClock(profilePage);
      api.answer('PUT', NORTHWIND_ME, refused(500, 'unexpected'));
      await profilePage.saveChanges.click();
      await expect(profilePage.trySavingAgain).toBeVisible();
    },
  },

  // "Leave without saving?" (dialogs/unsaved-changes)
  'unsaved changes dialog': {
    reach: async ({ profilePage, appHeader, discardDialog }) => {
      await openProfile(profilePage);
      await profilePage.option(profilePage.temperature, '°F').click();
      await appHeader.link('Globe').click();
      await expect(discardDialog.dialog).toBeVisible();
    },
  },

  // "Leave Northwind?" (dialogs/leave-team)
  'leave team dialog default': {
    reach: async ({ profilePage, leaveDialog }) => {
      await openProfile(profilePage);
      await profilePage.leave.click();
      await expect(leaveDialog.dialog).toBeVisible();
    },
  },
  'leave team dialog busy': {
    reach: async ({ api, profilePage, leaveDialog }) => {
      const held = api.hold('DELETE', NORTHWIND_ME);
      await openProfile(profilePage);
      await profilePage.leave.click();
      await leaveDialog.confirm.click();
      await expect(leaveDialog.confirm).toHaveAttribute('aria-busy', 'true');
      return () => held.release({ status: 503 });
    },
  },
  'leave team dialog failed': {
    reach: async ({ api, profilePage, leaveDialog }) => {
      api.answer('DELETE', NORTHWIND_ME, { status: 503 });
      await openProfile(profilePage);
      await profilePage.leave.click();
      await leaveDialog.confirm.click();
      await expect(leaveDialog.alert).toBeVisible();
    },
  },
};

test.use({ webgl: false });

test.beforeEach(async ({ api, page }) => {
  await rememberTeam(page);
  api.answer('GET', NORTHWIND_PINS, northwindPins());
  api.answer('GET', NORTHWIND_ME, sofiaProfile());
});

for (const [state, { reach, clockPaused = false }] of Object.entries(states)) {
  for (const theme of ['light', 'dark'] as const) {
    test(`Profile & Settings ${state} has no WCAG 2.2 AA violation, ${theme}`, async ({
      api,
      page,
      profilePage,
      appHeader,
      discardDialog,
      leaveDialog,
    }) => {
      await page.emulateMedia({ colorScheme: theme });
      const release = await reach({
        api,
        page,
        profilePage,
        appHeader,
        discardDialog,
        leaveDialog,
      });

      await expectNoViolations(page, { clockPaused });
      release?.();
    });
  }
}
