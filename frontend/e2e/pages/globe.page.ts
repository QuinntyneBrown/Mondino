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
  /** The local time in each resting label. */
  readonly restingTimes: Locator;
  readonly liftedLabels: Locator;
  /** The new teammate's own pin, lifted, and its label. */
  readonly youPin: Locator;
  readonly youLabel: Locator;
  /** The panel beside the globe (under it on a phone), and a selected teammate's parts in it. */
  readonly panel: Locator;
  readonly person: Locator;
  readonly personName: Locator;
  readonly personYou: Locator;
  readonly personAvatar: Locator;
  readonly personPlace: Locator;
  readonly personClock: Locator;
  readonly personDay: Locator;
  readonly personStatus: Locator;
  readonly personWeather: Locator;
  readonly personWeatherIcon: Locator;
  readonly personTemperature: Locator;
  readonly personSky: Locator;
  readonly personWeatherNote: Locator;
  readonly privateNote: Locator;
  readonly personMoments: Locator;
  readonly overlap: Locator;
  readonly overlapWhen: Locator;
  readonly overlapText: Locator;
  readonly overlapParts: Locator;
  /** The overlap bar's shared part, and a "Message" button, which Mondino never has. */
  readonly overlapBoth: Locator;
  readonly messageButton: Locator;
  readonly closePanel: Locator;
  /** The one polite announcement of what was selected. */
  readonly announcement: Locator;
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
    this.restingTimes = this.restingLabels.locator('strong');
    this.liftedLabels = this.pinList.locator('.pin-label--lifted');
    this.youPin = this.stage.locator('.globe__pin--lifted .pin--you');
    this.youLabel = this.stage.locator('.globe__pin--lifted .pin-label__name');
    this.panel = page.locator('aside.globe-screen__panel');
    this.person = this.panel.locator('article.person');
    this.personName = this.person.locator('.person__name');
    this.personYou = this.personName.locator('.person__you');
    this.personAvatar = this.person.locator('.person__head .avatar');
    this.personPlace = this.person.locator('.person__place');
    this.personClock = this.person.locator('.person__clock');
    this.personDay = this.person.locator('.person__day');
    this.personStatus = this.person.locator('.status');
    this.personWeather = this.person.locator('.person__weather');
    this.personWeatherIcon = this.personWeather.locator('svg').first();
    this.personTemperature = this.person.locator('.person__temp');
    this.personSky = this.person.locator('.person__sky');
    this.personWeatherNote = this.person.locator('.person__weather--note');
    this.privateNote = this.person.locator('.panel__note');
    this.personMoments = this.person.locator('.person__moments');
    this.overlap = this.person.locator('section.overlap');
    this.overlapWhen = this.overlap.locator('.overlap__when');
    this.overlapText = this.overlap.locator('.overlap__text');
    this.overlapParts = this.overlap.locator('.overlap__track > span');
    this.overlapBoth = this.overlap.locator('.overlap__both');
    this.messageButton = this.panel.getByRole('button', { name: /message/i });
    this.closePanel = this.panel.getByRole('button', { name: /^Close/ });
    this.announcement = this.main.locator('p.visually-hidden[role="status"]');
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

  /** The local time in a pin's label. */
  labelTimeOf(name: string): Locator {
    return this.labelOf(name).locator('strong');
  }

  /** The degrees in a pin's label, and the condition's word in a lifted one. */
  labelDegreesOf(name: string): Locator {
    return this.labelOf(name).locator('svg.icon + span');
  }

  labelWordOf(name: string): Locator {
    return this.labelOf(name).locator('svg.icon + span + span');
  }

  /** The weather icon in a pin's label. */
  labelIconOf(name: string): Locator {
    return this.labelOf(name).locator('svg.icon');
  }

  /** The shapes of the icon in a pin's label, each as its tag and its attributes in order of name. */
  async labelIconShapes(name: string): Promise<string[]> {
    return this.labelIconOf(name).evaluate((svg) =>
      [...svg.children].map((shape) =>
        [
          shape.tagName,
          ...[...shape.attributes]
            .filter((attribute) => !attribute.name.startsWith('_ng'))
            .map((attribute) => `${attribute.name}=${attribute.value}`)
            .sort(),
        ].join(' '),
      ),
    );
  }

  /** The shapes of the panel's weather icon, each as its tag and its attributes in order of name. */
  async panelIconShapes(): Promise<string[]> {
    return this.personWeatherIcon.evaluate((svg) =>
      [...svg.children].map((shape) =>
        [
          shape.tagName,
          ...[...shape.attributes]
            .filter((attribute) => !attribute.name.startsWith('_ng'))
            .map((attribute) => `${attribute.name}=${attribute.value}`)
            .sort(),
        ].join(' '),
      ),
    );
  }

  /** The overlap bar's parts, each as its class and its --from and --span, as a mock writes them. */
  async overlapBarParts(): Promise<string[]> {
    return this.overlapParts.evaluateAll((parts: HTMLElement[]) =>
      parts.map((part) => {
        const from = part.style.getPropertyValue('--from');
        const span = part.style.getPropertyValue('--span');
        const style = [
          `--from: ${parseFloat(from).toFixed(2)}%`,
          span ? `--span: ${parseFloat(span).toFixed(2)}%` : '',
        ]
          .filter(Boolean)
          .join('; ');
        return `${part.className.split(' ')[0]} ${style}`;
      }),
    );
  }

  /** The panel's fade: its animation's name and duration, "none" when it has none. */
  fade(): Promise<{ name: string; duration: string }> {
    return this.person.evaluate((person) => {
      const style = getComputedStyle(person);
      return { name: style.animationName, duration: style.animationDuration };
    });
  }

  /** Marks the panel's teammate as drawn now, to tell afterwards whether it was drawn afresh. */
  async markPanel(): Promise<void> {
    await this.person.evaluate((person) => person.setAttribute('data-spec-seen', ''));
  }

  /** Whether the panel's teammate is the one drawn when it was marked. */
  panelIsMarked(): Promise<boolean> {
    return this.person.evaluate((person) => person.hasAttribute('data-spec-seen'));
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

  /** Taps the globe with a finger where no pin is. */
  async tapOffThePinsByTouch(): Promise<void> {
    const box = await this.globe.boundingBox();
    if (!box) throw new Error('The globe is not drawn');
    await this.page.touchscreen.tap(box.x + 8, box.y + box.height / 2);
  }

  async open(): Promise<void> {
    await this.page.goto('/globe');
  }

  /** Opens the Globe at the address of a selected teammate, as a reload or a shared address does. */
  async openAt(teammateId: string): Promise<void> {
    await this.page.goto(`/globe?teammate=${encodeURIComponent(teammateId)}`);
  }

  /** The address shown, from its path on: "/globe?teammate=…". */
  address(): string {
    const url = new URL(this.page.url());
    return `${url.pathname}${url.search}`;
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
