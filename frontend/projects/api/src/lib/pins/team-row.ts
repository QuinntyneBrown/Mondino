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
}
