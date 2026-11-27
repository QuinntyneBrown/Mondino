import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CLOCK, SETTINGS_STORE, type StatusFilter } from '@mondino/api';
import {
  Alert,
  Button,
  CitySection,
  DayRibbon,
  EmptyState,
  InvitePrompt,
  Skeleton,
  ListNote,
  SearchField,
  Segmented,
  type SegmentedOption,
  TeamTable,
} from '@mondino/components';
import {
  BrowserClock,
  citySections,
  defaultClockFormat,
  defaultTemperatureUnit,
  filterByStatus,
  LargeTeamThreshold,
  ribbonDensity,
  ribbonMarkers,
  ribbonScale,
  searchRows,
  teamCounts,
  teamLine,
  teamRows,
} from '@mondino/domain';
import { InviteDialogOpener } from '../invite-dialog-opener';
import { TeamStore } from '../team-store';

const filterOf = (value: string | null): StatusFilter =>
  value === 'working' || value === 'asleep' ? value : 'all';

const captions: Record<StatusFilter, string> = {
  all: 'Everyone, west to east',
  working: 'Teammates in working hours, west to east',
  asleep: 'Teammates probably asleep, west to east',
};

/** What the list says when a filter leaves no one (L2-028). */
const notes: Record<StatusFilter, { title: string; text: string } | null> = {
  all: null,
  working: {
    title: 'No one is in working hours right now',
    text: 'It’s the quiet gap between time zones. Check back in an hour.',
  },
  asleep: { title: 'No one is asleep right now', text: 'Try another filter.' },
};

/**
 * Team, "Where everyone is in their day" (L2-026 to L2-028): everyone west to east with their
 * local time, offset and weather, worked out again as the one clock's minute changes. Times are on
 * the viewer's clock and temperatures in their unit, as saved on Profile & Settings (L2-019,
 * L2-033), or their country's until a profile has been read in this browser. A row opens the Globe with
 * that teammate selected.
 */
@Component({
  selector: 'mo-team-page',
  imports: [
    Alert,
    Button,
    CitySection,
    DayRibbon,
    EmptyState,
    InvitePrompt,
    ListNote,
    RouterLink,
    SearchField,
    Segmented,
    Skeleton,
    TeamTable,
  ],
  // One clock for the screen, released with it; the team is the shell's.
  providers: [{ provide: CLOCK, useClass: BrowserClock }],
  templateUrl: './team-page.html',
  styleUrl: './team-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamPage {
  private readonly clock = inject(CLOCK);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly store = inject(TeamStore);
  private readonly inviteDialog = inject(InviteDialogOpener);

  /** The filter the address names, `?filter=working` or `asleep`; anything else is All. */
  protected readonly filter = signal<StatusFilter>('all');

  /** The viewer's clock and unit, as saved on Profile & Settings, or their country's (L2-019, L2-033). */
  private readonly settings = inject(SETTINGS_STORE);
  private readonly viewer = computed(() => this.store.team()?.pins.find((pin) => pin.isViewer));
  private readonly clockFormat = computed(
    () => this.settings.clockFormat() ?? defaultClockFormat(this.viewer()?.country ?? ''),
  );
  private readonly unit = computed(
    () => this.settings.temperatureUnit() ?? defaultTemperatureUnit(this.viewer()?.country ?? ''),
  );

  /** The pins with the minute they were worked out at, so every value below moves together. */
  private readonly now = computed(() => {
    this.clock.minute();
    return untracked(() => this.clock.now());
  });

  /** "13 teammates · 12 time zones · live". */
  protected readonly lead = computed(() => {
    const counts = this.counts();
    return counts ? teamLine(counts) : null;
  });

  private readonly counts = computed(() => {
    const pins = this.store.team()?.pins;
    return pins ? teamCounts(pins, this.now()) : null;
  });

  private readonly allRows = computed(() => {
    const pins = this.store.team()?.pins;
    return pins
      ? teamRows(pins, this.now(), this.clockFormat(), this.unit(), this.store.moments())
      : [];
  });

  /**
   * What is typed in a large team's search (L2-056): the screen's own, never in the address, since
   * it can be a teammate's name, and gone when the teammate leaves the screen.
   */
  protected readonly query = signal('');

  /** The cities the teammate has opened (true) or closed (false), by key. */
  private readonly toggled = signal<ReadonlyMap<string, boolean>>(new Map());

  /** The rows the filter and the search keep, west to east (L2-026, L2-028, L2-056). */
  protected readonly rows = computed(() =>
    searchRows(filterByStatus(this.allRows(), this.filter()), this.query()),
  );

  /**
   * A large team's list, city by city: a closed city holds no rows and an open one at most 50, so
   * the rows in the page stay bounded (L2-047, L2-056).
   */
  protected readonly sections = computed(() =>
    this.large() ? citySections(this.rows(), this.toggled()) : [],
  );

  /** "All 13", "Working now 8", "Asleep 2": the team's counts. */
  protected readonly tabs = computed((): SegmentedOption[] => {
    const counts = this.counts();
    return [
      { value: 'all', label: 'All', count: counts?.teammates },
      { value: 'working', label: 'Working now', count: counts?.working },
      { value: 'asleep', label: 'Asleep', count: counts?.asleep },
    ];
  });

  /** A team of one has no list to filter: a card invites the team in its place (L2-054). */
  protected readonly alone = computed(() => this.store.team()?.pins.length === 1);
  protected readonly teamName = computed(() => this.store.team()?.teamName ?? '');

  /** While any pin's weather is unavailable, a warning says the local times are still right. */
  protected readonly weatherUnavailable = computed(
    () => this.store.team()?.pins.some((pin) => pin.weatherState === 'Unavailable') ?? false,
  );

  /** The loading placeholder's six rows, as pages/team/loading draws them. */
  protected readonly loadingRows = [1, 2, 3, 4, 5, 6];

  protected readonly caption = computed(() => captions[this.filter()]);
  /** What the list says when nothing is left: the search's note, or the filter's. */
  protected readonly note = computed(() => {
    const query = this.query().trim();
    return query
      ? { title: `No one matches “${query}”`, text: 'Try another filter.' }
      : notes[this.filter()];
  });

  /** Past 40 teammates faces no longer fit and rows no longer fit on a screen (L2-056). */
  protected readonly large = computed(
    () => (this.store.team()?.pins.length ?? 0) > LargeTeamThreshold,
  );

  /** Each teammate on the day ribbon, at the hour they are living through (L2-027). */
  protected readonly ribbon = computed(() => {
    const pins = this.store.team()?.pins;
    if (!pins) return null;
    if (this.large()) return { markers: [], rows: 1 };
    return ribbonMarkers(pins, this.now(), this.clockFormat());
  });

  /** A large team's ribbon: how many are at each half hour, in place of a face each (L2-027). */
  protected readonly density = computed(() => {
    const pins = this.store.team()?.pins;
    return pins && this.large() ? ribbonDensity(pins, this.now(), this.clockFormat()) : null;
  });

  /** "324 of 500", who are in working hours: a teammate who hides their status is not (L2-015). */
  protected readonly summary = computed(() => {
    const counts = this.counts();
    return counts ? `${counts.working} of ${counts.teammates}` : null;
  });

  protected readonly scale = computed(() => ribbonScale(this.clockFormat()));

  /** The address that selects a teammate on the Globe. */
  protected readonly addressOf = (teammateId: string): string =>
    this.router.serializeUrl(
      this.router.createUrlTree(['/globe'], { queryParams: { teammate: teammateId } }),
    );

  constructor() {
    // Read as the Globe reads `teammate`.
    const subscription = this.route.queryParamMap.subscribe((params) =>
      this.filter.set(filterOf(params.get('filter'))),
    );
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
    // A team the session no longer has: the same address now says an invite link is needed.
    effect(() => {
      if (this.store.state() === 'Forgotten')
        void this.router.navigateByUrl(this.router.url, {
          onSameUrlNavigation: 'reload',
          replaceUrl: true,
        });
    });
  }

  /** Choosing a filter puts it in the address, so it is kept on Back and on a reload. */
  protected chooseFilter(filter: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { filter: filter === 'all' ? null : filter },
      replaceUrl: true,
    });
  }

  /** "Show everyone": the search cleared and the filter back to All. */
  protected showEveryone(): void {
    this.query.set('');
    this.chooseFilter('all');
  }

  /** A city's button opens it when closed and closes it when open. */
  protected toggle(key: string): void {
    const open = this.sections().find((section) => section.key === key)?.open ?? false;
    this.toggled.update((toggled) => new Map(toggled).set(key, !open));
  }

  protected tryAgain(): void {
    void this.store.load();
  }

  protected invite(trigger: HTMLElement): void {
    void this.inviteDialog.open(trigger);
  }

  protected choose(teammateId: string): void {
    void this.router.navigateByUrl(this.addressOf(teammateId));
  }
}
