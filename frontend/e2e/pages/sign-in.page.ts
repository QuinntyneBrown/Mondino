import type { Locator, Page } from '@playwright/test';
import { shapesOf } from './not-found.page';

/** The still globe beside the form. */
const stageArt = '.auth__stage .globe svg.globe__art';

/** Sign In: "Welcome back.", one field for a work email, and once a link is asked for, "Check your inbox". */
export class SignInPage {
  readonly main: Locator;
  readonly wordmark: Locator;
  readonly title: Locator;
  readonly lead: Locator;
  readonly form: Locator;
  /** Every control a person fills in the form. */
  readonly formControls: Locator;
  readonly email: Locator;
  readonly emailError: Locator;
  readonly submit: Locator;
  readonly spinner: Locator;
  readonly failed: Locator;
  readonly notice: Locator;
  readonly noticeTitle: Locator;
  readonly noticeText: Locator;
  readonly noticeEmail: Locator;
  readonly useAnotherEmail: Locator;
  readonly footer: Locator;
  readonly startATeam: Locator;
  readonly stage: Locator;
  readonly globe: Locator;
  readonly allPins: Locator;
  /** Images on the screen: there are none when an email is shown as text. */
  readonly images: Locator;

  constructor(readonly page: Page) {
    this.main = page.locator('main.auth');
    this.wordmark = this.main.locator('.brand .wordmark');
    this.title = this.main.locator('.auth__title');
    this.lead = this.main.locator('.auth__lead');
    this.form = this.main.locator('form.auth__fields');
    this.formControls = this.form.locator('input, select, textarea');
    this.email = this.main.getByLabel('Work email');
    this.emailError = this.main.locator('#email-error');
    this.submit = this.form.locator('button[type="submit"]');
    this.spinner = this.submit.locator('.icon--spin');
    this.failed = this.form.locator('.alert--danger');
    this.notice = this.main.locator('.auth__body .notice');
    this.noticeTitle = this.notice.locator('.notice__title');
    this.noticeText = this.notice.locator('.notice__text');
    this.noticeEmail = this.noticeText.locator('strong');
    this.useAnotherEmail = this.notice.getByRole('button', { name: 'Use another email' });
    this.footer = this.main.locator('.auth__footer');
    this.startATeam = this.footer.getByRole('link', { name: 'Start a team' });
    this.stage = this.main.getByRole('region', { name: 'The globe' });
    this.globe = this.stage.getByRole('img', { name: 'The globe, with no pins' });
    this.allPins = this.stage.locator('.globe__pin');
    this.images = this.main.locator('img');
  }

  async open(): Promise<void> {
    await this.page.goto('/sign-in');
  }

  /** Opens an emailed sign-in link: Sign In, with the token in the fragment. */
  async openLink(signInToken: string): Promise<void> {
    await this.page.goto(`/sign-in#${signInToken}`);
  }

  /** The shapes of the still globe the screen draws. */
  globeShapes(): Promise<string[]> {
    return this.page.locator(stageArt).evaluate(shapesOf);
  }

  /** The shapes of the still globe as a mock draws it, from the mock's markup. */
  async globeShapesIn(mock: string): Promise<string[]> {
    const art = await this.page.evaluateHandle(
      ([markup, selector]) =>
        new DOMParser().parseFromString(markup, 'text/html').querySelector(selector),
      [mock, stageArt] as const,
    );
    return art.evaluate(shapesOf);
  }

  /** Types an email and presses the button, as a person would. */
  async askForLink(email: string): Promise<void> {
    await this.email.fill(email);
    await this.submit.click();
  }
}
