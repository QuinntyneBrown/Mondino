import type { MomentView } from '../moments/moment';
import type { DaySpan, Overlap, OverlapText } from '../time/overlap';
import type { Status } from '../time/status';
import type { WeatherCondition, WeatherState } from '../weather/weather';

/** What `OverlapBar` draws for a teammate: the overlap, their day, now, their name and the text. */
export interface OverlapView {
  readonly overlap: Overlap | null;
  readonly theirDay: DaySpan;
  /** The viewer's minute of the day. */
  readonly nowMinute: number;
  readonly firstName: string;
  readonly text: OverlapText;
}

/** The weather a panel shows: "22°C" and "Partly cloudy in Mexico City", with its icon. */
export interface PanelWeather {
  /** Whole degrees with the viewer's unit: "13°C", "55°F". */
  readonly temperature: string;
  readonly condition: WeatherCondition;
  /** Probably asleep at the city: a clear or partly cloudy sky takes its night icon. */
  readonly night: boolean;
  /** The condition and the city: "Foggy in Milan". */
  readonly sky: string;
}

/**
 * What a selected teammate's panel presents (L2-023), worked out once a minute in the browser.
 * It holds no postal code: the pin has none to give. Names and the city are data, shown as text.
 */
export interface TeammatePanelContent {
  readonly teammateId: string;
  readonly name: string;
  /** The first word of the name, by which the panel's running copy names the teammate. */
  readonly firstName: string;
  readonly initials: string;
  /** A teammate colour of the palette: `teammate-1` to `teammate-13`. */
  readonly colour: string;
  readonly isViewer: boolean;
  readonly cityName: string;
  readonly country: string;
  /** On the viewer's clock: "08:05", or "8:05 am". */
  readonly localTime: string;
  /** The teammate's own day: "Tuesday 28 Oct". */
  readonly localDay: string;
  /** "7h behind you"; null on the viewer's own panel. */
  readonly offset: string | null;
  /** Null when the teammate does not share it, at any hour. */
  readonly status: Status | null;
  /** Null unless `weatherState` is `Available`. */
  readonly weather: PanelWeather | null;
  readonly weatherState: WeatherState;
  /** Said in the weather's place when it is unavailable: "Weather for Mexico City isn’t…". */
  readonly weatherNote: string | null;
  /** Said in place of the status, the weather and the overlap when the teammate shares neither. */
  readonly privateNote: string | null;
  /** Null on the viewer's own panel and for a teammate who does not share their status. */
  readonly overlap: OverlapView | null;
  /** The teammate's upcoming moments in date order (L2-020); none, and the panel has no section. */
  readonly moments: readonly MomentView[];
}

/** One teammate of a group pin, as its panel lists them. */
export interface GroupRow {
  readonly teammateId: string;
  readonly name: string;
  readonly initials: string;
  readonly colour: string;
  readonly isViewer: boolean;
}

/** One city of a group pin, with its local time said once. */
export interface GroupCity {
  readonly cityName: string;
  readonly localTime: string;
  readonly rows: readonly GroupRow[];
}

/** What a selected group pin's panel presents (L2-023). */
export interface GroupContent {
  /** "2 teammates close together". */
  readonly title: string;
  /** "All in Milan · pick someone to see their pin", or "3 cities · pick someone to see their pin". */
  readonly lead: string;
  readonly cities: readonly GroupCity[];
}
