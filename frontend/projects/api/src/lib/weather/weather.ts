/** The eight conditions a pin can show, as the backend names them (L2-018). */
export type WeatherCondition =
  'clear' | 'partly-cloudy' | 'cloudy' | 'rain' | 'showers' | 'storm' | 'fog' | 'wind';

/** The weather at a city now: the temperature in °C only, its condition, when it was observed. */
export interface Weather {
  readonly temperatureC: number;
  readonly condition: WeatherCondition;
  /** ISO 8601. */
  readonly observedAt: string;
}

/** Whether a pin's weather is there, could not be had, or is not shared with the viewer. */
export type WeatherState = 'Available' | 'Unavailable' | 'NotShared';

/** The unit a viewer reads temperatures in (L2-019). */
export type TemperatureUnit = 'celsius' | 'fahrenheit';

/** The weather in the found line on Join and Create Team: "13°" and "and foggy right now.". */
export interface FoundWeather {
  readonly degrees: string;
  readonly rest: string;
}

/** What a pin shows of its weather: worked out once a minute with the rest of the pin. */
export interface PinWeather {
  /** Whole degrees in the viewer's unit, with no unit letter: "13°". */
  readonly degrees: string;
  readonly condition: WeatherCondition;
  /** The condition's word: "Partly cloudy". */
  readonly word: string;
  /** Probably asleep at the pin's city: a clear or partly cloudy sky takes its night icon. */
  readonly night: boolean;
}
