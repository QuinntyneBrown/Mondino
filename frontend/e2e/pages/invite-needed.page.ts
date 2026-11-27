import type { Locator, Page } from '@playwright/test';
import { globeArt, shapesOf } from './not-found.page';

/** "You need an invite link": what someone on no team sees in place of a team's screen. */
export class InviteNeededPage {
  readonly main: Locator;
  readonly title: Locator;
  readonly text: Locator;
  readonly wordmark: Locator;
  readonly globe: Locator;
  readonly startATeam: Locator;
  readonly useADifferentEmail: Locator;
  /** The app header, which a notice page does not have. */
  readonly appHeader: Locator;

  constructor(readonly page: Page) {
    this.main = page.locator('main.notice-page');
    this.title = this.main.locator('.notice-page__title');
    this.text = this.main.locator('.notice-page__text');
    this.wordmark = this.main.locator('.brand .wordmark');
    this.globe = this.main.getByRole('img', { name: 'A small globe' });
    this.startATeam = this.main.getByRole('link', { name: 'Start a team' });
    this.useADifferentEmail = this.main.getByRole('link', { name: 'Use a different email' });
    this.appHeader = page.locator('.app-header');
  }

  async open(address: string): Promise<void> {
    await this.page.goto(address);
  }

  /** The shapes of the small globe the screen draws. */
  globeShapes(): Promise<string[]> {
    return this.page.locator(globeArt).evaluate(shapesOf);
  }
}
