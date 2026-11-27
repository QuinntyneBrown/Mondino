import { InjectionToken } from '@angular/core';
import type { PostalCodeResult } from '../cities/city';
import type { Pin } from '../teams/team-pins';

/**
 * What Profile & Settings reads: the team's name, the viewer's own pin, their country and their
 * own postal code (L2-031). It is the only answer after joining that carries a postal code, and
 * only the viewer's own (L2-007); it is kept in memory for the screen and in no storage. The
 * postal code is null for a pin placed through "Your city". The settings join with journey 23.
 */
export interface Profile {
  readonly teamName: string;
  readonly pin: Pin;
  /** ISO 3166-1 alpha-2: "IT". */
  readonly countryCode: string;
  readonly postalCode: string | null;
}

/** A save of the viewer's own location: the country and the postal code, sent in the body. */
export interface ProfileUpdate {
  readonly countryCode: string;
  readonly postalCode: string;
}

/** The viewer's own pin and settings. A refusal is an `ApiError`. */
export interface ProfileApi {
  /** The viewer's own profile. Refused with 401 when the session has ended, 404 for another team. */
  getProfile(teamId: string, signal: AbortSignal): Promise<Profile>;

  /**
   * Looks a new postal code up and changes nothing (L2-032). The postal code travels in the body.
   * Refused with `postal_code_not_found`, `postal_code_unavailable`, `rate_limited` or
   * `validation_failed`.
   */
  lookUpPostalCode(
    teamId: string,
    countryCode: string,
    postalCode: string,
    signal: AbortSignal,
  ): Promise<PostalCodeResult>;

  /**
   * Saves the viewer's own new location: the pin moves to the city of the postal code (L2-032).
   * Refused as the lookup is, and nothing is stored.
   */
  updateProfile(teamId: string, update: ProfileUpdate, signal: AbortSignal): Promise<Profile>;
}

export const PROFILE_API = new InjectionToken<ProfileApi>('ProfileApi');
