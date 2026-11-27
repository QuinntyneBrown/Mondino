import type { Locator, Page } from '@playwright/test';

/** The `--x` and `--y` of each pin, in %, west to east. Runs in the browser. */
function placesOf(pins: Element[]): { x: number; y: number }[] {
  return pins
    .map((pin) => {
      const style = (pin as HTMLElement).style;
      return {
        x: parseFloat(style.getPropertyValue('--x')),
        y: parseFloat(style.getPropertyValue('--y')),
      };
    })
    .sort((a, b) => a.x - b.x);
}

/** Join: the screen an invite link opens, in each of its states. */
export class JoinPage {
  readonly main: Locator;
  readonly wordmark: Locator;
  readonly title: Locator;
  readonly lead: Locator;
  readonly team: Locator;
  readonly avatars: Locator;
  readonly avatarGroup: Locator;
  /** Bold markup inside the team line: there is none when a name is shown as text. */
  readonly teamMarkup: Locator;
  readonly status: Locator;
  readonly skeletons: Locator;
  readonly form: Locator;
  readonly name: Locator;
  readonly country: Locator;
  readonly postalCode: Locator;
  readonly privacy: Locator;
  readonly placeMyPin: Locator;
  readonly notice: Locator;
  readonly noticeTitle: Locator;
  readonly noticeText: Locator;
  readonly startYourOwnTeam: Locator;
  readonly tryAgain: Locator;
  readonly footer: Locator;
  readonly signIn: Locator;
  readonly stage: Locator;
  readonly globe: Locator;
  readonly pins: Locator;
  readonly pinLayer: Locator;

  constructor(readonly page: Page) {
    this.main = page.locator('main.join');
    this.wordmark = this.main.locator('.brand .wordmark');
    this.title = this.main.locator('.join__title');
    this.lead = this.main.locator('.join__lead');
    this.team = this.main.locator('.join__team');
    this.avatars = this.team.locator('.avatar');
    this.avatarGroup = this.team.locator('.avatar-group');
    this.teamMarkup = this.team.locator('b');
    this.status = this.main.getByRole('status');
    this.skeletons = this.main.locator('.skeleton');
    this.form = this.main.locator('form.join__fields');
    this.name = this.main.getByLabel('Your name');
    this.country = this.main.getByLabel('Country');
    this.postalCode = this.main.getByLabel('Postal code');
    this.privacy = this.main.locator('.lookup');
    this.placeMyPin = this.main.getByRole('button', { name: 'Place my pin' });
    this.notice = this.main.locator('.notice');
    this.noticeTitle = this.notice.locator('.notice__title');
    this.noticeText = this.notice.locator('.notice__text');
    this.startYourOwnTeam = this.notice.getByRole('link', { name: 'Start your own team' });
    this.tryAgain = this.notice.getByRole('button', { name: 'Try again' });
    this.footer = this.main.locator('.join__footer');
    this.signIn = this.footer.getByRole('link', { name: 'Sign in' });
    this.stage = this.main.getByRole('region', { name: 'The team on the globe' });
    this.globe = this.stage.locator('.globe');
    this.pins = this.stage.locator('.globe__pin .pin-dot');
    this.pinLayer = this.stage.locator('.globe__pins');
  }

  async open(inviteToken: string): Promise<void> {
    await this.page.goto(`/join/${inviteToken}`);
  }

  /** The initials of the avatars beside the team's name, in order. */
  avatarInitials(): Promise<string[]> {
    return this.avatars.allTextContents().then((all) => all.map((text) => text.trim()));
  }

  /** The names of the countries the Country field lists, in order. */
  countryNames(): Promise<string[]> {
    return this.country.locator('option').allTextContents();
  }

  /** Where each pin is drawn, as a percentage of the globe's width and height, west to east. */
  pinPlaces(): Promise<{ x: number; y: number }[]> {
    return this.stage.locator('.globe__pin').evaluateAll(placesOf);
  }

  /** Where a mock draws each pin on Join's globe, from the mock's markup, west to east. */
  async pinPlacesIn(mock: string): Promise<{ x: number; y: number }[]> {
    const pins = await this.page.evaluateHandle(
      (markup) => [
        ...new DOMParser()
          .parseFromString(markup, 'text/html')
          .querySelectorAll('.join__stage .globe__pin'),
      ],
      mock,
    );
    return pins.evaluate(placesOf);
  }
}
