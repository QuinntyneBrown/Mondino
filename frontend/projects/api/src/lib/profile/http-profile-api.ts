import { Injectable } from '@angular/core';
import type { PostalCodeResult } from '../cities/city';
import { getJson, postJson, putJson, remove } from '../http/request';
import type { Profile, ProfileApi, ProfileUpdate } from './profile';

/** `ProfileApi` over HTTP. The Profile & Settings route binds it, so it stays out of the initial bundle. */
@Injectable()
export class HttpProfileApi implements ProfileApi {
  getProfile(teamId: string, signal: AbortSignal): Promise<Profile> {
    return getJson<Profile>(this.me(teamId), signal);
  }

  lookUpPostalCode(
    teamId: string,
    countryCode: string,
    postalCode: string,
    signal: AbortSignal,
  ): Promise<PostalCodeResult> {
    return postJson<PostalCodeResult>(
      `${this.me(teamId)}/postal-code-lookups`,
      { countryCode, postalCode },
      signal,
    );
  }

  updateProfile(teamId: string, update: ProfileUpdate, signal: AbortSignal): Promise<Profile> {
    return putJson<Profile>(this.me(teamId), update, signal);
  }

  leaveTeam(teamId: string, signal: AbortSignal): Promise<void> {
    return remove(this.me(teamId), signal);
  }

  private me(teamId: string): string {
    return `/api/teams/${encodeURIComponent(teamId)}/me`;
  }
}
