import type { Offset } from '@mondino/api';
import { localTime } from './local-time';

const minuteMs = 60_000;

/**
 * The minutes by which a time zone is ahead of UTC at the instant `now`, from the browser's time
 * zone data: its daylight saving with it. The one place this feature reads a zone's rule.
 */
export function zoneOffsetMinutes(now: number, timeZoneId: string): number {
  const time = localTime(now, timeZoneId);
  const [year, month, day] = time.date.split('-').map(Number);
  const wall = Date.UTC(year, month - 1, day, time.hour, time.minute);
  return Math.round((wall - (now - (now % minuteMs))) / minuteMs);
}

/** How far a teammate's local time is from the viewer's at `now` (L2-016). */
export function offsetBetween(now: number, timeZoneId: string, viewerTimeZoneId: string): Offset {
  const difference = zoneOffsetMinutes(now, timeZoneId) - zoneOffsetMinutes(now, viewerTimeZoneId);
  return {
    minutes: Math.abs(difference),
    direction: difference > 0 ? 'ahead' : difference < 0 ? 'behind' : 'same',
  };
}

/**
 * An offset in the mocks' words, never "0h": "7h behind", "4h 30m ahead" or "Same time" on a Team
 * row, and "7h behind you", "10h ahead of you" or "same time as you" on a panel.
 */
export function formatOffset(offset: Offset, form: 'row' | 'panel'): string {
  if (offset.direction === 'same') return form === 'row' ? 'Same time' : 'same time as you';
  const hours = Math.floor(offset.minutes / 60);
  const minutes = offset.minutes % 60;
  const size = [hours ? `${hours}h` : '', minutes ? `${minutes}m` : ''].filter(Boolean).join(' ');
  if (form === 'row') return `${size} ${offset.direction}`;
  return offset.direction === 'ahead' ? `${size} ahead of you` : `${size} behind you`;
}
