import type { Locator, Page } from '@playwright/test';

/** Left Team: what a teammate sees once they have left their team. */
export class LeftTeamPage {
  readonly main: Locator;
  readonly title: Locator;
  readonly text: Locator;
  readonly wordmark: Locator;
  readonly globe: Locator;
  readonly startANewTeam: Locator;
  readonly signInToAnotherTeam: Locator;
  /** The app header and its navigation, which this screen does not have. */
  readonly appHeader: Locator;
  readonly navigation: Locator;
  readonly actions: Locator;

  constructor(readonly page: Page) {
    this.main = page.locator('main.notice-page');
    this.title = this.main.locator('.notice-page__title');
    this.text = this.main.locator('.notice-page__text');
    this.wordmark = this.main.locator('.brand .wordmark');
    this.globe = this.main.getByRole('img', { name: 'A small globe' });
    this.startANewTeam = this.main.getByRole('link', { name: 'Start a new team' });
    this.signInToAnotherTeam = this.main.getByRole('link', { name: 'Sign in to another team' });
    this.appHeader = page.locator('.app-header');
    this.navigation = page.getByRole('navigation');
    this.actions = this.main.locator('.notice-page__actions a');
  }
}
