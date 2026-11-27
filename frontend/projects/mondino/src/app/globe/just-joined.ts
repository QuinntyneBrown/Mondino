import type { Position } from '@mondino/api';

/**
 * The teammate who has just joined, as Join hands them to the Globe in the navigation state, never
 * in the address: their id, their name and their city's name and position.
 */
export interface JustJoined {
  readonly teammateId: string;
  readonly name: string;
  readonly cityName: string;
  readonly position: Position;
}
