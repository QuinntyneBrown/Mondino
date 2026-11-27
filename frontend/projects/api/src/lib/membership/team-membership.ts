import { InjectionToken, type Signal } from '@angular/core';

/**
 * The team this browser's teammate is in: its id, the teammate's id and the team's name. It holds
 * no postal code, no email, no position and no session; the session is an `HttpOnly` cookie
 * scripts cannot read (L2-043).
 */
export interface Membership {
  readonly teamId: string;
  readonly teammateId: string;
  readonly teamName: string;
}

/** Remembers the team after joining, making a team or signing in, and forgets it on leaving. */
export interface TeamMembership {
  /** The team remembered, or null. */
  readonly current: Signal<Membership | null>;
  remember(membership: Membership): void;
  forget(): void;
}

export const TEAM_MEMBERSHIP = new InjectionToken<TeamMembership>('TeamMembership');
