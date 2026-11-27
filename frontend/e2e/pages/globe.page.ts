import type { Locator, Page } from '@playwright/test';

/** Globe: the home screen, as journey 4 opens it after joining. */
export class GlobePage {
  readonly main: Locator;
  readonly stage: Locator;
  readonly globe: Locator;
  readonly allPins: Locator;
  /** The new teammate's own pin, lifted, and its label. */
  readonly youPin: Locator;
  readonly youLabel: Locator;
  readonly toastRegion: Locator;
  readonly toast: Locator;
  readonly dismiss: Locator;

  constructor(readonly page: Page) {
    this.main = page.locator('main.globe-screen');
    this.stage = this.main.locator('.globe-screen__stage');
    this.globe = this.stage.locator('.globe');
    this.allPins = this.stage.locator('.globe__pin');
    this.youPin = this.stage.locator('.globe__pin--lifted .pin-dot--you');
    this.youLabel = this.stage.locator('.globe__pin--lifted .pin-label__name');
    this.toastRegion = page.locator('.toast-region');
    this.toast = this.toastRegion.locator('.toast');
    this.dismiss = this.toast.getByRole('button', { name: 'Dismiss' });
  }

  async open(): Promise<void> {
    await this.page.goto('/globe');
  }

  /** The name of the new pin's pulse animation, or "none" when it does not pulse. */
  pulse(): Promise<string> {
    return this.youPin.evaluate((pin) => getComputedStyle(pin, '::after').animationName);
  }
}
