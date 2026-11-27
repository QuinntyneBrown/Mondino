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
  readonly saveBar: Locator;
  readonly saveChanges: Locator;
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
    this.saveBar = page.locator('.save-bar');
    this.saveChanges = this.saveBar.getByRole('button', { name: 'Save changes' });
    this.loadingAnnouncement = this.main.getByRole('status');
    this.skeletons = this.main.locator('.skeleton');
    this.errorTitle = this.main.locator('.empty__title');
    this.errorText = this.main.locator('.empty__text');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
    this.backToGlobe = this.main.getByRole('link', { name: 'Back to the globe' });
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
