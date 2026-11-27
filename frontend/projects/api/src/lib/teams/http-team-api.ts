import { Injectable } from '@angular/core';
import { getJson } from '../http/request';
import type { TeamApi, TeamPins } from './team-pins';

/** `TeamApi` over HTTP. The Globe route binds it, so it stays out of the initial bundle. */
@Injectable()
export class HttpTeamApi implements TeamApi {
  getPins(teamId: string, signal: AbortSignal): Promise<TeamPins> {
    return getJson<TeamPins>(`/api/teams/${encodeURIComponent(teamId)}/pins`, signal);
  }
}
