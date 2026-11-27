import { InjectionToken } from '@angular/core';
import type { Position } from '../globe/position';

/**
 * A teammate's pin as their teammates see it: at their city, never at their postal code, which is
 * in no part of it (L2-007). The local time is not sent: the browser works it out from the time
 * zone (L2-014). Weather and moments join with journeys 13 and 20.
 */
export interface Pin {
  readonly teammateId: string;
  readonly name: string;
  /** A teammate colour of the palette: `teammate-1` to `teammate-13`. */
  readonly colour: string;
  readonly cityName: string;
  readonly country: string;
  readonly position: Position;
  /** An IANA time zone: "Europe/Rome". */
  readonly timeZoneId: string;
  /** Whether the teammate shares if they are working or asleep: when not, no status is shown (L2-015). */
  readonly sharesStatus: boolean;
  /** The viewer's own pin. */
  readonly isViewer: boolean;
}

/** A team as its own teammates see it: its id and name, its invite token, the viewer and the pins. */
export interface TeamPins {
  readonly teamId: string;
  readonly teamName: string;
  readonly inviteToken: string;
  readonly viewerTeammateId: string;
  readonly pins: readonly Pin[];
}

/** Reads a team's pins. Refused with 401 when the session has ended, and 404 for another team. */
export interface TeamApi {
  getPins(teamId: string, signal: AbortSignal): Promise<TeamPins>;
}

export const TEAM_API = new InjectionToken<TeamApi>('TeamApi');
