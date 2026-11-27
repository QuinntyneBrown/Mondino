import { InjectionToken } from '@angular/core';
import type { PostalCodeResult } from '../cities/city';
import type { Settings } from '../settings/settings-store';
import type { Pin } from '../teams/team-pins';

/**
 * What Profile & Settings reads: the team's name, the viewer's own pin, their country and their
 * own postal code (L2-031), and their own settings (ADR 0023). It is the only answer after joining
 * that carries a postal code, and only the viewer's own (L2-007); it is kept in memory for the
 * screen and in no storage. The postal code is null for a pin placed through "Your city".
 */
export interface Profile {
  readonly teamName: string;
  readonly pin: Pin;
  /** ISO 3166-1 alpha-2: "IT". */
  readonly countryCode: string;
  readonly postalCode: string | null;
  readonly settings: Settings;
}

/**
 * A save from Profile & Settings, sent in the body: the parts that changed. A new location is the
 * country and the postal code together; the settings are the whole set. A part left out is
 * unchanged.
 */
export interface ProfileUpdate {
  readonly countryCode?: string;
  readonly postalCode?: string;
  readonly settings?: Settings;
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
   * Saves the viewer's own new location, whose pin moves to the city of the postal code (L2-032),
   * and their settings (L2-033, L2-034). Refused as the lookup is, or with `invalid_request` or
   * `validation_failed`, and nothing is stored.
   */
  updateProfile(teamId: string, update: ProfileUpdate, signal: AbortSignal): Promise<Profile>;
}

export const PROFILE_API = new InjectionToken<ProfileApi>('ProfileApi');
