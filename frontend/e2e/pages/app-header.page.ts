import type { Locator, Page } from '@playwright/test';

/** The header over the four teammate screens: the mark, the navigation, "Invite teammate" and the viewer. */
export class AppHeaderPage {
  readonly header: Locator;
  /** The mark and wordmark, a link to the Globe. */
  readonly home: Locator;
  readonly mark: Locator;
  readonly wordmark: Locator;
  readonly navigation: Locator;
  readonly navigationLinks: Locator;
  readonly currentScreen: Locator;
  readonly inviteTeammate: Locator;
  readonly inviteTeammateLabel: Locator;
  /** The viewer's avatar, the way to Profile & Settings. */
  readonly profile: Locator;
  /** Any navigation landmark on the page, which the screens before a team have none of. */
  readonly anyNavigation: Locator;
  /** Every control in the header a person can press. */
  readonly controls: Locator;

  constructor(readonly page: Page) {
    this.header = page.locator('header.app-header');
    this.home = this.header.getByRole('link', { name: 'Mondino home' });
    this.mark = this.home.locator('svg.mark');
    this.wordmark = this.home.locator('.wordmark');
    this.navigation = this.header.getByRole('navigation', { name: 'Primary' });
    this.navigationLinks = this.navigation.getByRole('link');
    this.currentScreen = this.header.locator('[aria-current="page"]');
    this.inviteTeammate = this.header.getByRole('button', { name: 'Invite teammate' });
    this.inviteTeammateLabel = this.inviteTeammate.locator('.app-header__invite-label');
    this.profile = this.header.getByRole('link', { name: 'Profile & Settings' });
    this.anyNavigation = page.getByRole('navigation');
    this.controls = this.header.locator('a[href], button');
  }

  /** A screen's link in the navigation, by its name. */
  link(name: string): Locator {
    return this.navigation.getByRole('link', { name, exact: true });
  }
}
