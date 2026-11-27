import type { MomentView } from '../moments/moment';
import type { Status } from '../time/status';
import type { WeatherCondition, WeatherState } from '../weather/weather';

/** The Team list's filter (L2-028): everyone, those in working hours, or those probably asleep. */
export type StatusFilter = 'all' | 'working' | 'asleep';

/** The weather a Team row shows: the degrees in the viewer's unit and the condition's icon. */
export interface RowWeather {
  /** Whole degrees with no unit letter: "13°", "55°". */
  readonly degrees: string;
  readonly condition: WeatherCondition;
  /** Probably asleep at the city: a clear or partly cloudy sky takes its night icon. */
  readonly night: boolean;
}

/**
 * A teammate as a row of the Team screen lists them (L2-026), worked out once a minute in the
 * browser. It holds no postal code: the pin has none to give. Names and cities are data.
 */
export interface TeamRow {
  readonly teammateId: string;
  readonly name: string;
  readonly initials: string;
  /** A teammate colour of the palette: `teammate-1` to `teammate-13`. */
  readonly colour: string;
  readonly isViewer: boolean;
  readonly cityName: string;
  readonly country: string;
  /** On the viewer's clock: "08:05", or "8:05 am". */
  readonly localTime: string;
  /** Null when the teammate does not share it, at any hour. */
  readonly status: Status | null;
  /** In the row's words, "7h behind"; null on the viewer's own row. */
  readonly offset: string | null;
  /** Null unless `weatherState` is `Available`. */
  readonly weather: RowWeather | null;
  readonly weatherState: WeatherState;
  /** The teammate's next moment, "Coming up" (L2-026); null for a dash. */
  readonly nextMoment: MomentView | null;
}

/**
 * One city of a large team's list (L2-056), west to east: its teammates that pass the filter and
 * the search, of which an open section holds at most 50 and a closed one none.
 */
export interface CitySectionContent {
  /** The city and its country, which tell one city from another of the same name. */
  readonly key: string;
  readonly name: string;
  /** How many of its teammates pass the filter and the search. */
  readonly count: number;
  /** The city's local time on the viewer's clock: "04:05". */
  readonly localTime: string;
  readonly open: boolean;
  /** At most 50, and none while closed. */
  readonly rows: readonly TeamRow[];
  /** How many more an open section has past its rows. */
  readonly more: number;
}
