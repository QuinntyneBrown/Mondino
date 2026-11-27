import type { Locator, Page } from '@playwright/test';
import { shapesOf, type MockMomentRow, type MockTodayMoment } from '../support/mocks';

/** Moments: the team's holidays, races and local happenings, today first, then by when. */
export class MomentsPage {
  readonly main: Locator;
  readonly title: Locator;
  readonly lead: Locator;
  /** The header over the teammate screens, its "Moments" link and "Invite teammate". */
  readonly header: Locator;
  readonly momentsLink: Locator;
  readonly inviteTeammate: Locator;
  /** The filters: one group of pressed buttons. */
  readonly filters: Locator;
  readonly chips: Locator;
  /** Today's moments, the group headings, and every other moment's row. */
  readonly todayMoments: Locator;
  readonly groupTitles: Locator;
  readonly rows: Locator;
  /** The note in the list's place when a kind has no moment, and its "Show everything". */
  readonly note: Locator;
  readonly noteTitle: Locator;
  readonly showEverything: Locator;
  /** With no moment at all: what the screen says, and its way back. */
  readonly empty: Locator;
  readonly emptyTitle: Locator;
  readonly emptyText: Locator;
  /** The loading placeholder and its announcement. */
  readonly loading: Locator;
  readonly loadingAnnouncement: Locator;
  /** The error state and its two ways on. */
  readonly error: Locator;
  readonly errorTitle: Locator;
  readonly errorText: Locator;
  readonly tryAgain: Locator;
  readonly backToGlobe: Locator;
  /** Every image in the screen: a title typed as markup must make none. */
  readonly images: Locator;

  constructor(readonly page: Page) {
    this.main = page.locator('main#main');
    this.title = this.main.locator('h1');
    this.lead = this.main.locator('.page__lead');
    this.header = page.locator('header.app-header');
    this.momentsLink = this.header.getByRole('link', { name: 'Moments', exact: true });
    this.inviteTeammate = this.header.getByRole('button', { name: 'Invite teammate' });
    this.filters = this.main.getByRole('group', { name: 'Filter by kind' });
    this.chips = this.filters.getByRole('button');
    this.todayMoments = this.main.locator('a.today-moment');
    this.groupTitles = this.main.locator('.moment-group__title');
    this.rows = this.main.locator('a.moment-row');
    this.note = this.main.locator('.list-note');
    this.noteTitle = this.note.locator('.list-note__title');
    this.showEverything = this.note.getByRole('button', { name: 'Show everything' });
    this.empty = this.main.locator('.empty');
    this.emptyTitle = this.empty.locator('.empty__title');
    this.emptyText = this.empty.locator('.empty__text');
    this.loading = this.main.locator('.moments-loading');
    this.loadingAnnouncement = this.main.getByRole('status').filter({ hasText: 'Loading' });
    this.error = this.main.locator('.empty--error');
    this.errorTitle = this.error.locator('.empty__title');
    this.errorText = this.error.locator('.empty__text');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
    this.backToGlobe = this.main.getByRole('link', { name: 'Back to the globe' });
    this.images = this.main.locator('img');
  }

  async open(): Promise<void> {
    await this.page.goto('/moments');
  }

  /** A filter, by its name: "Formula 1". */
  chip(name: string): Locator {
    return this.filters.getByRole('button', { name, exact: true });
  }

  /** A moment's row, by its title and its teammate's first name. */
  row(title: string, firstName: string): Locator {
    return this.rows
      .filter({ has: this.page.locator('.moment-row__title', { hasText: title }) })
      .filter({ has: this.page.locator('.moment-row__who', { hasText: firstName }) });
  }

  /** A row's kind and when: "Local event · In 4 days". */
  kindOf(row: Locator): Locator {
    return row.locator('.moment-row__kind');
  }

  /** The rows' titles, in order. */
  get rowTitles(): Locator {
    return this.rows.locator('.moment-row__title');
  }

  /** Each filter as a mock writes it: its name, aria-pressed and its icon's shapes. */
  async chipParts(): Promise<{ name: string; pressed: string; icon: string[] }[]> {
    const chips = await this.chips.evaluateAll((chips: HTMLElement[]) =>
      chips.map((chip) => ({
        name: chip.textContent?.trim() ?? '',
        pressed: chip.getAttribute('aria-pressed') ?? '',
        icon: chip.querySelector('svg')?.outerHTML ?? '',
      })),
    );
    return chips.map((chip) => ({ ...chip, icon: shapesOf(chip.icon) }));
  }

  /** Each row as a mock writes it, part by part. */
  async rowParts(): Promise<MockMomentRow[]> {
    const rows = await this.rows.evaluateAll((rows: HTMLElement[]) => {
      const text = (row: Element, selector: string) =>
        row.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      return rows.map((row) => {
        const avatar = row.querySelector('.avatar');
        return {
          date: [
            text(row, '.date-block__weekday'),
            text(row, '.date-block__day'),
            text(row, '.date-block__month'),
          ].join(' '),
          kind: text(row, '.moment-row__kind'),
          icon: row.querySelector('.moment-row__kind svg')?.outerHTML ?? '',
          title: text(row, '.moment-row__title'),
          detail: text(row, '.moment-row__detail'),
          who: text(row, '.moment-row__who').replace(/^\S+\s/, ''),
          initials: avatar?.textContent?.trim() ?? '',
          hue: [...(avatar?.classList ?? [])].find((name) => name.startsWith('hue-')) ?? '',
        };
      });
    });
    return rows.map((row) => ({ ...row, icon: shapesOf(row.icon) }));
  }

  /** Today's first card as a mock writes it, part by part. */
  async todayParts(): Promise<MockTodayMoment> {
    const card = await this.todayMoments.first().evaluate((card: HTMLElement) => {
      const text = (selector: string) =>
        card.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      return {
        kicker: text('.today-moment__kicker'),
        title: text('.today-moment__title'),
        detail: text('.today-moment__detail'),
        go: text('.today-moment__go'),
        icon: card.querySelector('svg')?.outerHTML ?? '',
      };
    });
    return { ...card, icon: shapesOf(card.icon) };
  }

  /** The moments in the page: today's cards and the rows. */
  async momentsInPage(): Promise<number> {
    return this.main.locator('a.today-moment, a.moment-row').count();
  }

  /** Scrolls the window to the bottom of the page. */
  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  }

  /** Scrolls the window to the top of the page. */
  async scrollToTop(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, 0));
  }
}
