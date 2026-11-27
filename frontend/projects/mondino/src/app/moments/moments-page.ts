import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
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
import {
  countMoments,
  groupMoments,
  momentWindow,
  followWindow,
  noMomentsOf,
  windowGroups,
} from '@mondino/domain';
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
  // The clock, the team and its moments are the shell's (ADR 0025).
  templateUrl: './moments-page.html',
  styleUrl: './moments-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MomentsPage {
  private readonly clock = inject(CLOCK);
  private readonly router = inject(Router);
  protected readonly store = inject(TeamStore);

  private readonly host: HTMLElement = inject(ElementRef).nativeElement;

  /** The chosen filter: Everything on every visit (L2-030). */
  protected readonly filter = signal<MomentFilter>('everything');

  /** Where the window of moments held in the page starts (ADR 0021). */
  private readonly start = signal(0);
  /** The height of a moment in the page, measured as the window moves, so its space is kept. */
  private readonly rowHeight = signal(112);

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
    return filter === 'everything' || countMoments(this.groups()) ? null : noMomentsOf(filter);
  });

  /** The moments held in the page: every one up to 60, past 60 a window of 60 (L2-047). */
  private readonly view = computed(() => momentWindow(countMoments(this.groups()), this.start()));
  protected readonly shown = computed(() => windowGroups(this.groups(), this.view()));
  /** The space of the moments out of the window, before and after it, in pixels. */
  protected readonly before = computed(() => this.view().before * this.rowHeight());
  protected readonly after = computed(() => this.view().after * this.rowHeight());

  /** The loading placeholder's four rows, as moments/loading draws them. */
  protected readonly loadingRows = [1, 2, 3, 4];

  /** The address that selects a teammate on the Globe. */
  protected readonly addressOf = (teammateId: string): string =>
    this.router.serializeUrl(
      this.router.createUrlTree(['/globe'], { queryParams: { teammate: teammateId } }),
    );

  constructor() {
    // The window follows the scroll, worked out once a frame from where the viewport is, and the
    // listeners go with the screen (ADR 0021).
    const view = this.host.ownerDocument.defaultView;
    let frame = 0;
    const follow = () => {
      if (!frame) frame = requestAnimationFrame(() => ((frame = 0), this.follow()));
    };
    view?.addEventListener('scroll', follow, { passive: true });
    view?.addEventListener('resize', follow, { passive: true });
    inject(DestroyRef).onDestroy(() => {
      cancelAnimationFrame(frame);
      view?.removeEventListener('scroll', follow);
      view?.removeEventListener('resize', follow);
    });
    // Once the window has moved and been drawn, it is checked again against the viewport.
    afterRenderEffect(() => {
      this.view();
      untracked(() => this.follow());
    });
    // A new filter starts its list at the top.
    effect(() => {
      this.filter();
      this.start.set(0);
    });

    // A team the session no longer has: the same address now says an invite link is needed.
    effect(() => {
      if (this.store.state() === 'Forgotten')
        void this.router.navigateByUrl(this.router.url, {
          onSameUrlNavigation: 'reload',
          replaceUrl: true,
        });
    });
  }

  /**
   * Measures a moment's height in the window, finds the moments the viewport shows, and moves the
   * window when they come near either end of it.
   */
  private follow(): void {
    const view = this.view();
    const held = view.to - view.from;
    const box = this.host.querySelector('.moments__window');
    const list = this.host.querySelector('mo-moment-list');
    if (view.before + view.after === 0 || !box || !list || !held) return;
    const height = list.getBoundingClientRect().height / held;
    if (height > 0) this.rowHeight.set(height);
    const top = -box.getBoundingClientRect().top;
    const first = Math.max(Math.floor(top / this.rowHeight()), 0);
    const last = Math.floor((top + innerHeight) / this.rowHeight());
    this.start.set(followWindow(view.to + view.after, view.from, first, last));
  }

  protected tryAgain(): void {
    if (this.store.state() === 'Failed') void this.store.load();
    else void this.store.loadMoments();
  }

  protected choose(teammateId: string): void {
    void this.router.navigateByUrl(this.addressOf(teammateId));
  }
}
