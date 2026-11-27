import type { TemperatureUnit, Weather, WeatherCondition } from '@mondino/api';
import { statusAt } from '../time/status';

/**
 * The unit a teammate reads temperatures in until they choose one (L2-019): °F in the United
 * States, °C elsewhere. Profile & Settings stores a choice with journey 23.
 */
export function defaultTemperatureUnit(country: string): TemperatureUnit {
  return country === 'United States' ? 'fahrenheit' : 'celsius';
}

/** A temperature in the unit, rounded to a whole degree, never "−0". */
function wholeDegrees(temperatureC: number, unit: TemperatureUnit): number {
  const value = unit === 'fahrenheit' ? (temperatureC * 9) / 5 + 32 : temperatureC;
  return Math.round(value) || 0;
}

/** A temperature with its unit, as a panel shows it (L2-019): "13°C", "55°F", never "−0°C". */
export function formatTemperature(temperatureC: number, unit: TemperatureUnit): string {
  return `${wholeDegrees(temperatureC, unit)}°${unit === 'fahrenheit' ? 'F' : 'C'}`;
}

/** A temperature as degrees alone, as a pin and a Team row show it (L2-019): "13°", "55°". */
export function formatDegrees(temperatureC: number, unit: TemperatureUnit): string {
  return `${wholeDegrees(temperatureC, unit)}°`;
}

const words: Record<WeatherCondition, string> = {
  clear: 'Clear',
  'partly-cloudy': 'Partly cloudy',
  cloudy: 'Cloudy',
  rain: 'Rainy',
  showers: 'Showers',
  storm: 'Stormy',
  fog: 'Foggy',
  wind: 'Windy',
};

/** A condition's word, as the mocks write it (L2-018): "Foggy". */
export function weatherWord(condition: WeatherCondition): string {
  return words[condition] ?? words.cloudy;
}

/** A condition with its city, as a panel says it: "Foggy in Milan". The city is data. */
export function weatherLabel(condition: WeatherCondition, cityName: string): string {
  return `${weatherWord(condition)} in ${cityName}`;
}

/** Whether a sky is a night sky: probably asleep at the city, 23:00 to 06:59 (L2-018). */
export function isNightSky(localHour: number): boolean {
  return statusAt(localHour) === 'probably-asleep';
}

/**
 * The found line's weather on Join and Create Team (L2-003): "13° and foggy right now.", in the
 * unit of the country chosen; empty when the lookup has no weather.
 */
export function foundWeather(weather: Weather | null, unit: TemperatureUnit): string {
  if (!weather) return '';
  return `${formatDegrees(weather.temperatureC, unit)} and ${weatherWord(weather.condition).toLowerCase()} right now.`;
}
