import { Injectable } from '@angular/core';
import type { CityResult, PostalCodeResult } from '../cities/city';
import { getJson, postJson } from '../http/request';
import type { Invite, InviteApi } from './invite';

/** `InviteApi` over HTTP. The Join route binds it, so it stays out of the initial bundle. */
@Injectable()
export class HttpInviteApi implements InviteApi {
  getInvite(inviteToken: string, signal: AbortSignal): Promise<Invite> {
    return getJson<Invite>(`/api/invites/${encodeURIComponent(inviteToken)}`, signal);
  }

  lookUpPostalCode(
    inviteToken: string,
    countryCode: string,
    postalCode: string,
    signal: AbortSignal,
  ): Promise<PostalCodeResult> {
    return postJson<PostalCodeResult>(
      `/api/invites/${encodeURIComponent(inviteToken)}/postal-code-lookups`,
      { countryCode, postalCode },
      signal,
    );
  }

  searchCities(
    inviteToken: string,
    countryCode: string,
    text: string,
    signal: AbortSignal,
  ): Promise<readonly CityResult[]> {
    return postJson<readonly CityResult[]>(
      `/api/invites/${encodeURIComponent(inviteToken)}/city-searches`,
      { countryCode, text },
      signal,
    );
  }
}
