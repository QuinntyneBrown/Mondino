import type { Locator, Page } from '@playwright/test';

/** Globe: the home screen. */
export class GlobePage {
  readonly main: Locator;
  readonly stage: Locator;
  /** The box the globe is drawn in, whatever draws it. */
  readonly globeBox: Locator;
  readonly globe: Locator;
  /** The placeholder that holds the globe's place while it loads. */
  readonly placeholder: Locator;
  /** The 3D globe's canvas. */
  readonly canvas: Locator;
  /** The still picture, where the 3D globe cannot be drawn, and the box that holds it. */
  readonly stillPicture: Locator;
  readonly stillGlobe: Locator;
  /** The legend over the stage, from 640 px, and its entries. */
  readonly legend: Locator;
  readonly legendEntries: Locator;
  /** The line under the still picture, under 640 px. */
  readonly stillLine: Locator;
  readonly allPins: Locator;
  /** The list of pins over the globe, a keyboard's and a screen reader's way to the teammates. */
  readonly pinList: Locator;
  readonly pinButtons: Locator;
  /** The pins that are lifted, and the labels shown at rest and lifted. */
  readonly liftedPins: Locator;
  /** The pins placed just now, which pulse once. */
  readonly newPins: Locator;
  readonly restingLabels: Locator;
  readonly liftedLabels: Locator;
  /** The new teammate's own pin, lifted, and its label. */
  readonly youPin: Locator;
  readonly youLabel: Locator;
  readonly toastRegion: Locator;
  readonly toast: Locator;
  readonly dismiss: Locator;

  /** Every image element on the page: a name rendered as markup would make one. */
  readonly images: Locator;
  /** Everything the page shows. */
  readonly everything: Locator;

  constructor(readonly page: Page) {
    this.main = page.locator('main.globe-screen');
    this.images = page.locator('img');
    this.everything = page.locator('body');
    this.stage = this.main.locator('.globe-screen__stage');
    this.globeBox = this.stage.locator('.globe-screen__globe');
    this.globe = this.stage.locator('.globe:not(.globe--loading)');
    this.placeholder = this.stage.getByRole('img', { name: 'The globe is loading' });
    this.canvas = this.stage.locator('canvas.globe__art');
    this.stillPicture = this.stage.locator('svg.globe__art');
    this.stillGlobe = this.stage.locator('.globe:has(svg.globe__art)');
    this.legend = this.stage.locator('.globe-screen__legend');
    this.legendEntries = this.legend.locator('li');
    this.stillLine = this.stage.locator('.globe-screen__still');
    this.allPins = this.stage.locator('.globe__pin');
    this.pinList = this.stage.locator('ul.globe__pins');
    this.pinButtons = this.pinList.locator('li.globe__pin > button.pin');
    this.liftedPins = this.pinList.locator('li.globe__pin--lifted');
    this.newPins = this.pinList.locator('.pin--new');
    this.restingLabels = this.pinList.locator('.pin-label:not(.pin-label--lifted)');
    this.liftedLabels = this.pinList.locator('.pin-label--lifted');
    this.youPin = this.stage.locator('.globe__pin--lifted .pin--you');
    this.youLabel = this.stage.locator('.globe__pin--lifted .pin-label__name');
    this.toastRegion = page.locator('.toast-region');
    this.toast = this.toastRegion.locator('.toast');
    this.dismiss = this.toast.getByRole('button', { name: 'Dismiss' });
  }

  /** A pin's button, by the start of its accessible name: a teammate's name, or a group's count. */
  pin(name: string): Locator {
    return this.pinList.getByRole('button', { name: named(name) });
  }

  /** The item a pin's button is in, which carries where it is and whether it is lifted or far. */
  pinItem(name: string): Locator {
    return this.pinList
      .locator('li.globe__pin')
      .filter({ has: this.page.getByRole('button', { name: named(name) }) });
  }

  /** A pin's label, beside its button. */
  labelOf(name: string): Locator {
    return this.pinItem(name).locator('.pin-label');
  }

  /** The accessible names of the pins in the list, in its order. */
  async pinNames(): Promise<string[]> {
    return this.pinButtons.evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute('aria-label') ?? ''),
    );
  }

  /** Where a pin is drawn, in % of the globe's box. */
  async pinPlace(name: string): Promise<{ x: number; y: number }> {
    return this.pinItem(name).evaluate((item: HTMLElement) => ({
      x: parseFloat(item.style.getPropertyValue('--x')),
      y: parseFloat(item.style.getPropertyValue('--y')),
    }));
  }

  /** A pin's hit area: the box that takes the pointer, in CSS px. */
  async hitArea(name: string): Promise<{ width: number; height: number }> {
    return this.pin(name).evaluate((button) => {
      const area = getComputedStyle(button, '::before');
      return { width: parseFloat(area.width), height: parseFloat(area.height) };
    });
  }

  /** Taps the globe where no pin is: its box's top-left corner, outside the disc. */
  async tapOffThePins(): Promise<void> {
    const box = await this.globe.boundingBox();
    if (!box) throw new Error('The globe is not drawn');
    await this.page.mouse.click(box.x + 8, box.y + box.height / 2);
  }

  async open(): Promise<void> {
    await this.page.goto('/globe');
  }

  /** Loses the 3D globe's WebGL context, as a browser does when the GPU is reset. */
  async loseTheContext(): Promise<void> {
    await this.canvas.evaluate((canvas: HTMLCanvasElement) =>
      canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext(),
    );
  }

  /** Drags across the globe with the mouse, from its centre, by `dx` and `dy` CSS px. */
  async dragWithTheMouse(dx: number, dy: number): Promise<void> {
    const { x, y } = await this.globeCentre();
    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    for (let step = 1; step <= 10; step++)
      await this.page.mouse.move(x + (dx * step) / 10, y + (dy * step) / 10);
    await this.page.mouse.up();
  }

  /** Drags across the globe with one finger, from its centre, by `dx` and `dy` CSS px. */
  async dragWithAFinger(dx: number, dy: number): Promise<void> {
    const { x, y } = await this.globeCentre();
    const cdp = await this.page.context().newCDPSession(this.page);
    const touch = (
      type: 'touchStart' | 'touchMove' | 'touchEnd',
      points: { x: number; y: number }[],
    ) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
    await touch('touchStart', [{ x, y }]);
    for (let step = 1; step <= 10; step++)
      await touch('touchMove', [{ x: x + (dx * step) / 10, y: y + (dy * step) / 10 }]);
    await touch('touchEnd', []);
    await cdp.detach();
  }

  /**
   * Makes the page taller than the window, as the panel under the globe will make it on a phone
   * (journeys 11 to 15), so there is somewhere to scroll to.
   */
  async makeRoomToScroll(): Promise<void> {
    await this.page.evaluate(() => document.body.style.setProperty('min-height', '200vh'));
  }

  /** How far the page is scrolled down, in CSS px. */
  scrolled(): Promise<number> {
    return this.page.evaluate(() => window.scrollY);
  }

  private async globeCentre(): Promise<{ x: number; y: number }> {
    const box = await this.globe.boundingBox();
    if (!box) throw new Error('The globe is not drawn');
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  /** Where the centre of Sofia's own pin is on the page, in CSS px. */
  async sofiaAt(): Promise<{ x: number; y: number }> {
    const box = await this.pin('Sofia Bianchi (you)').boundingBox();
    if (!box) throw new Error('Sofia’s pin is not on the globe');
    const round = (value: number) => Math.round(value * 10) / 10;
    return { x: round(box.x + box.width / 2), y: round(box.y + box.height / 2) };
  }

  /** The name of the new pin's pulse animation, or "none" when it does not pulse. */
  pulse(): Promise<string> {
    return this.youPin.evaluate((pin) => getComputedStyle(pin, '::after').animationName);
  }
}

/** An accessible name that starts with `name`. */
function named(name: string): RegExp {
  return new RegExp(`^${escape(name)}`);
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
