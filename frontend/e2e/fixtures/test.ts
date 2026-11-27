import { test as base, expect } from '@playwright/test';
import { ApiFixture } from './api';
import { NOW } from './now';
import { CreateTeamPage } from '../pages/create-team.page';
import { GlobePage } from '../pages/globe.page';
import { InviteNeededPage } from '../pages/invite-needed.page';
import { JoinPage } from '../pages/join.page';
import { NotFoundPage } from '../pages/not-found.page';
import { SignInPage } from '../pages/sign-in.page';

interface Fixtures {
  /** Problems seen during a spec: any one fails it. */
  problems: string[];
  /** Answers API requests from fixtures. */
  api: ApiFixture;
  /** The guard every spec runs under: fixed time, localhost only, no page error. */
  guard: void;
  notFoundPage: NotFoundPage;
  joinPage: JoinPage;
  globePage: GlobePage;
  createTeamPage: CreateTeamPage;
  inviteNeededPage: InviteNeededPage;
  signInPage: SignInPage;
}

const local = new Set(['127.0.0.1', 'localhost', '[::1]']);

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  problems: async ({}, use) => {
    await use([]);
  },

  api: async ({ page, problems }, use) => {
    const api = new ApiFixture(problems);
    await api.install(page);
    await use(api);
  },

  guard: [
    async ({ page, context, problems, api }, use) => {
      void api;
      // The time the spec says it is, so every local time, status and moment is the same on
      // every run. A spec moves it with page.clock; it never sleeps.
      await page.clock.install({ time: NOW });

      await context.route(
        (url) => !local.has(url.hostname) && !['data:', 'blob:', 'about:'].includes(url.protocol),
        async (route) => {
          problems.push(`Request off localhost: ${route.request().url()}`);
          await route.abort('blockedbyclient');
        },
      );
      page.on('pageerror', (error) => problems.push(`Page error: ${error.message}`));
      page.on('console', (message) => {
        // The browser logs every refused or failed request as "Failed to load resource". A refusal
        // a spec answers on purpose is not a problem; an unanswered request is caught above and
        // by the API fixture.
        if (message.type() !== 'error' || message.text().startsWith('Failed to load resource:'))
          return;
        problems.push(`Console error: ${message.text()}`);
      });
      page.on('response', (response) => {
        if (response.status() === 599) problems.push(`Unanswered API request: ${response.url()}`);
      });

      await use();

      expect(problems, 'the spec left a request unanswered, left localhost or threw').toEqual([]);
    },
    { auto: true },
  ],

  notFoundPage: async ({ page }, use) => {
    await use(new NotFoundPage(page));
  },

  joinPage: async ({ page }, use) => {
    await use(new JoinPage(page));
  },

  globePage: async ({ page }, use) => {
    await use(new GlobePage(page));
  },

  createTeamPage: async ({ page }, use) => {
    await use(new CreateTeamPage(page));
  },

  inviteNeededPage: async ({ page }, use) => {
    await use(new InviteNeededPage(page));
  },

  signInPage: async ({ page }, use) => {
    await use(new SignInPage(page));
  },
});

export { expect };
