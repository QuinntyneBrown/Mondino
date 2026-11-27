/**
 * The team's counts over the globe (L2-025): its teammates, their distinct time zones, and how
 * many are working and asleep by their status. A teammate who does not share their status is
 * counted among the teammates and the time zones only.
 */
export interface TeamCounts {
  readonly teammates: number;
  readonly timeZones: number;
  readonly working: number;
  readonly asleep: number;
}

/** A teammate in working hours, as a row of the Globe's panel lists them (L2-024). */
export interface WorkingTeammate {
  readonly teammateId: string;
  readonly name: string;
  readonly initials: string;
  /** A teammate colour of the palette: `teammate-1` to `teammate-13`. */
  readonly colour: string;
  readonly cityName: string;
  /** On the viewer's clock: "09:05", or "9:05 am". */
  readonly localTime: string;
  readonly isViewer: boolean;
}

/** Who is in working hours now: how many, the first few, and how many more are not listed. */
export interface WorkingNow {
  readonly count: number;
  readonly teammates: readonly WorkingTeammate[];
  readonly more: number;
}
