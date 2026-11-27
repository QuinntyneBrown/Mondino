import type { Answer } from './api';
import { NORTHWIND_POSITIONS } from './invites';
import { NORTHWIND_MEMBERSHIP } from '../support/membership';

/** Where the Globe reads Northwind's pins. */
export const NORTHWIND_PINS = `/api/teams/${NORTHWIND_MEMBERSHIP.teamId}/pins`;

type City = keyof typeof NORTHWIND_POSITIONS;

/** The cast's weather at each city, in °C, at the mocks' "now" (docs/mocks/README.md). */
const weatherAt: Record<City, [number, string]> = {
  'Mexico City': [22, 'partly-cloudy'],
  Austin: [24, 'partly-cloudy'],
  'São Paulo': [26, 'showers'],
  Dublin: [9, 'rain'],
  Accra: [30, 'clear'],
  Milan: [13, 'fog'],
  Berlin: [8, 'cloudy'],
  Stockholm: [6, 'cloudy'],
  Dubai: [32, 'clear'],
  Bengaluru: [27, 'storm'],
  Tokyo: [14, 'clear'],
  Melbourne: [18, 'wind'],
};

/** The weather at a city as the backend answers it, observed at the top of the hour. */
function weatherOf(city: City): WeatherJson {
  const [temperatureC, condition] = weatherAt[city];
  return { temperatureC, condition, observedAt: '2025-10-27T14:00:00Z' };
}

const cities: Record<City, { country: string; timeZoneId: string }> = {
  'Mexico City': { country: 'Mexico', timeZoneId: 'America/Mexico_City' },
  Austin: { country: 'United States', timeZoneId: 'America/Chicago' },
  'São Paulo': { country: 'Brazil', timeZoneId: 'America/Sao_Paulo' },
  Dublin: { country: 'Ireland', timeZoneId: 'Europe/Dublin' },
  Accra: { country: 'Ghana', timeZoneId: 'Africa/Accra' },
  Milan: { country: 'Italy', timeZoneId: 'Europe/Rome' },
  Berlin: { country: 'Germany', timeZoneId: 'Europe/Berlin' },
  Stockholm: { country: 'Sweden', timeZoneId: 'Europe/Stockholm' },
  Dubai: { country: 'United Arab Emirates', timeZoneId: 'Asia/Dubai' },
  Bengaluru: { country: 'India', timeZoneId: 'Asia/Kolkata' },
  Tokyo: { country: 'Japan', timeZoneId: 'Asia/Tokyo' },
  Melbourne: { country: 'Australia', timeZoneId: 'Australia/Melbourne' },
};

/** The cast, in the order they joined: Sofia, the viewer, last (docs/mocks/README.md). */
const cast: [string, string, City][] = [
  ['Tomás Herrera', 'teammate-11', 'Mexico City'],
  ['Jordan Lee', 'teammate-12', 'Austin'],
  ['Chloé Martin', 'teammate-10', 'São Paulo'],
  ['Luca Ferri', 'teammate-13', 'Milan'],
  ['Priya Raman', 'teammate-7', 'Bengaluru'],
  ['Aiko Tanaka', 'teammate-8', 'Tokyo'],
  ['Noah Williams', 'teammate-9', 'Melbourne'],
  ['Ahmed Al-Sayed', 'teammate-6', 'Dubai'],
  ['Kwame Mensah', 'teammate-5', 'Accra'],
  ['Lena Fischer', 'teammate-4', 'Berlin'],
  ['Liam O’Connor', 'teammate-3', 'Dublin'],
  ['Mara Lindqvist', 'teammate-2', 'Stockholm'],
  ['Sofia Bianchi', 'teammate-1', 'Milan'],
];

/** A teammate id for each of the cast: Sofia's is the membership's. */
export function idOf(name: string): string {
  if (name === 'Sofia Bianchi') return NORTHWIND_MEMBERSHIP.teammateId;
  const index = cast.findIndex(([each]) => each === name);
  return `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
}

export interface WeatherJson {
  temperatureC: number;
  condition: string;
  observedAt: string;
}

export interface PinJson {
  teammateId: string;
  name: string;
  colour: string;
  cityName: string;
  country: string;
  position: { latitude: number; longitude: number };
  timeZoneId: string;
  /** Whether the teammate shares if they are working or asleep; always true on the viewer's own. */
  sharesStatus: boolean;
  isViewer: boolean;
  /** The weather at the city, or null when it is unavailable or not shared. */
  weather: WeatherJson | null;
  weatherState: 'Available' | 'Unavailable' | 'NotShared';
}

function pinOf(name: string, colour: string, city: City): PinJson {
  return {
    teammateId: idOf(name),
    name,
    colour,
    cityName: city,
    country: cities[city].country,
    position: NORTHWIND_POSITIONS[city],
    timeZoneId: cities[city].timeZoneId,
    sharesStatus: true,
    isViewer: name === 'Sofia Bianchi',
    weather: weatherOf(city),
    weatherState: 'Available',
  };
}

/** What GET /api/teams/{id}/pins answers Sofia: Northwind's thirteen pins, at their cities, with no postal code. */
export function northwindPins(
  pins: PinJson[] = cast.map(([n, c, city]) => pinOf(n, c, city)),
): Answer {
  return {
    json: {
      teamId: NORTHWIND_MEMBERSHIP.teamId,
      teamName: 'Northwind',
      inviteToken: 'northwind-7Kq2',
      viewerTeammateId: NORTHWIND_MEMBERSHIP.teammateId,
      pins,
    },
  };
}

/** Northwind's thirteen pins, each as `change` makes it: a teammate who hides their status, another viewer. */
export function northwindPinsWhere(change: (pin: PinJson) => PinJson): Answer {
  return northwindPins(cast.map(([n, c, city]) => change(pinOf(n, c, city))));
}

/** Northwind with only the teammates named, as a smaller team. */
export function northwindPinsOf(...names: string[]): Answer {
  return northwindPins(
    cast.filter(([name]) => names.includes(name)).map(([n, c, city]) => pinOf(n, c, city)),
  );
}

/**
 * A team of 500 as `pages/globe/hundreds` counts it at the mocks' "now": the cast and 487 more in
 * 40 cities and 38 time zones, 324 in working hours and 42 probably asleep, the most in London
 * (as the prototype's `bigTeam.ts` spreads its team over 40 cities). Each city takes the number
 * of the 487 beside it, so some are crowded and some are not.
 */
export function teamOf500(): Answer {
  const castCities: Record<City, number> = {
    'Mexico City': 12,
    Austin: 10,
    'São Paulo': 12,
    Dublin: 12,
    Accra: 10,
    Milan: 18,
    Berlin: 16,
    Stockholm: 10,
    Dubai: 10,
    Bengaluru: 24,
    Tokyo: 12,
    Melbourne: 8,
  };
  const more: [string, number, number, string, number][] = [
    ['Toronto', 43.65, -79.38, 'America/Toronto', 22],
    ['New York', 40.71, -74.0, 'America/New_York', 28],
    ['Denver', 39.74, -104.99, 'America/Denver', 7],
    ['Los Angeles', 34.05, -118.24, 'America/Los_Angeles', 20],
    ['Vancouver', 49.28, -123.12, 'America/Vancouver', 8],
    ['Bogotá', 4.71, -74.07, 'America/Bogota', 8],
    ['Lima', -12.05, -77.04, 'America/Lima', 6],
    ['Buenos Aires', -34.6, -58.38, 'America/Argentina/Buenos_Aires', 8],
    ['London', 51.51, -0.13, 'Europe/London', 34],
    ['Paris', 48.86, 2.35, 'Europe/Paris', 20],
    ['Madrid', 40.42, -3.7, 'Europe/Madrid', 14],
    ['Lisbon', 38.72, -9.14, 'Europe/Lisbon', 10],
    ['Amsterdam', 52.37, 4.9, 'Europe/Amsterdam', 14],
    ['Rome', 41.9, 12.5, 'Europe/Rome', 10],
    ['Zurich', 47.37, 8.54, 'Europe/Zurich', 8],
    ['Warsaw', 52.23, 21.01, 'Europe/Warsaw', 8],
    ['Athens', 37.98, 23.73, 'Europe/Athens', 6],
    ['Istanbul', 41.01, 28.98, 'Europe/Istanbul', 6],
    ['Cairo', 30.04, 31.24, 'Africa/Cairo', 6],
    ['Lagos', 6.52, 3.38, 'Africa/Lagos', 8],
    ['Nairobi', -1.29, 36.82, 'Africa/Nairobi', 6],
    ['Cape Town', -33.92, 18.42, 'Africa/Johannesburg', 6],
    ['Mumbai', 19.08, 72.88, 'Asia/Kolkata', 20],
    ['Singapore', 1.35, 103.82, 'Asia/Singapore', 14],
    ['Seoul', 37.57, 126.98, 'Asia/Seoul', 6],
    ['Shanghai', 31.23, 121.47, 'Asia/Shanghai', 16],
    ['Sydney', -33.87, 151.21, 'Australia/Sydney', 10],
    ['Auckland', -36.85, 174.76, 'Pacific/Auckland', 4],
  ];
  const places = [
    ...Object.entries(NORTHWIND_POSITIONS).map(([name, position]) => ({
      name,
      position,
      ...cities[name as City],
      count: castCities[name as City],
    })),
    ...more.map(([name, latitude, longitude, timeZoneId, count]) => ({
      name,
      position: { latitude, longitude },
      country: '',
      timeZoneId,
      count,
    })),
  ];
  const pins: PinJson[] = cast.map(([n, c, city]) => pinOf(n, c, city));
  let index = 0;
  for (const place of places)
    for (let each = 0; each < place.count; each++, index++)
      pins.push({
        teammateId: `00000000-0000-4000-9000-${String(index).padStart(12, '0')}`,
        name: `Teammate ${index + 1}`,
        colour: `teammate-${(index % 13) + 1}`,
        cityName: place.name,
        country: place.country,
        position: place.position,
        timeZoneId: place.timeZoneId,
        sharesStatus: true,
        isViewer: false,
        weather: place.name in weatherAt ? weatherOf(place.name as City) : null,
        weatherState: place.name in weatherAt ? 'Available' : 'Unavailable',
      });
  return northwindPins(pins);
}
