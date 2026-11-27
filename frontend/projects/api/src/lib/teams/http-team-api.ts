import { Injectable } from '@angular/core';
import { getJson } from '../http/request';
import type { Moment } from '../moments/moment';
import type { TeamApi, TeamPins } from './team-pins';

/** `TeamApi` over HTTP. The Globe route binds it, so it stays out of the initial bundle. */
@Injectable()
export class HttpTeamApi implements TeamApi {
  getPins(teamId: string, signal: AbortSignal): Promise<TeamPins> {
    return getJson<TeamPins>(`/api/teams/${encodeURIComponent(teamId)}/pins`, signal);
  }

  getMoments(teamId: string, signal: AbortSignal): Promise<readonly Moment[]> {
    return getJson<Moment[]>(`/api/teams/${encodeURIComponent(teamId)}/moments`, signal);
  }
}
