/** One formatter for each time zone, made once: formatting is cheap, making a formatter is not. */
const formatters = new Map<string, Intl.DateTimeFormat>();

/**
 * The local time in a time zone at `now`, on a 24-hour clock: "15:05". A time zone the browser
 * does not know gives UTC's. The 12-hour clock joins with Profile & Settings (journey 23).
 */
export function localTimeIn(timeZoneId: string, now: number): string {
  let formatter = formatters.get(timeZoneId);
  if (!formatter) {
    try {
      formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: timeZoneId,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      });
    } catch {
      return timeZoneId === 'UTC' ? '' : localTimeIn('UTC', now);
    }
    formatters.set(timeZoneId, formatter);
  }
  return formatter.format(now);
}
