import { InjectionToken } from '@angular/core';
import type { CityResult, PostalCodeResult } from '../cities/city';

/**
 * A request to make a team: its name, its maker's name and work email, a country, and the postal
 * code or the city chosen from "Your city" while the lookup is down, with one id the screen makes
 * for all its requests, so a repeated request makes no second team.
 */
export interface CreateTeamRequest {
  readonly teamName: string;
  readonly name: string;
  readonly email: string;
  readonly countryCode: string;
  readonly postalCode: string | null;
  readonly cityId: string | null;
  readonly createRequestId: string;
}

/** The team made and its maker, by random ids, its name and its invite token. Never an email or a postal code. */
export interface CreatedTeam {
  readonly teamId: string;
  readonly teammateId: string;
  readonly teamName: string;
  readonly inviteToken: string;
}

/** Create Team's side of the backend, open to anyone. A refusal is an `ApiError`. */
export interface TeamCreationApi {
  /**
   * Looks a postal code up for its country, with no invite link. The postal code travels in the
   * body. Refused with `postal_code_not_found`, `postal_code_unavailable`, `rate_limited` (with
   * `retryAfterSeconds`) or `validation_failed`.
   */
  lookUpPostalCode(
    countryCode: string,
    postalCode: string,
    signal: AbortSignal,
  ): Promise<PostalCodeResult>;

  /** The cities of a country that start with `text`, for "Your city" while the lookup is down. */
  searchCities(
    countryCode: string,
    text: string,
    signal: AbortSignal,
  ): Promise<readonly CityResult[]>;

  /**
   * Makes the team and starts its maker's session, an `HttpOnly` cookie. The email and the postal
   * code travel in the body. Refused with `validation_failed`, `postal_code_not_found` or
   * `postal_code_unavailable`; it has no rate limit and is never refused for coming too often
   * (ADR 0016).
   */
  createTeam(request: CreateTeamRequest, signal: AbortSignal): Promise<CreatedTeam>;
}

export const TEAM_CREATION_API = new InjectionToken<TeamCreationApi>('TeamCreationApi');
