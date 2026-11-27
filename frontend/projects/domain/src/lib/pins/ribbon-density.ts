import type { ClockFormat, Pin, RibbonDensity } from '@mondino/api';
import { formatTime, localTime } from '../time/local-time';

/**
 * The day ribbon of a large team as a bar chart at `now` (L2-027): the pins counted in 48 bins,
 * one for each half hour of the day, by local time, so a teammate at 15:05 is in the bin from
 * 15:00. Every teammate is counted, a teammate who does not share their status too, since a local
 * time is always shown. One pass over the pins.
 */
export function ribbonDensity(
  pins: readonly Pin[],
  now: number,
  format: ClockFormat,
): RibbonDensity {
  const bins = Array<number>(48).fill(0);
  for (const pin of pins) {
    const time = localTime(now, pin.timeZoneId);
    bins[time.hour * 2 + (time.minute >= 30 ? 1 : 0)]++;
  }
  const max = Math.max(...bins);
  const maxBin = bins.indexOf(max);
  const maxBinTime = formatTime(
    { ...localTime(now, 'UTC'), hour: Math.floor(maxBin / 2), minute: (maxBin % 2) * 30 },
    format,
  );
  return { bins, max, maxBin, maxBinTime };
}
