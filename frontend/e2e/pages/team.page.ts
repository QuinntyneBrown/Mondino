import type { Locator, Page } from '@playwright/test';

/** Team: where everyone is in their day, the day ribbon over everyone west to east. */
export class TeamPage {
  readonly main: Locator;
  readonly title: Locator;
  readonly lead: Locator;
  /** The header over the teammate screens, its "Team" link and "Invite teammate". */
  readonly header: Locator;
  readonly teamLink: Locator;
  readonly inviteTeammate: Locator;
  /** The day ribbon: its region, its track, its bands, its markers and its hour marks. */
  readonly ribbon: Locator;
  readonly ribbonScroll: Locator;
  readonly ribbonTrack: Locator;
  readonly ribbonBands: Locator;
  readonly markers: Locator;
  readonly scale: Locator;
  /** A large team's ribbon: its line about working hours, its picture, its bars and the count. */
  readonly ribbonSummary: Locator;
  readonly densityScroll: Locator;
  readonly density: Locator;
  readonly bars: Locator;
  readonly barCount: Locator;
  readonly barsGroup: Locator;
  readonly densityControls: Locator;
  readonly ribbonSummaryCount: Locator;
  /** The list's heading, the filter's tab list and its tabs, and the list it controls. */
  readonly listHeading: Locator;
  readonly filters: Locator;
  readonly tabs: Locator;
  readonly list: Locator;
  /** A large team's search, the column headings over its cities, and its city sections. */
  readonly search: Locator;
  readonly teamHead: Locator;
  readonly sections: Locator;
  readonly sectionToggles: Locator;
  /** The line under an open city's 50th teammate. */
  readonly more: Locator;
  /** The table, its caption, its column headings and its rows. */
  readonly table: Locator;
  readonly caption: Locator;
  readonly columns: Locator;
  readonly rows: Locator;
  /** The note in the list's place when the filter leaves no one, and its "Show everyone". */
  readonly note: Locator;
  readonly noteTitle: Locator;
  readonly showEveryone: Locator;
  /** The warning above the list while the weather is unavailable. */
  readonly weatherAlert: Locator;
  /** A team of one's card, and its "Invite teammates". */
  readonly invitePrompt: Locator;
  readonly invitePromptTitle: Locator;
  readonly invitePromptText: Locator;
  readonly inviteTeammates: Locator;
  /** The loading placeholder, its announcement, and the error state with its two ways on. */
  readonly loading: Locator;
  readonly loadingAnnouncement: Locator;
  readonly error: Locator;
  readonly errorTitle: Locator;
  readonly errorText: Locator;
  readonly tryAgain: Locator;
  readonly backToGlobe: Locator;
  /** Every image in the screen: a name typed as markup must make none. */
  readonly images: Locator;

  constructor(readonly page: Page) {
    this.main = page.locator('main#main');
    this.title = this.main.locator('h1');
    this.lead = this.main.locator('.page__lead');
    this.header = page.locator('header.app-header');
    this.teamLink = this.header.getByRole('link', { name: 'Team', exact: true });
    this.inviteTeammate = this.header.getByRole('button', { name: 'Invite teammate' });
    this.ribbon = page.getByRole('region', { name: 'The day, hour by hour' }).first();
    this.ribbonScroll = this.main.locator('.day-ribbon__scroll');
    this.ribbonTrack = this.main.locator('.day-ribbon__track');
    this.ribbonBands = this.main.locator('.day-ribbon__band');
    this.markers = this.main.locator('.day-ribbon__marker');
    this.scale = this.main.locator('.day-ribbon__scale li');
    this.ribbonSummary = this.main.locator('.day-ribbon__summary');
    this.densityScroll = page.getByRole('group', {
      name: 'The day ribbon; scroll sideways to see all 24 hours',
    });
    this.density = this.main.locator('.day-ribbon__track--density');
    this.bars = this.density.locator('.day-ribbon__bar');
    this.barCount = this.density.locator('.day-ribbon__bar-count');
    this.barsGroup = this.density.locator('.day-ribbon__bars');
    this.densityControls = this.density.locator('a, button');
    this.ribbonSummaryCount = this.ribbonSummary.locator('strong');
    this.listHeading = this.main.locator('.section-head h2');
    this.filters = page.getByRole('tablist', { name: 'Filter by status' });
    this.tabs = this.filters.getByRole('tab');
    this.list = page.getByRole('tabpanel');
    this.search = page.getByRole('searchbox', { name: 'Find a person or city' });
    this.teamHead = this.main.locator('.team-head');
    this.sections = this.main.locator('.city-section');
    this.sectionToggles = this.sections.locator('.city-section__toggle');
    this.more = this.sections.locator('.city-section__more');
    this.table = this.main.locator('table.team-table');
    this.caption = this.table.locator('caption');
    this.columns = this.table.locator('thead th');
    this.rows = this.table.locator('tbody tr.team-table__row');
    this.note = this.main.locator('.list-note');
    this.noteTitle = this.note.locator('.list-note__title');
    this.showEveryone = this.note.getByRole('button', { name: 'Show everyone' });
    this.weatherAlert = this.main.locator('.alert');
    this.invitePrompt = this.main.locator('.invite-prompt');
    this.invitePromptTitle = this.invitePrompt.locator('.invite-prompt__title');
    this.invitePromptText = this.invitePrompt.locator('.invite-prompt__text');
    this.inviteTeammates = this.invitePrompt.getByRole('button', { name: 'Invite teammates' });
    this.loading = this.main.locator('.team-loading');
    this.loadingAnnouncement = this.main.locator('p.visually-hidden[role="status"]');
    this.error = this.main.locator('.empty--error');
    this.errorTitle = this.error.locator('.empty__title');
    this.errorText = this.error.locator('.empty__text');
    this.tryAgain = this.error.getByRole('button', { name: 'Try again' });
    this.backToGlobe = this.error.getByRole('link', { name: 'Back to the globe' });
    this.images = this.main.locator('img');
  }

  async open(filter?: string): Promise<void> {
    await this.page.goto(filter ? `/team?filter=${filter}` : '/team');
  }

  tab(name: string): Locator {
    return this.filters.getByRole('tab', { name });
  }

  /** A city's button, by the city's name. */
  sectionToggle(city: string): Locator {
    return this.sectionToggles.filter({
      has: this.page.locator('.city-section__name', { hasText: new RegExp(`^${city}$`) }),
    });
  }

  /** The table a city's button names as what it controls. */
  async controlledBy(toggle: Locator): Promise<Locator> {
    return this.main.locator(`table#${await toggle.getAttribute('aria-controls')}`);
  }

  /** The rows in a city's section. */
  sectionRows(city: string): Locator {
    return this.sections
      .filter({
        has: this.page.locator('.city-section__name', { hasText: new RegExp(`^${city}$`) }),
      })
      .locator('tbody tr.team-table__row');
  }

  /** Each section's button as a mock writes it: city, count, local time and aria-expanded. */
  async sectionHeads(): Promise<{ name: string; count: string; time: string; expanded: string }[]> {
    return this.sectionToggles.evaluateAll((toggles: HTMLElement[]) =>
      toggles.map((toggle) => ({
        name: toggle.querySelector('.city-section__name')?.textContent?.trim() ?? '',
        count: toggle.querySelector('.city-section__count')?.firstChild?.textContent?.trim() ?? '',
        time: toggle.querySelector('.city-section__time')?.textContent?.trim() ?? '',
        expanded: toggle.getAttribute('aria-expanded') ?? '',
      })),
    );
  }

  /** The row of the teammate named, by the link over their name. */
  row(name: string): Locator {
    return this.rows.filter({ has: this.page.locator('.team-table__link', { hasText: name }) });
  }

  /** The ribbon's marker named as a screen reader reads it: "Liam O’Connor, 14:05". */
  marker(name: string): Locator {
    return this.ribbon.getByRole('link', { name, exact: true });
  }

  /** Where each marker sits, as a mock writes it: its --at without the %, its --row and its tooltip. */
  async markerPlaces(): Promise<{ at: string; row: string; title: string }[]> {
    return this.markers.evaluateAll((markers: HTMLElement[]) =>
      markers.map((marker) => ({
        at: marker.style.getPropertyValue('--at').replace('%', '').trim(),
        row: marker.style.getPropertyValue('--row').trim(),
        title: marker.title,
      })),
    );
  }

  /** Scrolls the screen to its bottom, as a teammate reading the whole list does. */
  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await this.page.waitForFunction(
      () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1,
    );
  }

  /** Whether the ribbon is wider than its region, which scrolls sideways inside itself. */
  async ribbonScrolls(): Promise<boolean> {
    return this.ribbonScroll.evaluate((region) => region.scrollWidth > region.clientWidth);
  }

  /** The count over the bar at `index`, from 0 at 00:00. */
  countOnBar(index: number): Locator {
    return this.bars.nth(index).locator('.day-ribbon__bar-count');
  }

  /** Each bar's share of the tallest, as a mock writes it: "0.154". */
  async barShares(): Promise<string[]> {
    return this.bars.evaluateAll((bars: HTMLElement[]) =>
      bars.map((bar) => bar.style.getPropertyValue('--share').trim()),
    );
  }

  /** A row's parts, as the mocks class them. */
  link(row: Locator): Locator {
    return row.locator('.team-table__link');
  }

  cells(row: Locator) {
    return {
      link: row.locator('.team-table__link'),
      you: row.locator('.team-table__you'),
      status: row.locator('.team-table__who > .team-table__sub'),
      phone: row.locator('.team-table__phone'),
      location: row.locator('.team-table__location'),
      time: row.locator('.team-table__time'),
      dot: row.locator('.team-table__time .dot'),
      offset: row.locator('.team-table__offset'),
      /** The dash in the viewer's own offset, named "You". */
      offsetDash: row.locator('.team-table__offset [aria-label]'),
      weather: row.locator('.team-table__weather'),
      weatherIcon: row.locator('.team-table__weather svg'),
      /** A dash in the weather's place, named "Weather not shared". */
      weatherDash: row.locator('.team-table__weather .team-table__none'),
      moment: row.locator('.team-table__moment'),
      nothingComingUp: row.locator('.team-table__moment .team-table__none'),
    };
  }

  /** The names in the rows, in order, without "(you)". */
  async names(): Promise<string[]> {
    return (await this.rows.locator('.team-table__link').allInnerTexts()).map((name) =>
      name.replace(/\s*\(you\)$/, '').trim(),
    );
  }

  /** The shapes of a row's weather icon, each as its tag and its attributes in order of name. */
  async weatherIconShapes(row: Locator): Promise<string[]> {
    return row.locator('.team-table__weather svg').evaluate((svg) =>
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

  /** The address shown, from its path on: "/team?filter=working". */
  address(): string {
    const url = new URL(this.page.url());
    return `${url.pathname}${url.search}`;
  }
}
