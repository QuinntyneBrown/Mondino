import {
  WorkingDay,
  type ClockFormat,
  type DaySpan,
  type Overlap,
  type OverlapText,
} from '@mondino/api';
import { zoneOffsetMinutes } from './offset';

const day = 1440;
const ofDay = (minute: number) => ((minute % day) + day) % day;

/** How many minutes a teammate's zone is ahead of the viewer's at `now`. */
const aheadBy = (now: number, timeZoneId: string, viewerTimeZoneId: string) =>
  zoneOffsetMinutes(now, timeZoneId) - zoneOffsetMinutes(now, viewerTimeZoneId);

/** A teammate's working day moved onto the viewer's clock at `now` (L2-017). */
export function workingDayOnViewerClock(
  now: number,
  timeZoneId: string,
  viewerTimeZoneId: string,
): DaySpan {
  const ahead = aheadBy(now, timeZoneId, viewerTimeZoneId);
  return {
    startMinute: ofDay(WorkingDay.startMinute - ahead),
    endMinute: ofDay(WorkingDay.endMinute - ahead),
  };
}

/**
 * The part of the viewer's working day and a teammate's that coincides, on the viewer's clock, or
 * none (L2-017). A working day recurs every day, so the teammate's is tried a day either side as
 * well; with 9 hours of work and 15 between, at most one of the three meets the viewer's.
 */
export function overlapBetween(
  now: number,
  timeZoneId: string,
  viewerTimeZoneId: string,
): Overlap | null {
  const ahead = aheadBy(now, timeZoneId, viewerTimeZoneId);
  for (const shift of [-day, 0, day]) {
    const startMinute = Math.max(WorkingDay.startMinute, WorkingDay.startMinute - ahead + shift);
    const endMinute = Math.min(WorkingDay.endMinute, WorkingDay.endMinute - ahead + shift);
    if (startMinute < endMinute)
      return { startMinute, endMinute, lengthMinutes: endMinute - startMinute };
  }
  return null;
}

const twoDigits = (value: number) => String(value).padStart(2, '0');

/**
 * A minute of the viewer's day as the overlap gives it: "16:00", or on the 12-hour clock "4 pm" on
 * the hour and "4:30 pm" otherwise (L2-017).
 */
export function formatMinuteOfDay(minute: number, format: ClockFormat): string {
  const hour = Math.floor(ofDay(minute) / 60);
  const minutes = ofDay(minute) % 60;
  if (format === '24-hour') return `${twoDigits(hour)}:${twoDigits(minutes)}`;
  const suffix = hour < 12 ? 'am' : 'pm';
  const hour12 = hour % 12 || 12;
  return minutes ? `${hour12}:${twoDigits(minutes)} ${suffix}` : `${hour12} ${suffix}`;
}

const count = (value: number, unit: string) => `${value} ${unit}${value === 1 ? '' : 's'}`;

function formatLength(lengthMinutes: number): string {
  const hours = Math.floor(lengthMinutes / 60);
  const minutes = lengthMinutes % 60;
  return [hours ? count(hours, 'hour') : '', minutes ? count(minutes, 'minute') : '']
    .filter(Boolean)
    .join(' ');
}

/**
 * The overlap as the mocks word it, its start, end and length on the viewer's clock; with none,
 * the teammate's working day on the viewer's clock instead (L2-017). `firstName` is data.
 */
export function formatOverlap(
  overlap: Overlap | null,
  theirDay: DaySpan,
  firstName: string,
  format: ClockFormat,
): OverlapText {
  const time = (minute: number) => formatMinuteOfDay(minute, format);
  if (!overlap)
    return {
      figure: 'None today',
      sentence:
        `You and ${firstName} share no working hours. ${firstName}’s working day is ` +
        `${time(theirDay.startMinute)} to ${time(theirDay.endMinute)} on your clock.`,
    };
  const start = time(overlap.startMinute);
  const end = time(overlap.endMinute);
  return {
    figure: `${start}–${end} your time`,
    sentence:
      `You and ${firstName} share ${formatLength(overlap.lengthMinutes)} of working hours: ` +
      `${start} to ${end} on your clock.`,
  };
}
