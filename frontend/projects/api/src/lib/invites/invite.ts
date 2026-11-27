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
  /** The team has all 500 of its places taken: only its name is given, with no count, pins or avatars. */
  readonly full: boolean;
  readonly countries: readonly Country[];
}

/**
 * A join: a name, a country, and the postal code, or the city chosen from "Your city" while the
 * lookup is down, with one id the screen makes for all its join requests, so a repeated request
 * makes no second pin.
 */
export interface JoinRequest {
  readonly name: string;
  readonly countryCode: string;
  readonly postalCode: string | null;
  readonly cityId: string | null;
  readonly joinRequestId: string;
}

/** The team and the new teammate, by their random ids. */
export interface JoinResult {
  readonly teamId: string;
  readonly teammateId: string;
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

  /**
   * Joins the team and starts the session, an `HttpOnly` cookie. The postal code travels in the
   * body. Refused with `validation_failed`, `team_full`, `invite_not_found`, `rate_limited` (with
   * `retryAfterSeconds`), `postal_code_not_found` or `postal_code_unavailable`.
   */
  join(inviteToken: string, request: JoinRequest, signal: AbortSignal): Promise<JoinResult>;
}

export const INVITE_API = new InjectionToken<InviteApi>('InviteApi');
