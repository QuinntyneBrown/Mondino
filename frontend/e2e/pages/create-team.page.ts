import type { Locator, Page } from '@playwright/test';

/** Create Team: "Start a team.", the form, and once the team is made, its invite link. */
export class CreateTeamPage {
  readonly main: Locator;
  readonly wordmark: Locator;
  readonly kicker: Locator;
  readonly title: Locator;
  readonly lead: Locator;
  readonly form: Locator;
  /** Every control a person fills in the form. */
  readonly formControls: Locator;
  readonly teamName: Locator;
  readonly name: Locator;
  readonly email: Locator;
  readonly emailHelp: Locator;
  readonly country: Locator;
  readonly postalCode: Locator;
  /** The line under the country and postal code: privacy, finding, found or not found. */
  readonly lookup: Locator;
  readonly teamNameError: Locator;
  readonly nameError: Locator;
  readonly emailError: Locator;
  readonly postalCodeError: Locator;
  readonly submit: Locator;
  readonly failed: Locator;
  readonly rateLimit: Locator;
  readonly rateLimitCountdown: Locator;
  readonly city: Locator;
  readonly cityHelp: Locator;
  readonly cityOptions: Locator;
  readonly inviteLink: Locator;
  readonly copyLink: Locator;
  readonly goToTheGlobe: Locator;
  readonly footer: Locator;
  readonly signIn: Locator;
  readonly stage: Locator;
  readonly globe: Locator;
  readonly allPins: Locator;
  readonly youPin: Locator;
  readonly youLabel: Locator;
  readonly toastRegion: Locator;
  readonly toast: Locator;
  /** Images on the screen: there are none when a name is shown as text. */
  readonly images: Locator;
  readonly dismissToast: Locator;

  constructor(readonly page: Page) {
    this.main = page.locator('main.auth');
    this.wordmark = this.main.locator('.brand .wordmark');
    this.kicker = this.main.locator('.auth__kicker');
    this.title = this.main.locator('.auth__title');
    this.lead = this.main.locator('.auth__lead');
    this.form = this.main.locator('form.auth__fields');
    this.formControls = this.form.locator('input, select, textarea');
    this.teamName = this.main.getByLabel('Team name');
    this.name = this.main.getByLabel('Your name');
    this.email = this.main.getByLabel('Work email');
    this.emailHelp = this.main.locator('#email-help');
    this.country = this.main.getByLabel('Country');
    this.postalCode = this.main.getByLabel('Postal code');
    this.lookup = this.main.locator('#lookup');
    this.teamNameError = this.main.locator('#team-error');
    this.nameError = this.main.locator('#name-error');
    this.emailError = this.main.locator('#email-error');
    this.postalCodeError = this.main.locator('#postal-error');
    this.submit = this.form.locator('button[type="submit"]');
    this.failed = this.form.locator('.alert--danger');
    this.rateLimit = this.form.locator('.alert--warning');
    this.rateLimitCountdown = this.rateLimit.locator('.tnum[aria-hidden="true"]');
    this.city = this.main.getByRole('combobox', { name: 'Your city' });
    this.cityHelp = this.main.locator('#city-help');
    this.cityOptions = this.main.getByRole('listbox').getByRole('option');
    this.inviteLink = this.main.getByRole('textbox', { name: 'Invite link' });
    this.copyLink = this.main.locator('.copy-field button');
    this.goToTheGlobe = this.main.getByRole('link', { name: 'Go to the globe' });
    this.footer = this.main.locator('.auth__footer');
    this.signIn = this.footer.getByRole('link', { name: 'Sign in' });
    this.stage = this.main.getByRole('region', { name: 'The globe' });
    this.globe = this.stage.locator('.globe');
    this.allPins = this.stage.locator('.globe__pin');
    this.youPin = this.stage.locator('.globe__pin--lifted .pin-dot--you');
    this.youLabel = this.stage.locator('.globe__pin--lifted .pin-label__name');
    this.toastRegion = page.locator('.toast-region');
    this.toast = this.toastRegion.locator('.toast');
    this.images = this.main.locator('img');
    this.dismissToast = this.toast.getByRole('button', { name: 'Dismiss' });
  }

  async open(): Promise<void> {
    await this.page.goto('/new');
  }

  /** Fills the form as a person would, leaving the postal code field last. */
  async fill(details: {
    teamName?: string;
    name?: string;
    email?: string;
    country?: string;
    postalCode?: string;
  }): Promise<void> {
    if (details.teamName !== undefined) await this.teamName.fill(details.teamName);
    if (details.name !== undefined) await this.name.fill(details.name);
    if (details.email !== undefined) await this.email.fill(details.email);
    if (details.country !== undefined) await this.country.selectOption({ label: details.country });
    if (details.postalCode !== undefined) await this.postalCode.fill(details.postalCode);
  }

  /** Fills Sofia's Northwind, as the mocks do. */
  fillNorthwind(): Promise<void> {
    return this.fill({
      teamName: 'Northwind',
      name: 'Sofia Bianchi',
      email: 'sofia@northwind.co',
      country: 'Italy',
      postalCode: '20121',
    });
  }

  /** Leaves the postal code field, which starts the lookup. */
  async leavePostalCode(): Promise<void> {
    await this.postalCode.blur();
  }

  /** The names of the countries the Country field lists, in order. */
  countryNames(): Promise<string[]> {
    return this.country.locator('option').allTextContents();
  }

  /** The name of the new pin's pulse animation, or "none" when it does not pulse. */
  pulse(): Promise<string> {
    return this.youPin.evaluate((pin) => getComputedStyle(pin, '::after').animationName);
  }

  /** Makes the browser refuse to write to the clipboard, as it may. Call before the screen opens. */
  async refuseCopy(): Promise<void> {
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(new DOMException('Refused', 'NotAllowedError')) },
      });
    });
  }

  /** What is on the clipboard, as text. */
  clipboardText(): Promise<string> {
    return this.page.evaluate(() => navigator.clipboard.readText());
  }

  /** The text selected in the focused field. */
  selectedText(): Promise<string> {
    return this.page.evaluate(() => {
      const field = document.activeElement as HTMLInputElement | null;
      return field?.value.slice(field.selectionStart ?? 0, field.selectionEnd ?? 0) ?? '';
    });
  }

  /** What the browser keeps for this screen: its address, its storage and its cookies, as text. */
  async everythingKept(): Promise<string> {
    const kept = await this.page.evaluate(() => {
      const all = (storage: Storage) =>
        Array.from({ length: storage.length }, (_, i) => {
          const key = storage.key(i) ?? '';
          return `${key}=${storage.getItem(key)}`;
        }).join(';');
      return [location.href, all(localStorage), all(sessionStorage), document.cookie].join('|');
    });
    const cookies = await this.page.context().cookies();
    return `${kept}|${JSON.stringify(cookies)}`;
  }

  /** The team this browser remembers it is in, as the app keeps it, or null. */
  async membership(): Promise<unknown> {
    const kept = await this.page.evaluate(() => localStorage.getItem('mondino.membership'));
    return kept === null ? null : JSON.parse(kept);
  }
}
