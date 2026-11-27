import {
  ALL_MOMENT_KINDS,
  type ClockFormat,
  type MarkerView,
  type Moment,
  type MomentKind,
  type Pin,
  type PinView,
  type PinWeather,
  type Status,
  type TemperatureUnit,
} from '@mondino/api';
import { markerFor } from '../moments/moment-marker';
import { formatTime, localTime as localTimeAt } from '../time/local-time';
import { statusFor, statusWords } from '../time/status';
import { formatDegrees, isNightSky, weatherWord } from '../weather/weather';
import { initialsOf } from './initials';

/**
 * What each pin shows at `now` (ADR 0014): its initials and colour, its name with "(you)" after
 * the viewer's own (L2-011), its city, its local time on the viewer's clock and its status
 * (L2-014, L2-015), its weather in the viewer's unit with the night form of a clear sky while
 * the city is probably asleep (L2-018, L2-019), its moment marker from the team's `moments` of the
 * chosen `kinds` (L2-021, L2-022), and its accessible name. Worked out once a minute, every pin in
 * one pass, the moments grouped by teammate once.
 */
export function pinViews(
  pins: readonly Pin[],
  now: number,
  newId: string | null = null,
  clockFormat: ClockFormat = '24-hour',
  unit: TemperatureUnit = 'celsius',
  moments: readonly Moment[] = [],
  kinds: readonly MomentKind[] = ALL_MOMENT_KINDS,
): Map<string, PinView> {
  const views = new Map<string, PinView>();
  const momentsOf = new Map<string, Moment[]>();
  for (const moment of moments) {
    const theirs = momentsOf.get(moment.teammateId);
    if (theirs) theirs.push(moment);
    else momentsOf.set(moment.teammateId, [moment]);
  }
  for (const pin of pins) {
    const name = pin.isViewer ? `${pin.name} (you)` : pin.name;
    const time = localTimeAt(now, pin.timeZoneId);
    const localTime = formatTime(time, clockFormat);
    const status = statusFor(pin, time);
    const weather: PinWeather | null =
      pin.weatherState === 'Available' && pin.weather
        ? {
            degrees: formatDegrees(pin.weather.temperatureC, unit),
            condition: pin.weather.condition,
            word: weatherWord(pin.weather.condition),
            night: isNightSky(time.hour),
          }
        : null;
    const marker = markerFor(momentsOf.get(pin.teammateId) ?? [], kinds, now);
    views.set(pin.teammateId, {
      teammateId: pin.teammateId,
      initials: initialsOf(pin.name),
      colour: pin.colour,
      name,
      cityName: pin.cityName,
      localTime,
      status,
      weather,
      marker,
      description: describePin(name, pin.cityName, localTime, status, weather, marker),
      isViewer: pin.isViewer,
      isNew: pin.teammateId === newId,
    });
  }
  return views;
}

/**
 * A pin's accessible name: "Tomás Herrera, Mexico City, 08:05, Early morning, Partly cloudy 22°";
 * no status when not shared, and no weather when there is none to show (L2-011, L2-018); then its
 * moments this week, "October Bank Holiday, today" (L2-021).
 */
export function describePin(
  name: string,
  cityName: string,
  localTime: string,
  status: Status | null = null,
  weather: PinWeather | null = null,
  marker: MarkerView | null = null,
): string {
  return [
    name,
    cityName,
    localTime,
    status && statusWords(status),
    weather && `${weather.word} ${weather.degrees}`,
    marker?.spoken,
  ]
    .filter(Boolean)
    .join(', ');
}

/**
 * A group pin's accessible name (L2-013): the teammates of a group of two, the viewer first,
 * "2 teammates close together: Sofia Bianchi (you), Luca Ferri"; the city of a larger group,
 * "14 teammates close together, Mexico City"; or how many cities it covers,
 * "60 teammates close together, 3 cities".
 */
export function describeGroup(pins: readonly PinView[]): string {
  const count = `${pins.length} teammates close together`;
  if (pins.length <= 2) {
    const names = [...pins].sort((a, b) => Number(b.isViewer) - Number(a.isViewer));
    return `${count}: ${names.map((pin) => pin.name).join(', ')}`;
  }
  const cities = new Set(pins.map((pin) => pin.cityName));
  return cities.size === 1 ? `${count}, ${pins[0].cityName}` : `${count}, ${cities.size} cities`;
}
