import { Injectable } from '@angular/core';
import type { CityResult, PostalCodeResult } from '../cities/city';
import { postJson } from '../http/request';
import type { CreatedTeam, CreateTeamRequest, TeamCreationApi } from './team-creation';

/** `TeamCreationApi` over HTTP. The Create Team route binds it, so it stays out of the initial bundle. */
@Injectable()
export class HttpTeamCreationApi implements TeamCreationApi {
  lookUpPostalCode(
    countryCode: string,
    postalCode: string,
    signal: AbortSignal,
  ): Promise<PostalCodeResult> {
    return postJson<PostalCodeResult>(
      '/api/postal-code-lookups',
      { countryCode, postalCode },
      signal,
    );
  }

  searchCities(
    countryCode: string,
    text: string,
    signal: AbortSignal,
  ): Promise<readonly CityResult[]> {
    return postJson<readonly CityResult[]>('/api/city-searches', { countryCode, text }, signal);
  }

  createTeam(request: CreateTeamRequest, signal: AbortSignal): Promise<CreatedTeam> {
    return postJson<CreatedTeam>('/api/teams', request, signal);
  }
}
