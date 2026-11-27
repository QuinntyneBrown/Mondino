import type { Pin } from '@mondino/api';
import { zoneOffsetMinutes } from '../time/offset';

/**
 * The pins west to east, as the Team screen orders its teammates (L2-026): by their time zone's
 * offset from UTC at `now`, then by longitude, then by name, so the order never depends on how
 * the pins arrived.
 */
export function orderWestToEast(pins: readonly Pin[], now: number): Pin[] {
  const offsets = new Map<string, number>();
  const offsetOf = (zone: string) => {
    let offset = offsets.get(zone);
    if (offset === undefined) offsets.set(zone, (offset = zoneOffsetMinutes(now, zone)));
    return offset;
  };
  return [...pins].sort(
    (a, b) =>
      offsetOf(a.timeZoneId) - offsetOf(b.timeZoneId) ||
      a.position.longitude - b.position.longitude ||
      a.name.localeCompare(b.name),
  );
}
