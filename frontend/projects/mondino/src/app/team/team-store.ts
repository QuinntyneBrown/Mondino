import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { ApiError, TEAM_API, TEAM_MEMBERSHIP, type Moment, type TeamPins } from '@mondino/api';

/** Loading until the pins are read; Forgotten when the session no longer has the team. */
export type TeamState = 'Loading' | 'Ready' | 'Failed' | 'Forgotten';

/**
 * The team on the Globe screen (show-pins): its pins, read once for the remembered team, and the
 * selection, a teammate or a group pin. A session that has ended (401) or a team that is not the
 * session's (404) forgets the membership, so the screen says an invite link is needed. The team's
 * moments (find-moments) are read beside the pins and never hold them up: until they answer, and
 * when they fail, there are none.
 * Provided by `TeamShell`, so the teammate screens share it and it goes when the teammate leaves them.
 */
@Injectable()
export class TeamStore {
  private readonly api = inject(TEAM_API);
  private readonly membership = inject(TEAM_MEMBERSHIP);
  private readonly releasing = new AbortController();

  readonly team = signal<TeamPins | null>(null);
  readonly state = signal<TeamState>('Loading');
  /** The team's moments, one for each teammate a moment belongs to; none until they answer. */
  readonly moments = signal<readonly Moment[]>([]);
  /** The selected teammate, whose pin stands alone; or null. */
  readonly selectedId = signal<string | null>(null);
  /** The teammates of the selected group pin, the anchor's first; or none. */
  readonly heldIds = signal<readonly string[]>([]);
  readonly selectedGroupKey = computed(() => {
    const [first] = this.heldIds();
    return first ? `group:${first}` : null;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.releasing.abort());
  }

  async load(): Promise<void> {
    const teamId = this.membership.current()?.teamId;
    if (!teamId) {
      this.state.set('Forgotten');
      return;
    }
    this.state.set('Loading');
    void this.loadMoments(teamId);
    try {
      this.team.set(await this.api.getPins(teamId, this.releasing.signal));
      this.state.set('Ready');
    } catch (error) {
      if (this.releasing.signal.aborted) return;
      if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
        this.membership.forget();
        this.state.set('Forgotten');
      } else this.state.set('Failed');
    }
  }

  private async loadMoments(teamId: string): Promise<void> {
    try {
      this.moments.set(await this.api.getMoments(teamId, this.releasing.signal));
    } catch {
      // Moments are a highlight: without them the screens still show every pin (L2-049).
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
