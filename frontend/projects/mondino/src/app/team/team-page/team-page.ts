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
import { ActivatedRoute, Router } from '@angular/router';
import { CLOCK, type StatusFilter } from '@mondino/api';
import {
  DayRibbon,
  ListNote,
  Segmented,
  type SegmentedOption,
  TeamTable,
} from '@mondino/components';
import {
  BrowserClock,
  defaultClockFormat,
  defaultTemperatureUnit,
  filterByStatus,
  ribbonMarkers,
  ribbonScale,
  teamCounts,
  teamLine,
  teamRows,
} from '@mondino/domain';
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
 * the viewer's clock and temperatures in their unit: until Profile & Settings stores a choice
 * (journey 23), the defaults for the country of their pin (L2-019). A row opens the Globe with
 * that teammate selected.
 */
@Component({
  selector: 'mo-team-page',
  imports: [DayRibbon, ListNote, Segmented, TeamTable],
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

  /** The filter the address names, `?filter=working` or `asleep`; anything else is All. */
  protected readonly filter = signal<StatusFilter>('all');

  private readonly viewer = computed(() => this.store.team()?.pins.find((pin) => pin.isViewer));
  private readonly clockFormat = computed(() => defaultClockFormat(this.viewer()?.country ?? ''));
  private readonly unit = computed(() => defaultTemperatureUnit(this.viewer()?.country ?? ''));

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
    return pins ? teamRows(pins, this.now(), this.clockFormat(), this.unit()) : [];
  });

  /** The rows the filter keeps, west to east. */
  protected readonly rows = computed(() => filterByStatus(this.allRows(), this.filter()));

  /** "All 13", "Working now 8", "Asleep 2": the team's counts. */
  protected readonly tabs = computed((): SegmentedOption[] => {
    const counts = this.counts();
    return [
      { value: 'all', label: 'All', count: counts?.teammates },
      { value: 'working', label: 'Working now', count: counts?.working },
      { value: 'asleep', label: 'Asleep', count: counts?.asleep },
    ];
  });

  protected readonly caption = computed(() => captions[this.filter()]);
  protected readonly note = computed(() => notes[this.filter()]);

  /** Each teammate on the day ribbon, at the hour they are living through (L2-027). */
  protected readonly ribbon = computed(() => {
    const pins = this.store.team()?.pins;
    return pins ? ribbonMarkers(pins, this.now(), this.clockFormat()) : null;
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

  protected choose(teammateId: string): void {
    void this.router.navigateByUrl(this.addressOf(teammateId));
  }
}
