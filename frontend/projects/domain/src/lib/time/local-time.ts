import type { ClockFormat } from '@mondino/api';

export type Weekday =
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

/** The wall-clock time at a teammate's city: their own hour, minute, day and date. */
export interface LocalTime {
  /** 0 to 23. */
  readonly hour: number;
  readonly minute: number;
  readonly weekday: Weekday;
  /** The local calendar date: "2025-10-28". */
  readonly date: string;
}

/** One formatter for each time zone, made once: formatting is cheap, making a formatter is not. */
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZoneId: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZoneId);
  if (!formatter) {
    try {
      formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: timeZoneId,
        hourCycle: 'h23',
        weekday: 'long',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      // A time zone the browser does not know gives UTC's time.
      return formatterFor('UTC');
    }
    formatters.set(timeZoneId, formatter);
  }
  return formatter;
}

/**
 * The local time in an IANA time zone at `now` (L2-014). The browser's time zone data gives the
 * zone's rule, daylight saving with it, so a time worked out afresh each minute follows a change.
 */
export function localTime(now: number, timeZoneId: string): LocalTime {
  const parts: Record<string, string> = {};
  for (const { type, value } of formatterFor(timeZoneId).formatToParts(now)) parts[type] = value;
  return {
    hour: Number(parts['hour']),
    minute: Number(parts['minute']),
    weekday: parts['weekday'].toLowerCase() as Weekday,
    date: `${parts['year']}-${parts['month']}-${parts['day']}`,
  };
}

const twoDigits = (value: number) => String(value).padStart(2, '0');

/** A local time on the viewer's clock: "08:05", or "8:05 am" on the 12-hour clock. */
export function formatTime(time: LocalTime, format: ClockFormat): string {
  if (format === '24-hour') return `${twoDigits(time.hour)}:${twoDigits(time.minute)}`;
  const hour = time.hour % 12 || 12;
  return `${hour}:${twoDigits(time.minute)} ${time.hour < 12 ? 'am' : 'pm'}`;
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The teammate's own day, as a panel shows it: "Tuesday 28 Oct". */
export function formatDay(time: LocalTime): string {
  const [, month, day] = time.date.split('-').map(Number);
  const weekday = time.weekday[0].toUpperCase() + time.weekday.slice(1);
  return `${weekday} ${day} ${months[month - 1]}`;
}
