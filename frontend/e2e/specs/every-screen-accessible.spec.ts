// Acceptance Test
// Traces to: L2-039, L2-041, L2-042
// Description: Every screen, in light and in dark: "Skip to content" is the first stop, Tab reaches every control in reading order with a ring of at least 3:1 and then lets focus leave, every target is 44 × 44 px, text meets AA contrast, times and temperatures use tabular figures, nothing repeats more than three times a second, and reduced motion switched on while the screen is open stills everything; the theme follows the device, and at 200% text nothing is lost at 1280 px

import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import type { CreateTeamPage } from '../pages/create-team.page';
import type { GlobePage } from '../pages/globe.page';
import type { InviteNeededPage } from '../pages/invite-needed.page';
import type { JoinPage } from '../pages/join.page';
import type { LeftTeamPage } from '../pages/left-team.page';
import type { MomentsPage } from '../pages/moments.page';
import type { NotFoundPage } from '../pages/not-found.page';
import type { ProfilePage } from '../pages/profile.page';
import type { SignInPage } from '../pages/sign-in.page';
import type { TeamPage } from '../pages/team.page';
import { NORTHWIND_INVITE, northwindInvite } from '../fixtures/invites';
import { NORTHWIND_MOMENTS, northwindMoments } from '../fixtures/moments';
import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { NORTHWIND_ME, sofiaProfile } from '../fixtures/profile';
import {
  canvasIsDark,
  enlargeText,
  fastRepeats,
  lowContrastText,
  motionUnderReduce,
  positiveTabIndex,
  proportionalFigures,
  readingOrder,
  settled,
  walkWithTab,
} from '../support/accessibility';
import { cutOff, fitsItsWidth } from '../support/layout';
import { rememberTeam } from '../support/membership';
import { changeReducedMotion } from '../support/turning';

interface Screens {
  page: Page;
  joinPage: JoinPage;
  signInPage: SignInPage;
  createTeamPage: CreateTeamPage;
  inviteNeededPage: InviteNeededPage;
  leftTeamPage: LeftTeamPage;
  notFoundPage: NotFoundPage;
  globePage: GlobePage;
  teamPage: TeamPage;
  momentsPage: MomentsPage;
  profilePage: ProfilePage;
}

/** Each screen, opened as a person opens it and read once it has drawn what it holds. */
const screens: Record<string, { teammate: boolean; open: (pages: Screens) => Promise<void> }> = {
  Join: {
    teammate: false,
    open: async ({ joinPage }) => {
      await joinPage.open('northwind-7Kq2');
      await expect(joinPage.footer).toBeVisible();
    },
  },
  'Sign In': {
    teammate: false,
    open: async ({ signInPage }) => {
      await signInPage.open();
      await expect(signInPage.footer).toBeVisible();
    },
  },
  'Create Team': {
    teammate: false,
    open: async ({ createTeamPage }) => {
      await createTeamPage.open();
      await expect(createTeamPage.title).toBeVisible();
    },
  },
  'You need an invite link': {
    teammate: false,
    open: async ({ inviteNeededPage }) => {
      await inviteNeededPage.open('/globe');
      await expect(inviteNeededPage.title).toBeVisible();
    },
  },
  'Left Team': {
    teammate: false,
    open: async ({ page, leftTeamPage }) => {
      await page.goto('/left');
      await expect(leftTeamPage.title).toBeVisible();
    },
  },
  'Not Found': {
    teammate: false,
    open: async ({ notFoundPage }) => {
      await notFoundPage.open('/nowhere');
      await expect(notFoundPage.title).toBeVisible();
    },
  },
  Globe: {
    teammate: true,
    open: async ({ globePage }) => {
      await globePage.open();
      await expect(globePage.pinButtons.first()).toBeVisible();
      await expect(globePage.panel).toBeVisible();
    },
  },
  Team: {
    teammate: true,
    open: async ({ teamPage }) => {
      await teamPage.open();
      await expect(teamPage.rows).toHaveCount(13);
    },
  },
  Moments: {
    teammate: true,
    open: async ({ momentsPage }) => {
      await momentsPage.open();
      await expect(momentsPage.rows.first()).toBeVisible();
    },
  },
  'Profile & Settings': {
    teammate: true,
    open: async ({ profilePage }) => {
      await profilePage.open();
      await expect(profilePage.city).toContainText('Milan');
    },
  },
};

test.describe('Every screen by keyboard, touch, sight and motion', () => {
  test.use({ webgl: false });

  test.beforeEach(async ({ api }) => {
    api.answer('GET', NORTHWIND_INVITE, northwindInvite());
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    api.answer('GET', NORTHWIND_MOMENTS, northwindMoments());
    api.answer('GET', NORTHWIND_ME, sofiaProfile());
  });

  for (const [name, screen] of Object.entries(screens)) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${name}, ${theme}`, async ({
        page,
        joinPage,
        signInPage,
        createTeamPage,
        inviteNeededPage,
        leftTeamPage,
        notFoundPage,
        globePage,
        teamPage,
        momentsPage,
        profilePage,
      }) => {
        const pages: Screens = {
          page,
          joinPage,
          signInPage,
          createTeamPage,
          inviteNeededPage,
          leftTeamPage,
          notFoundPage,
          globePage,
          teamPage,
          momentsPage,
          profilePage,
        };
        if (screen.teammate) await rememberTeam(page);

        // Given a device set to the theme, and the screen open
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'no-preference' });
        await screen.open(pages);
        await settled(page);

        // Then it is drawn in that theme
        expect(await canvasIsDark(page)).toBe(theme === 'dark');

        // When Tab is pressed from the top of the screen, again and again
        const order = await readingOrder(page);
        const stops = await walkWithTab(page);

        // Then "Skip to content" is the first stop, and every control is reached once, in the
        // order the screen reads, before focus leaves the page: nothing traps it
        expect(stops[0]?.name).toContain('Skip to content');
        expect(await positiveTabIndex(page)).toEqual([]);
        expect(stops.map((stop) => stop.name)).toEqual(order);

        // And each shows a focus ring at least 2 px wide and 3:1 against what is around it, and
        // takes a touch over at least 44 × 44 px
        for (const stop of stops) {
          expect(stop.ringWidth, `${stop.name}'s ring`).toBeGreaterThanOrEqual(2);
          expect(stop.ringContrast, `${stop.name}'s ring`).toBeGreaterThanOrEqual(3);
          expect(Math.min(stop.width, stop.height), `${stop.name}'s target`).toBeGreaterThanOrEqual(
            44,
          );
        }

        // And every line of text meets AA contrast over its background, and every time and
        // temperature is set in tabular figures
        expect(await lowContrastText(page)).toEqual([]);
        expect(await proportionalFigures(page)).toEqual([]);

        // And nothing repeats more than three times in a second
        expect(await fastRepeats(page)).toEqual([]);

        // When reduced motion is switched on while the screen is open
        await changeReducedMotion(page, true);

        // Then nothing on it fades, slides, grows or pulses any more, without a reload
        expect(await motionUnderReduce(page)).toEqual([]);

        if (theme === 'dark') return;
        // When the browser's text is set to 200% at 1280 px wide
        await page.setViewportSize({ width: 1280, height: 800 });
        expect(await enlargeText(page)).toBe('32px');

        // Then nothing is cut off, covered or reached only by scrolling sideways
        expect(await fitsItsWidth(page), 'no horizontal scroll').toBe(true);
        expect(await cutOff(page)).toEqual([]);
      });
    }
  }

  test('Profile & Settings has no setting for the theme: the device decides', async ({
    page,
    profilePage,
  }) => {
    await rememberTeam(page);
    await profilePage.open();
    await expect(profilePage.city).toContainText('Milan');
    await expect(profilePage.themeControls).toHaveCount(0);
  });
});
