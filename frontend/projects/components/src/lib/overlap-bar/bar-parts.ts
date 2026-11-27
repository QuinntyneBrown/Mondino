import { WorkingDay, type DaySpan, type Overlap } from '@mondino/api';

/** A part of the overlap bar's track: where it starts and how far it runs, in percent of the day. */
export interface BarPart {
  readonly from: number;
  readonly span: number;
}

/** The overlap bar's parts, each placed by its minutes on the viewer's clock divided by the day. */
export interface BarParts {
  /** The teammate's working day: two parts when it passes the viewer's midnight. */
  readonly theirs: readonly BarPart[];
  readonly both: BarPart | null;
  readonly you: BarPart;
  readonly now: number;
}

const day = 1440;
const percent = (minutes: number) => Math.round((minutes / day) * 10_000) / 100;
const part = (startMinute: number, endMinute: number): BarPart => ({
  from: percent(startMinute),
  span: percent(endMinute - startMinute),
});

/** Where the overlap bar draws each working day, the part both share and now (L2-017). */
export function barParts(overlap: Overlap | null, theirDay: DaySpan, nowMinute: number): BarParts {
  const { startMinute, endMinute } = theirDay;
  const theirs =
    endMinute > startMinute || endMinute === 0
      ? [part(startMinute, endMinute || day)]
      : [part(startMinute, day), part(0, endMinute)];
  return {
    theirs,
    both: overlap && part(overlap.startMinute, overlap.endMinute),
    you: part(WorkingDay.startMinute, WorkingDay.endMinute),
    now: percent(nowMinute),
  };
}
