import { computed, DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import {
  ApiError,
  CLOCK,
  SETTINGS_STORE,
  TEAM_API,
  TEAM_MEMBERSHIP,
  type Moment,
  type TeamPins,
} from '@mondino/api';

/** How often an open screen reads the team again, while its tab is visible (L2-048). */
export const refreshIntervalMinutes = 15;
const refreshIntervalMs = refreshIntervalMinutes * 60_000;

/** Loading until the pins are read; Forgotten when the session no longer has the team. */
export type TeamState = 'Loading' | 'Ready' | 'Failed' | 'Forgotten';

/** Whether the team's moments have answered: only the Moments screen waits for them (L2-029). */
export type MomentsState = 'Loading' | 'Ready' | 'Failed';

/**
 * The team on the Globe screen (show-pins): its pins, read once for the remembered team, and the
 * selection, a teammate or a group pin. A session that has ended (401) or a team that is not the
 * session's (404) forgets the membership, so the screen says an invite link is needed. The team's
 * moments (find-moments) are read beside the pins and never hold them up: until they answer, and
 * when they fail, there are none.
 * Provided by `TeamShell`, so the teammate screens share it and it goes when the teammate leaves them.
 *
 * The team is read again quietly (keep-team-fresh, ADR 0025): at a minute tick of the shell's one
 * clock 15 minutes or more after the last good read, so never while the tab is hidden, when the
 * clock rests, and at once when it is shown after longer. The store has no timer of its own.
 */
@Injectable()
export class TeamStore {
  private readonly api = inject(TEAM_API);
  private readonly membership = inject(TEAM_MEMBERSHIP);
  private readonly clock = inject(CLOCK);
  private readonly settings = inject(SETTINGS_STORE);
  private readonly releasing = new AbortController();

  readonly team = signal<TeamPins | null>(null);
  readonly state = signal<TeamState>('Loading');
  /** The team's moments, one for each teammate a moment belongs to; none until they answer. */
  readonly moments = signal<readonly Moment[]>([]);
  readonly momentsState = signal<MomentsState>('Loading');
  /** The selected teammate, whose pin stands alone; or null. */
  readonly selectedId = signal<string | null>(null);
  /** The teammates of the selected group pin, the anchor's first; or none. */
  readonly heldIds = signal<readonly string[]>([]);
  readonly selectedGroupKey = computed(() => {
    const [first] = this.heldIds();
    return first ? `group:${first}` : null;
  });
  /** The teammates whose pins the last refresh brought, which pulse once; none after the first read. */
  readonly arrivedIds = signal<readonly string[]>([]);
  /** The minute the pins held were read; null until they are. */
  readonly refreshedAt = signal<number | null>(null);
  /** Whether a refresh is pending, and whether the last one failed (the banner, L2-048). */
  readonly refreshing = signal(false);
  readonly refreshFailed = signal(false);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.releasing.abort());
    effect(() => {
      const minute = this.clock.minute();
      untracked(() => this.refreshIfDue(minute));
    });
  }

  async load(): Promise<void> {
    const teamId = this.membership.current()?.teamId;
    if (!teamId) {
      this.state.set('Forgotten');
      return;
    }
    this.state.set('Loading');
    void this.loadMoments();
    try {
      this.take(await this.api.getPins(teamId, this.releasing.signal));
      this.state.set('Ready');
    } catch (error) {
      if (this.releasing.signal.aborted) return;
      if (!this.forgetsTheTeam(error)) this.state.set('Failed');
    }
  }

  /**
   * Reads the pins and the moments again, quietly: the screen keeps what it shows and its
   * selection, a teammate who was not held before is noted as arrived, and moments that fail keep
   * the last ones. When the pins fail, `refreshFailed` brings the banner; the next minute tick, or
   * its "Try again", reads again.
   */
  async refresh(): Promise<void> {
    const teamId = this.membership.current()?.teamId;
    if (!teamId || this.refreshing()) return;
    this.refreshing.set(true);
    const signal = this.releasing.signal;
    const moments = this.api.getMoments(teamId, signal).then(
      (each) => each,
      () => null,
    );
    try {
      const next = await this.api.getPins(teamId, signal);
      const held = new Set(this.team()?.pins.map((pin) => pin.teammateId));
      this.arrivedIds.set(
        next.pins.filter((pin) => !held.has(pin.teammateId)).map((pin) => pin.teammateId),
      );
      this.take(next);
      this.refreshFailed.set(false);
      const read = await moments;
      if (read && !signal.aborted) {
        this.moments.set(read);
        this.momentsState.set('Ready');
      }
    } catch (error) {
      if (signal.aborted) return;
      if (!this.forgetsTheTeam(error)) this.refreshFailed.set(true);
    } finally {
      this.refreshing.set(false);
    }
  }

  /**
   * Holds the pins read, at this minute, and the viewer's own saved settings they carry, so a
   * browser that never opened Profile & Settings draws in them (ADR 0025).
   */
  private take(team: TeamPins): void {
    this.team.set(team);
    this.refreshedAt.set(this.clock.minute());
    if (team.viewerSettings) this.settings.replace(team.viewerSettings);
  }

  /** Refreshes when the last good read is 15 minutes old or more, or the last refresh failed. */
  private refreshIfDue(minute: number): void {
    const readAt = this.refreshedAt();
    if (this.state() !== 'Ready' || readAt === null) return;
    if (this.refreshFailed() || minute - readAt >= refreshIntervalMs) void this.refresh();
  }

  /** A session that has ended (401) or a team that is not the session's (404) forgets the team. */
  private forgetsTheTeam(error: unknown): boolean {
    if (!(error instanceof ApiError) || (error.status !== 401 && error.status !== 404))
      return false;
    this.membership.forget();
    this.state.set('Forgotten');
    return true;
  }

  /**
   * Reads the team's moments, as the screens open and when Moments' "Try again" is used. Moments are
   * a highlight: without them the Globe and Team still show every pin (L2-049); only the Moments
   * screen says they did not load.
   */
  async loadMoments(): Promise<void> {
    const teamId = this.membership.current()?.teamId;
    if (!teamId) return;
    this.momentsState.set('Loading');
    try {
      this.moments.set(await this.api.getMoments(teamId, this.releasing.signal));
      this.momentsState.set('Ready');
    } catch {
      if (!this.releasing.signal.aborted) this.momentsState.set('Failed');
    }
  }

  select(teammateId: string): void {
    this.heldIds.set([]);
    this.selectedId.set(teammateId);
  }

  selectGroup(teammateIds: readonly string[]): void {
    this.selectedId.set(null);
    this.heldIds.set(teammateIds);
  }

  clear(): void {
    this.selectedId.set(null);
    this.heldIds.set([]);
  }
}
