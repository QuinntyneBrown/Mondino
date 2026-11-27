import type { ClockFormat, DaySpan, Offset, Overlap, OverlapText, Pin } from '@mondino/api';
import { firstName } from '../pins/first-name';
import { localTime } from './local-time';
import { offsetBetween } from './offset';
import { formatOverlap, overlapBetween, workingDayOnViewerClock } from './overlap';

/** What `OverlapBar` draws for a teammate: the overlap, their day, now, their name and the text. */
export interface OverlapView {
  readonly overlap: Overlap | null;
  readonly theirDay: DaySpan;
  /** The viewer's minute of the day. */
  readonly nowMinute: number;
  readonly firstName: string;
  readonly text: OverlapText;
}

/** A teammate's day compared with the viewer's: their offset, and the overlap if they share it. */
export interface Comparison {
  readonly offset: Offset;
  /** None for a teammate who does not share whether they are working or asleep (L2-017). */
  readonly overlap: OverlapView | null;
}

/**
 * A teammate compared with the viewer at `now`, as a panel and a Team row show it (L2-016,
 * L2-017): none for the viewer's own pin, or before the viewer's pin is known; and no overlap
 * for a teammate who does not share their status, since it would say when they are working.
 */
export function compareWithViewer(
  pin: Pin,
  viewer: Pin | undefined,
  now: number,
  format: ClockFormat,
): Comparison | null {
  if (!viewer || pin.isViewer) return null;
  const offset = offsetBetween(now, pin.timeZoneId, viewer.timeZoneId);
  if (!pin.sharesStatus) return { offset, overlap: null };
  const theirDay = workingDayOnViewerClock(now, pin.timeZoneId, viewer.timeZoneId);
  const overlap = overlapBetween(now, pin.timeZoneId, viewer.timeZoneId);
  const name = firstName(pin.name);
  const viewerTime = localTime(now, viewer.timeZoneId);
  return {
    offset,
    overlap: {
      overlap,
      theirDay,
      nowMinute: viewerTime.hour * 60 + viewerTime.minute,
      firstName: name,
      text: formatOverlap(overlap, theirDay, name, format),
    },
  };
}
