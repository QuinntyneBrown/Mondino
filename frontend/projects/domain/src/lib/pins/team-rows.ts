import type {
  ClockFormat,
  Pin,
  StatusFilter,
  TeamCounts,
  TeamRow,
  TemperatureUnit,
} from '@mondino/api';
import { formatTime, localTime } from '../time/local-time';
import { formatOffset, offsetBetween } from '../time/offset';
import { statusFor } from '../time/status';
import { formatDegrees, isNightSky } from '../weather/weather';
import { initialsOf } from './initials';
import { orderWestToEast } from './west-to-east';

/**
 * The Team screen's rows at `now` (L2-026): every pin west to east, each with its local time and
 * status (L2-014, L2-015), its offset from the viewer in the row's words (L2-016) and its weather
 * in the viewer's unit (L2-018, L2-019). The viewer is the pin marked `isViewer`; their own row has
 * no offset. A teammate who does not share their status has none, at any hour.
 */
export function teamRows(
  pins: readonly Pin[],
  now: number,
  format: ClockFormat,
  unit: TemperatureUnit,
): TeamRow[] {
  const viewer = pins.find((pin) => pin.isViewer);
  return orderWestToEast(pins, now).map((pin) => {
    const time = localTime(now, pin.timeZoneId);
    return {
      teammateId: pin.teammateId,
      name: pin.name,
      initials: initialsOf(pin.name),
      colour: pin.colour,
      isViewer: pin.isViewer,
      cityName: pin.cityName,
      country: pin.country,
      localTime: formatTime(time, format),
      status: statusFor(pin, time),
      offset:
        pin.isViewer || !viewer
          ? null
          : formatOffset(offsetBetween(now, pin.timeZoneId, viewer.timeZoneId), 'row'),
      weather:
        pin.weatherState === 'Available' && pin.weather
          ? {
              degrees: formatDegrees(pin.weather.temperatureC, unit),
              condition: pin.weather.condition,
              night: isNightSky(time.hour),
            }
          : null,
      weatherState: pin.weatherState,
    };
  });
}

/**
 * The rows a filter keeps (L2-028), in their order: everyone, those in working hours, or those
 * probably asleep. A row with no status, a teammate who does not share it, is kept by `all` only.
 */
export function filterByStatus(rows: readonly TeamRow[], filter: StatusFilter): TeamRow[] {
  if (filter === 'all') return [...rows];
  const status = filter === 'working' ? 'working-hours' : 'probably-asleep';
  return rows.filter((row) => row.status === status);
}

/**
 * The Team screen's lead (L2-026): "13 teammates · 12 time zones · live", or for a team of one
 * "Just you · 1 time zone · live".
 */
export function teamLine(counts: TeamCounts): string {
  const zones = `${counts.timeZones} time zone${counts.timeZones === 1 ? '' : 's'}`;
  const who = counts.teammates === 1 ? 'Just you' : `${counts.teammates} teammates`;
  return `${who} · ${zones} · live`;
}
