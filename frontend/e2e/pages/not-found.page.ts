import type { Locator, Page } from '@playwright/test';

/** "This page fell off the map": the page for an address that belongs to no screen. */
export class NotFoundPage {
  readonly main: Locator;
  readonly title: Locator;
  readonly text: Locator;
  readonly address: Locator;
  readonly wordmark: Locator;
  readonly globe: Locator;
  readonly backToTheGlobe: Locator;
  readonly skipLink: Locator;

  constructor(readonly page: Page) {
    this.main = page.locator('main.notice-page');
    this.title = this.main.locator('.notice-page__title');
    this.text = this.main.locator('.notice-page__text');
    this.address = this.text.locator('strong');
    this.wordmark = this.main.locator('.brand .wordmark');
    this.globe = this.main.getByRole('img', { name: 'A small globe' });
    this.backToTheGlobe = this.main.getByRole('link', { name: 'Back to the globe' });
    this.skipLink = page.getByRole('link', { name: 'Skip to content' });
  }

  async open(address: string): Promise<void> {
    await this.page.goto(address);
  }

  /** The address as the screen should show it: the host and the path, and no query string. */
  shownAddress(path: string): string {
    return `${new URL(this.page.url()).host}${path}`;
  }
}
