/** A moment's kind (L2-020): a holiday, Formula 1, a local event or sport. */
export type MomentKind = 'holiday' | 'formula-1' | 'local-event' | 'sport';

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
