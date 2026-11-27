import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CLOCK, type MomentFilter } from '@mondino/api';
import {
  Button,
  EmptyState,
  FilterChips,
  ListNote,
  MomentList,
  Skeleton,
} from '@mondino/components';
import { BrowserClock, groupMoments } from '@mondino/domain';
import { TeamStore } from '../team/team-store';

/**
 * Moments, "Holidays, races and local happenings where your teammates live." (L2-029, L2-030):
 * the team's moments from today to 90 days ahead, today's first, then This week and Later, worked
 * out again as the one clock's minute changes, so a moment moves at its place's midnight. Filtered
 * by kind in the browser; every kind is listed, whatever the viewer chose for the globe (L2-022).
 * A moment opens the Globe with its teammate selected.
 */
@Component({
  selector: 'mo-moments-page',
  imports: [Button, EmptyState, FilterChips, ListNote, MomentList, RouterLink, Skeleton],
  // One clock for the screen, released with it; the team and its moments are the shell's.
  providers: [{ provide: CLOCK, useClass: BrowserClock }],
  templateUrl: './moments-page.html',
  styleUrl: './moments-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MomentsPage {
  private readonly clock = inject(CLOCK);
  private readonly router = inject(Router);
  protected readonly store = inject(TeamStore);

  /** The chosen filter: Everything on every visit (L2-030). */
  protected readonly filter = signal<MomentFilter>('everything');

  /** The minute the moments were grouped at. */
  private readonly now = computed(() => {
    this.clock.minute();
    return untracked(() => this.clock.now());
  });

  /** Loading until both the pins and the moments have answered; Failed when either failed. */
  protected readonly state = computed(() => {
    const team = this.store.state();
    const moments = this.store.momentsState();
    if (team === 'Failed' || moments === 'Failed') return 'Failed';
    return team === 'Ready' && moments === 'Ready' ? 'Ready' : 'Loading';
  });

  /** Every upcoming moment, of every kind. */
  private readonly all = computed(() =>
    groupMoments(this.store.moments(), this.store.team()?.pins ?? [], this.now()),
  );

  /** With nothing ahead of any kind, the screen says so and shows no filter. */
  protected readonly nothing = computed(() => {
    const all = this.all();
    return all.today.length + all.thisWeek.length + all.later.length === 0;
  });

  /** The moments of the chosen kind, grouped as before (L2-030). */
  protected readonly groups = computed(() => {
    const all = this.all();
    const filter = this.filter();
    if (filter === 'everything') return all;
    return {
      today: all.today.filter((moment) => moment.kind === filter),
      thisWeek: all.thisWeek.filter((moment) => moment.kind === filter),
      later: all.later.filter((moment) => moment.kind === filter),
    };
  });

  /** What the list says when the chosen kind has nothing ahead: "No sport moments coming up". */
  protected readonly note = computed(() => {
    const filter = this.filter();
    const groups = this.groups();
    if (
      filter === 'everything' ||
      groups.today.length + groups.thisWeek.length + groups.later.length
    )
      return null;
    return `No ${notes[filter]} moments coming up`;
  });

  /** The loading placeholder's four rows, as moments/loading draws them. */
  protected readonly loadingRows = [1, 2, 3, 4];

  /** The address that selects a teammate on the Globe. */
  protected readonly addressOf = (teammateId: string): string =>
    this.router.serializeUrl(
      this.router.createUrlTree(['/globe'], { queryParams: { teammate: teammateId } }),
    );

  constructor() {
    // A team the session no longer has: the same address now says an invite link is needed.
    effect(() => {
      if (this.store.state() === 'Forgotten')
        void this.router.navigateByUrl(this.router.url, {
          onSameUrlNavigation: 'reload',
          replaceUrl: true,
        });
    });
  }

  protected tryAgain(): void {
    if (this.store.state() === 'Failed') void this.store.load();
    else void this.store.loadMoments();
  }

  protected choose(teammateId: string): void {
    void this.router.navigateByUrl(this.addressOf(teammateId));
  }
}

/** Each kind as the note names it. */
const notes: Record<Exclude<MomentFilter, 'everything'>, string> = {
  holiday: 'holiday',
  'formula-1': 'Formula 1',
  'local-event': 'local event',
  sport: 'sport',
};
