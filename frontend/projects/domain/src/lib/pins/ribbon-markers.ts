import type { ClockFormat, Pin, RibbonMarker, RibbonView } from '@mondino/api';
import { formatTime, localTime } from '../time/local-time';
import { initialsOf } from './initials';
import { orderWestToEast } from './west-to-east';

/** A marker's row is free once its last marker is one step of the scale, three hours, before. */
const laneGapMinutes = 3 * 60;

/**
 * The day ribbon's markers at `now` (L2-027): each teammate at their local hour and minute as a
 * share of the day, so 08:05 sits just after the 08:00 mark. They are taken by local time, then
 * west to east, the viewer's own first among teammates of the same city; each takes the lowest row
 * whose last marker is three hours or more before it, so markers at one hour, or close to it, are
 * each visible and can be chosen, as the mocks place them.
 */
export function ribbonMarkers(pins: readonly Pin[], now: number, format: ClockFormat): RibbonView {
  const westToEast = orderWestToEast(pins, now);
  const order = new Map(westToEast.map((pin, index) => [pin, index]));
  const placed = westToEast.map((pin) => {
    const time = localTime(now, pin.timeZoneId);
    return { pin, minute: time.hour * 60 + time.minute, time: formatTime(time, format) };
  });
  // Pins of one city stand at the city's own position.
  const samePlace = (a: Pin, b: Pin) =>
    a.position.latitude === b.position.latitude && a.position.longitude === b.position.longitude;
  placed.sort(
    (a, b) =>
      a.minute - b.minute ||
      (samePlace(a.pin, b.pin) ? Number(b.pin.isViewer) - Number(a.pin.isViewer) : 0) ||
      order.get(a.pin)! - order.get(b.pin)!,
  );
  const lastInLane: number[] = [];
  const markers = placed.map(({ pin, minute, time }): RibbonMarker => {
    let lane = lastInLane.findIndex((last) => minute - last >= laneGapMinutes);
    if (lane === -1) lane = lastInLane.length;
    lastInLane[lane] = minute;
    return {
      teammateId: pin.teammateId,
      name: pin.name,
      initials: initialsOf(pin.name),
      colour: pin.colour,
      cityName: pin.cityName,
      localTime: time,
      at: Math.round((minute / 1440) * 10_000) / 100,
      lane,
    };
  });
  return { markers, rows: Math.max(1, lastInLane.length) };
}

/**
 * The ribbon's nine hour marks, every three hours from midnight to midnight (L2-027): "00:00" to
 * "00:00", or on the 12-hour clock by the hour alone, "12 am", "3 am" … "9 pm", "12 am".
 */
export function ribbonScale(format: ClockFormat): string[] {
  return Array.from({ length: 9 }, (_, step) => {
    const hour = (step * 3) % 24;
    if (format === '24-hour') return `${String(hour).padStart(2, '0')}:00`;
    return `${hour % 12 || 12} ${hour < 12 ? 'am' : 'pm'}`;
  });
}
