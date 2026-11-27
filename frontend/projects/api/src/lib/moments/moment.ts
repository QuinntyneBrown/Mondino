/** A moment's kind (L2-020): a holiday, Formula 1, a local event or sport. */
export type MomentKind = 'holiday' | 'formula-1' | 'local-event' | 'sport';

/** The four kinds, in the order Profile & Settings lists their switches (L2-022). */
export const ALL_MOMENT_KINDS: readonly MomentKind[] = [
  'holiday',
  'formula-1',
  'local-event',
  'sport',
];

/**
 * A moment where a teammate lives, as GET /api/teams/{teamId}/moments answers it (L2-020): one for
 * each teammate it belongs to, naming them. Its date is the date in its own place, "2025-11-01".
 * Its title and detail come from a calendar and are data, rendered as text. It holds no postal
 * code and no position. `emblemKey` names an emblem Mondino holds the right to show; with none,
 * the kind's own icon is shown.
 */
export interface Moment {
  readonly teammateId: string;
  readonly teammateName: string;
  readonly cityName: string;
  readonly countryCode: string;
  readonly timeZoneId: string;
  readonly kind: MomentKind;
  readonly title: string;
  readonly date: string;
  readonly detail: string;
  readonly emblemKey: string | null;
}

/** A moment as a panel, a row or a pill shows it: its kind in words and when it is. */
export interface MomentView {
  readonly teammateId: string;
  readonly kind: MomentKind;
  /** "Holiday", "Formula 1", "Local event", "Sport". */
  readonly kindName: string;
  readonly title: string;
  readonly detail: string;
  /** "Today", "Tomorrow", "In 5 days", up to a week; then the date, "2 Dec". */
  readonly when: string;
  readonly today: boolean;
}

/** A moment of "This week around the world": its teammate's first name and city with it. */
export interface WeekMoment extends MomentView {
  /** "Liam · Dublin". */
  readonly who: string;
}

/**
 * A pin's moment marker (L2-021): the moments of its teammate today or in the next 7 days, of the
 * kinds the viewer chose, nearest first. One shows its kind's icon, two or more their count.
 */
export interface MarkerView {
  /** The nearest moment's kind, whose icon the marker shows for one moment. */
  readonly kind: MomentKind;
  /** The nearest moment's title and when it is: "Today", "Tomorrow", "In 5 days". */
  readonly title: string;
  readonly when: string;
  readonly count: number;
  /** Whether the nearest moment is today: the marker is then larger and ringed. */
  readonly today: boolean;
  /**
   * What the pin's accessible name ends with: "October Bank Holiday, today", or "2 moments this
   * week: Día de Muertos, in 5 days; Clásico Nacional, in 6 days".
   */
  readonly spoken: string;
}

/** What the Moments screen is filtered by (L2-030): every kind, or one. */
export type MomentFilter = 'everything' | MomentKind;

/**
 * A moment as the Moments screen lists it (L2-029): its kind, when it is and on which day, and its
 * teammate named by first name and city, with their initials in their colour.
 */
export interface DatedMoment {
  /** What tells one listed moment from another: its teammate, date, kind and title. */
  readonly key: string;
  readonly teammateId: string;
  readonly kind: MomentKind;
  /** "Holiday", "Formula 1", "Local event", "Sport". */
  readonly kindName: string;
  readonly title: string;
  readonly detail: string;
  readonly cityName: string;
  /** "Today", "Tomorrow", "In 13 days". */
  readonly when: string;
  /** "Fri", 31, "Oct": the date in its own place. */
  readonly weekday: string;
  readonly day: number;
  readonly month: string;
  /** The first word of the teammate's name: "Jordan". */
  readonly firstName: string;
  readonly initials: string;
  /** The teammate's colour, `teammate-1` to `teammate-13`. */
  readonly colour: string;
  /** "Jordan · Austin". */
  readonly who: string;
}

/** The Moments screen's groups (L2-029): today, 1 to 7 days ahead, and 8 to 90. */
export interface MomentGroups {
  readonly today: readonly DatedMoment[];
  readonly thisWeek: readonly DatedMoment[];
  readonly later: readonly DatedMoment[];
}
