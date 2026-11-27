/**
 * A span of the viewer's day, in minutes from midnight on the viewer's clock (L2-017). The end is
 * smaller than the start when the span passes midnight: 960 to 60 is 16:00 to 01:00.
 */
export interface DaySpan {
  readonly startMinute: number;
  readonly endMinute: number;
}

/** The part of both working days that coincides, on the viewer's clock (L2-017). */
export interface Overlap {
  readonly startMinute: number;
  readonly endMinute: number;
  readonly lengthMinutes: number;
}

/** The overlap as text: the figure beside its title and the sentence under its bar (L2-017). */
export interface OverlapText {
  /** "16:00–18:00 your time", or "None today". */
  readonly figure: string;
  /** Its start, end and length: "You and Tomás share 2 hours of working hours: …". */
  readonly sentence: string;
}
