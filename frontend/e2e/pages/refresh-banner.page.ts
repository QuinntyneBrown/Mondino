import type { Locator, Page } from '@playwright/test';

/** The banner under the header of a teammate screen when a refresh has failed (L2-048). */
export class RefreshBannerPage {
  readonly header: Locator;
  readonly banner: Locator;
  readonly text: Locator;
  readonly time: Locator;
  readonly tryAgain: Locator;

  constructor(readonly page: Page) {
    this.header = page.locator('header.app-header');
    this.banner = page.locator('.banner');
    this.text = this.banner.locator('.banner__text');
    this.time = this.text.locator('.tnum');
    this.tryAgain = this.banner.getByRole('button');
  }

  /**
   * The banner read as a mock's: the role of its words (the live region is the words alone, so
   * its button changing to "Trying…" is not announced), its words, its button's and the shapes
   * of its two icons.
   */
  parts(): Promise<{ role: string; text: string; button: string; icons: string[][] }> {
    return this.banner.evaluate((banner) => ({
      role: banner.querySelector('.banner__text')?.getAttribute('role') ?? '',
      text: (banner.querySelector('.banner__text')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      button: (banner.querySelector('button')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      icons: [...banner.querySelectorAll('svg')].map((svg) =>
        [...svg.children].map((shape) =>
          [
            shape.tagName,
            ...[...shape.attributes]
              .filter((attribute) => !attribute.name.startsWith('_ng'))
              .map((attribute) => `${attribute.name}=${attribute.value}`)
              .sort(),
          ].join(' '),
        ),
      ),
    }));
  }

  /** Whether the banner sits under the header and over the screen's main content. */
  async isUnderTheHeader(): Promise<boolean> {
    return this.banner.evaluate((banner) => {
      const header = document.querySelector('header.app-header')!.getBoundingClientRect();
      const main = document.querySelector('main')!.getBoundingClientRect();
      const box = banner.getBoundingClientRect();
      return box.top >= header.bottom - 1 && box.bottom <= main.top + 1;
    });
  }
}
