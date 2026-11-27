import type { Locator, Page } from '@playwright/test';

/** The selector of a still globe's picture, on the screen and in a mock. */
export const globeArt = '.notice-page .globe svg.globe__art';

/**
 * Every shape of a still globe, in order: its tag and its attributes, with the ids made the same
 * whichever page draws them. Runs in the browser.
 */
export function shapesOf(art: Element | null): string[] {
  if (!art) return [];
  const neutral = (value: string) =>
    value.replace(/mo-globe-fallback-/g, '').replace(/(^|#)g-/g, '$1');
  return [...art.querySelectorAll('*')].map((shape) =>
    [
      shape.localName,
      ...[...shape.attributes]
        .filter((attribute) => !attribute.name.startsWith('_ng'))
        .map((attribute) => `${attribute.name}=${neutral(attribute.value)}`)
        .sort(),
    ].join(' '),
  );
}

/** "This page fell off the map": the page for an address that belongs to no screen. */
export class NotFoundPage {
  readonly main: Locator;
  readonly title: Locator;
  readonly text: Locator;
  readonly address: Locator;
  readonly wordmark: Locator;
  readonly globe: Locator;
  readonly globeArt: Locator;
  readonly backToTheGlobe: Locator;
  readonly skipLink: Locator;

  constructor(readonly page: Page) {
    this.main = page.locator('main.notice-page');
    this.title = this.main.locator('.notice-page__title');
    this.text = this.main.locator('.notice-page__text');
    this.address = this.text.locator('strong');
    this.wordmark = this.main.locator('.brand .wordmark');
    this.globe = this.main.getByRole('img', { name: 'A small globe' });
    this.globeArt = page.locator(globeArt);
    this.backToTheGlobe = this.main.getByRole('link', { name: 'Back to the globe' });
    this.skipLink = page.getByRole('link', { name: 'Skip to content' });
  }

  async open(address: string): Promise<void> {
    await this.page.goto(address);
  }

  /** The shapes of the still globe the screen draws. */
  globeShapes(): Promise<string[]> {
    return this.globeArt.evaluate(shapesOf);
  }

  /** The shapes of the still globe as a mock draws it, from the mock's markup. */
  async globeShapesIn(mock: string): Promise<string[]> {
    const art = await this.page.evaluateHandle(
      ([markup, selector]) =>
        new DOMParser().parseFromString(markup, 'text/html').querySelector(selector),
      [mock, globeArt] as const,
    );
    return art.evaluate(shapesOf);
  }

  /** The address as the screen should show it: the host and the path, and no query string. */
  shownAddress(path: string): string {
    return `${new URL(this.page.url()).host}${path}`;
  }
}
