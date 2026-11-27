import type { Locator, Page } from '@playwright/test';

/** Profile & Settings, "Your pin": the viewer's own pin and the Location section. */
export class ProfilePage {
  readonly main: Locator;
  readonly title: Locator;
  /** The header over the teammate screens, its link to this screen and "Invite teammate". */
  readonly header: Locator;
  readonly profileLink: Locator;
  readonly inviteTeammate: Locator;
  /** The pin's card: the small globe, the city, the local time and the note. */
  readonly pinCard: Locator;
  readonly globe: Locator;
  readonly canvas: Locator;
  readonly stillPicture: Locator;
  readonly stillGlobe: Locator;
  readonly youPin: Locator;
  readonly youLabel: Locator;
  readonly city: Locator;
  readonly time: Locator;
  readonly note: Locator;
  /** The Location section. */
  readonly location: Locator;
  readonly locationNote: Locator;
  readonly country: Locator;
  readonly postalCode: Locator;
  readonly lookUp: Locator;
  /** The line under the fields: finding, found or not found. */
  readonly lookup: Locator;
  /** The warning when the lookup is down or refused for too many tries, and its "Try again". */
  readonly warning: Locator;
  readonly tryLookupAgain: Locator;
  /** "Your city", which Join offers while the lookup is down; never here. */
  readonly yourCity: Locator;
  /** The Display section: a radio group each for the temperature and the clock. */
  readonly display: Locator;
  readonly temperature: Locator;
  readonly clock: Locator;
  /** Moments on the globe, a switch per kind, and What teammates see, the two sharing switches. */
  readonly moments: Locator;
  readonly privacy: Locator;
  readonly shareWeather: Locator;
  readonly shareStatus: Locator;
  /** The note under the sharing switches when both are off. */
  readonly sharingNote: Locator;
  readonly saveBar: Locator;
  readonly saveChanges: Locator;
  readonly saveBarButton: Locator;
  readonly saveBarText: Locator;
  readonly trySavingAgain: Locator;
  /** While the profile is read, and when it fails. */
  readonly loadingAnnouncement: Locator;
  readonly skeletons: Locator;
  readonly errorTitle: Locator;
  readonly errorText: Locator;
  readonly tryAgain: Locator;
  readonly backToGlobe: Locator;

  constructor(readonly page: Page) {
    this.main = page.locator('main#main');
    this.title = this.main.locator('h1');
    this.header = page.locator('header.app-header');
    this.profileLink = this.header.getByRole('link', { name: 'Profile & Settings' });
    this.inviteTeammate = this.header.getByRole('button', { name: 'Invite teammate' });
    this.pinCard = this.main.locator('.pin-card');
    this.globe = this.pinCard.locator('.globe');
    this.canvas = this.pinCard.locator('canvas.globe__art');
    this.stillPicture = this.pinCard.locator('mo-globe-fallback');
    this.stillGlobe = this.stillPicture.locator('.globe');
    this.youPin = this.pinCard.locator('.globe__pin--lifted');
    this.youLabel = this.youPin.locator('.pin-label__name');
    this.city = this.pinCard.locator('.pin-card__city');
    this.time = this.pinCard.locator('.pin-card__time');
    this.note = this.pinCard.locator('.pin-card__note');
    this.location = this.main.getByRole('region', { name: 'Location' });
    this.locationNote = this.location.locator('.settings-section__note');
    this.country = this.location.getByLabel('Country');
    this.postalCode = this.location.getByLabel('Postal code');
    this.lookUp = this.location.getByRole('button', { name: 'Look up' });
    this.lookup = this.location.locator('.lookup');
    this.warning = this.location.locator('.alert--warning');
    this.tryLookupAgain = this.warning.getByRole('button', { name: 'Try again' });
    this.yourCity = page.getByLabel('Your city');
    this.display = this.main.getByRole('region', { name: 'Display' });
    this.temperature = this.display.getByRole('radiogroup', { name: 'Temperature' });
    this.clock = this.display.getByRole('radiogroup', { name: 'Clock' });
    this.moments = this.main.getByRole('region', { name: 'Moments on the globe' });
    this.privacy = this.main.getByRole('region', { name: 'What teammates see' });
    this.shareWeather = this.privacy.getByRole('switch', { name: /^Share my local weather/ });
    this.shareStatus = this.privacy.getByRole('switch', {
      name: /^Share whether I’m working or asleep/,
    });
    this.sharingNote = this.privacy.locator('.panel__note');
    this.saveBar = page.locator('.save-bar');
    this.saveChanges = this.saveBar.getByRole('button', { name: 'Save changes' });
    this.saveBarButton = this.saveBar.getByRole('button');
    this.saveBarText = this.saveBar.locator('.save-bar__text');
    this.trySavingAgain = this.saveBar.getByRole('button', { name: 'Try again' });
    this.loadingAnnouncement = this.main.getByRole('status');
    this.skeletons = this.main.locator('.skeleton');
    this.errorTitle = this.main.locator('.empty__title');
    this.errorText = this.main.locator('.empty__text');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
    this.backToGlobe = this.main.getByRole('link', { name: 'Back to the globe' });
  }

  /** An option of a Display radio group: "°F" of Temperature. */
  option(group: Locator, name: string): Locator {
    return group.getByRole('radio', { name, exact: true });
  }

  /** A kind's switch under Moments on the globe: "Big sporting days". */
  kindSwitch(label: string): Locator {
    return this.moments.getByRole('switch', { name: label });
  }

  /** "On" or "Off" beside a switch's track. */
  stateOf(control: Locator): Locator {
    return control.locator('.switch__state');
  }

  /** The line under a switch's label. */
  hintOf(control: Locator): Locator {
    return control.locator('.switch-row__hint');
  }

  /** The emblem leading a kind's switch. */
  emblemOf(control: Locator): Locator {
    return control.locator('.emblem');
  }

  /** The tick a chosen option carries besides its fill. */
  tick(option: Locator): Locator {
    return option.locator('.segmented__check');
  }

  async open(): Promise<void> {
    await this.page.goto('/profile');
  }

  /** Types a country and a postal code into the Location section, and leaves the field. */
  async move(country: string, postalCode: string): Promise<void> {
    await this.country.selectOption({ label: country });
    await this.postalCode.fill(postalCode);
    await this.postalCode.blur();
  }

  /** Drags across the small globe with the mouse, from its centre, by `dx` CSS px. */
  async dragAcrossTheGlobe(dx: number): Promise<void> {
    const box = (await this.globe.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    for (let step = 1; step <= 10; step++) await this.page.mouse.move(x + (dx * step) / 10, y);
    await this.page.mouse.up();
  }

  /** Where the viewer's pin is drawn on the small globe, in % of its box. */
  async pinPlace(): Promise<{ x: number; y: number }> {
    return this.youPin.evaluate((pin) => ({
      x: parseFloat((pin as HTMLElement).style.getPropertyValue('--x')),
      y: parseFloat((pin as HTMLElement).style.getPropertyValue('--y')),
    }));
  }
}
