import type { Pin, TeamCounts } from '@mondino/api';
import { localTime } from '../time/local-time';
import { statusFor } from '../time/status';

/**
 * The team's counts at `now` (L2-025), in one pass over the pins: the teammates, their distinct
 * time zones, and how many are in working hours and probably asleep by `statusFor`, so a teammate
 * who does not share their status is counted as neither (L2-015).
 */
export function teamCounts(pins: readonly Pin[], now: number): TeamCounts {
  const zones = new Set<string>();
  let working = 0;
  let asleep = 0;
  for (const pin of pins) {
    zones.add(pin.timeZoneId);
    const status = statusFor(pin, localTime(now, pin.timeZoneId));
    if (status === 'working-hours') working++;
    else if (status === 'probably-asleep') asleep++;
  }
  return { teammates: pins.length, timeZones: zones.size, working, asleep };
}

/** The counts as the Globe's heading reads them: "13 teammates" and "12 time zones · 8 working · 2 asleep". */
export function countsWords(counts: TeamCounts): { title: string; line: string } {
  const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
  return {
    title: plural(counts.teammates, 'teammate'),
    line: `${plural(counts.timeZones, 'time zone')} · ${counts.working} working · ${counts.asleep} asleep`,
  };
}
