import { signal } from '@angular/core';
import type { Membership, TeamMembership } from '@mondino/api';

/** Where the membership is kept in the browser's local storage. */
export const membershipKey = 'mondino.membership';

/**
 * `TeamMembership` in the browser's local storage, so a teammate is still in their team when the
 * tab is opened again. Storage that is blocked or full is treated as empty: the membership then
 * lasts as long as the tab.
 */
export class LocalTeamMembership implements TeamMembership {
  private readonly value = signal<Membership | null>(read());

  readonly current = this.value.asReadonly();

  remember(membership: Membership): void {
    const kept: Membership = {
      teamId: membership.teamId,
      teammateId: membership.teammateId,
      teamName: membership.teamName,
    };
    this.value.set(kept);
    try {
      localStorage.setItem(membershipKey, JSON.stringify(kept));
    } catch {
      // Kept for this tab only.
    }
  }

  forget(): void {
    this.value.set(null);
    try {
      localStorage.removeItem(membershipKey);
    } catch {
      // Nothing was kept.
    }
  }
}

function read(): Membership | null {
  try {
    const kept: unknown = JSON.parse(localStorage.getItem(membershipKey) ?? 'null');
    if (typeof kept !== 'object' || kept === null) return null;
    const { teamId, teammateId, teamName } = kept as Record<string, unknown>;
    return typeof teamId === 'string' &&
      typeof teammateId === 'string' &&
      typeof teamName === 'string'
      ? { teamId, teammateId, teamName }
      : null;
  } catch {
    return null;
  }
}
