import { InjectionToken } from '@angular/core';
import type { Position } from '../globe/position';

/** A teammate's initials and colour: the most a holder of an invite link learns of them. */
export interface InviteAvatar {
  readonly initials: string;
  /** A teammate colour of the palette: `teammate-1` to `teammate-13`. */
  readonly colour: string;
}

/** A country a teammate can join from. */
export interface Country {
  /** ISO 3166-1 alpha-2: "IT". */
  readonly code: string;
  readonly name: string;
}

/**
 * A team as its invite link shows it to someone who has not joined: its name, its count, a bare
 * position for each teammate and the initials and colours of the five who joined most recently.
 */
export interface Invite {
  readonly teamName: string;
  readonly teammateCount: number;
  readonly positions: readonly Position[];
  readonly avatars: readonly InviteAvatar[];
  /** The browser's session already belongs to a teammate of this team. */
  readonly alreadyJoined: boolean;
  readonly countries: readonly Country[];
}

/** The invite link's side of the backend. A refusal is an `ApiError`. */
export interface InviteApi {
  /** Opens an invite link. Refused with `invite_not_found` when it matches no team. */
  getInvite(inviteToken: string, signal: AbortSignal): Promise<Invite>;
}

export const INVITE_API = new InjectionToken<InviteApi>('InviteApi');
