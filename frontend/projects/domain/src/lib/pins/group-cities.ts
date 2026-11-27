import type { ClockFormat, GroupCity, GroupContent, Pin } from '@mondino/api';
import { formatTime, localTime } from '../time/local-time';
import { initialsOf } from './initials';

/**
 * A selected group pin's panel (L2-023): its count, where it is ("All in Milan" or "3 cities"),
 * and its teammates city by city, the city with the most teammates first and cities of one size
 * west to east, each city's local time worked out once. Within a city the viewer comes first,
 * then the others by name. A teammate no longer on the team is left out.
 */
export function groupCities(
  pins: readonly Pin[],
  teammateIds: readonly string[],
  now: number,
  format: ClockFormat,
): GroupContent {
  const wanted = new Set(teammateIds);
  const cities = new Map<string, { pins: Pin[]; longitude: number }>();
  for (const pin of pins) {
    if (!wanted.has(pin.teammateId)) continue;
    const key = `${pin.cityName}|${pin.timeZoneId}`;
    const city = cities.get(key);
    if (city) city.pins.push(pin);
    else cities.set(key, { pins: [pin], longitude: pin.position.longitude });
  }
  const ordered = [...cities.values()].sort(
    (a, b) => b.pins.length - a.pins.length || a.longitude - b.longitude,
  );
  const count = ordered.reduce((total, city) => total + city.pins.length, 0);
  const listed: GroupCity[] = ordered.map((city) => ({
    cityName: city.pins[0].cityName,
    localTime: formatTime(localTime(now, city.pins[0].timeZoneId), format),
    rows: [...city.pins]
      .sort((a, b) => Number(b.isViewer) - Number(a.isViewer) || a.name.localeCompare(b.name))
      .map((pin) => ({
        teammateId: pin.teammateId,
        name: pin.name,
        initials: initialsOf(pin.name),
        colour: pin.colour,
        isViewer: pin.isViewer,
      })),
  }));
  const where = listed.length === 1 ? `All in ${listed[0].cityName}` : `${listed.length} cities`;
  return {
    title: `${count} teammates close together`,
    lead: `${where} · pick someone to see their pin`,
    cities: listed,
  };
}
