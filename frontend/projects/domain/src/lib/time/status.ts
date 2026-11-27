import type { Pin, Status } from '@mondino/api';
import type { LocalTime } from './local-time';
import { WorkingDay } from './working-day';

/**
 * The status of a local hour, by the table of L2-015: 07:00 to 08:59 early morning, 09:00 to
 * 17:59 working hours, 18:00 to 22:59 evening, and 23:00 to 06:59 probably asleep. It takes no day:
 * Mondino keeps no calendar of working days.
 */
export function statusAt(localHour: number): Status {
  if (localHour >= 7 && localHour * 60 < WorkingDay.startMinute) return 'early-morning';
  if (localHour * 60 >= WorkingDay.startMinute && localHour * 60 < WorkingDay.endMinute)
    return 'working-hours';
  if (localHour >= 18 && localHour < 23) return 'evening';
  return 'probably-asleep';
}

/**
 * A teammate's status at their local time, or none at any hour when they do not share it. What
 * shows, counts or filters by status calls this, never `statusAt`.
 */
export function statusFor(pin: Pick<Pin, 'sharesStatus'>, time: LocalTime): Status | null {
  return pin.sharesStatus ? statusAt(time.hour) : null;
}

const words: Record<Status, string> = {
  'early-morning': 'Early morning',
  'working-hours': 'Working hours',
  evening: 'Evening',
  'probably-asleep': 'Probably asleep',
};

/** A status as its words, never as a colour alone (L2-015). */
export function statusWords(status: Status): string {
  return words[status];
}
