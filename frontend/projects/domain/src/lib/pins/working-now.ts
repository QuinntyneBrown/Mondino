import type { ClockFormat, Pin, WorkingNow } from '@mondino/api';
import { formatTime, localTime, type LocalTime } from '../time/local-time';
import { statusFor } from '../time/status';
import { initialsOf } from './initials';
import { orderWestToEast } from './west-to-east';

/**
 * Who is in working hours at `now` (L2-024): every pin whose status is Working hours, ordered by
 * local hour and then west to east, counted in full and listed up to `limit`, with how many more
 * there are. A teammate who does not share their status has none, so is neither counted nor listed.
 */
export function workingNow(
  pins: readonly Pin[],
  now: number,
  format: ClockFormat,
  limit: number,
): WorkingNow {
  const times = new Map<Pin, LocalTime>();
  const working = orderWestToEast(pins, now).filter((pin) => {
    const time = localTime(now, pin.timeZoneId);
    if (statusFor(pin, time) !== 'working-hours') return false;
    times.set(pin, time);
    return true;
  });
  // A stable sort keeps west to east within an hour.
  working.sort((a, b) => times.get(a)!.hour - times.get(b)!.hour);
  const listed = working.slice(0, limit);
  return {
    count: working.length,
    teammates: listed.map((pin) => ({
      teammateId: pin.teammateId,
      name: pin.name,
      initials: initialsOf(pin.name),
      colour: pin.colour,
      cityName: pin.cityName,
      localTime: formatTime(times.get(pin)!, format),
      isViewer: pin.isViewer,
    })),
    more: working.length - listed.length,
  };
}
