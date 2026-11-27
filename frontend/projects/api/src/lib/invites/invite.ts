import { InjectionToken } from '@angular/core';
import type { CityResult, PostalCodeResult } from '../cities/city';
import type { Position } from '../globe/position';

/** A teammate's initials and colour: the most a holder of an invite link learns of them. */
export interface InviteAvatar {
  readonly initials: string;
  /** A teammate colour of the palette: `teammate-1` to `teammate-13`. */
  readonly colour: string;
}

/** A country a teammate can join from, and the form its postal codes take. */
export interface Country {
  /** ISO 3166-1 alpha-2: "IT". */
  readonly code: string;
  readonly name: string;
  /** The name as a sentence uses it: "the United States". */
  readonly nameInText: string;
  /** The form, with an example: "Italian postal codes have five digits, like 20121." */
  readonly postalCodeForm: string;
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

  /**
   * Looks a postal code up for its country. The postal code travels in the request's body, never
   * in its address. Refused with `postal_code_not_found`, `postal_code_unavailable`,
   * `rate_limited` (with `retryAfterSeconds`), `validation_failed` or `invite_not_found`.
   */
  lookUpPostalCode(
    inviteToken: string,
    countryCode: string,
    postalCode: string,
    signal: AbortSignal,
  ): Promise<PostalCodeResult>;

  /** The cities of a country that start with `text`, for "Your city" while the lookup is down. */
  searchCities(
    inviteToken: string,
    countryCode: string,
    text: string,
    signal: AbortSignal,
  ): Promise<readonly CityResult[]>;
}

export const INVITE_API = new InjectionToken<InviteApi>('InviteApi');
