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

/** The first names and family names a team of 500's generated teammates are made of. */
const firstNames = [
  'Ada',
  'Ben',
  'Cara',
  'Dev',
  'Elif',
  'Finn',
  'Gia',
  'Hugo',
  'Ines',
  'Jon',
  'Kai',
  'Lina',
  'Mo',
  'Nia',
  'Omar',
  'Pia',
  'Quinn',
  'Rui',
  'Sana',
  'Theo',
  'Uma',
  'Vik',
  'Wren',
  'Yara',
  'Zane',
];
const familyNames = [
  'Achebe',
  'Brennan',
  'Costa',
  'Dahl',
  'Evans',
  'Fontaine',
  'Garcia',
  'Haddad',
  'Ito',
  'Jensen',
  'Kowalski',
  'Lopez',
  'Moreau',
  'Novak',
  'Osei',
  'Park',
  'Quist',
  'Reyes',
  'Silva',
  'Tran',
];

/** The teammates `pages/team/hundreds` names in its two open cities, with their colours. */
const namedIn: Record<string, [string, string][]> = {
  Honolulu: [
    ['Tara Okafor', 'teammate-6'],
    ['Malik Yilmaz', 'teammate-8'],
    ['Gabe Patel', 'teammate-11'],
    ['Eli Andersson', 'teammate-2'],
  ],
  Vancouver: [
    ['Ade Patel', 'teammate-3'],
    ['Zoe Andersson', 'teammate-12'],
    ['Lea Nguyen', 'teammate-7'],
    ['Fatima Larsen', 'teammate-3'],
  ],
};

/**
 * The 40 cities of `pages/team/hundreds`, west to east, each with how many of the 500 live there
 * (the cast among them), its place and its weather: [name, country, time zone, latitude,
 * longitude, count, °C, condition]. The cast's cities take their place and weather from the cast.
 */
const cities500: [string, string, string, number, number, number, number, string][] = [
  ['Honolulu', 'United States', 'Pacific/Honolulu', 21.31, -157.86, 4, 16, 'rain'],
  ['Vancouver', 'Canada', 'America/Vancouver', 49.28, -123.12, 4, 15, 'cloudy'],
  ['San Francisco', 'United States', 'America/Los_Angeles', 37.77, -122.42, 27, 14, 'fog'],
  ['Denver', 'United States', 'America/Denver', 39.74, -104.99, 10, 9, 'clear'],
  ['Mexico City', '', '', 0, 0, 14, 0, ''],
  ['Austin', '', '', 0, 0, 12, 0, ''],
  ['Chicago', 'United States', 'America/Chicago', 41.88, -87.63, 8, 7, 'cloudy'],
  ['Bogotá', 'Colombia', 'America/Bogota', 4.71, -74.07, 7, 15, 'rain'],
  ['Toronto', 'Canada', 'America/Toronto', 43.65, -79.38, 22, 8, 'cloudy'],
  ['New York', 'United States', 'America/New_York', 40.71, -74.01, 30, 12, 'partly-cloudy'],
  ['Buenos Aires', 'Argentina', 'America/Argentina/Buenos_Aires', -34.6, -58.38, 9, 19, 'clear'],
  ['São Paulo', '', '', 0, 0, 18, 0, ''],
  ['Lisbon', 'Portugal', 'Europe/Lisbon', 38.72, -9.14, 15, 19, 'partly-cloudy'],
  ['Dublin', '', '', 0, 0, 9, 0, ''],
  ['Accra', '', '', 0, 0, 3, 0, ''],
  ['London', 'United Kingdom', 'Europe/London', 51.51, -0.13, 43, 11, 'cloudy'],
  ['Madrid', 'Spain', 'Europe/Madrid', 40.42, -3.7, 16, 18, 'clear'],
  ['Paris', 'France', 'Europe/Paris', 48.86, 2.35, 8, 12, 'cloudy'],
  ['Lagos', 'Nigeria', 'Africa/Lagos', 6.52, 3.38, 6, 31, 'storm'],
  ['Amsterdam', 'Netherlands', 'Europe/Amsterdam', 52.37, 4.9, 16, 10, 'rain'],
  ['Milan', '', '', 0, 0, 17, 0, ''],
  ['Berlin', '', '', 0, 0, 36, 0, ''],
  ['Stockholm', '', '', 0, 0, 14, 0, ''],
  ['Warsaw', 'Poland', 'Europe/Warsaw', 52.23, 21.01, 10, 7, 'cloudy'],
  ['Cape Town', 'South Africa', 'Africa/Johannesburg', -33.92, 18.42, 8, 21, 'wind'],
  ['Kyiv', 'Ukraine', 'Europe/Kyiv', 50.45, 30.52, 7, 6, 'cloudy'],
  ['Istanbul', 'Türkiye', 'Europe/Istanbul', 41.01, 28.98, 6, 16, 'partly-cloudy'],
  ['Cairo', 'Egypt', 'Africa/Cairo', 30.04, 31.24, 1, 27, 'clear'],
  ['Nairobi', 'Kenya', 'Africa/Nairobi', -1.29, 36.82, 3, 24, 'partly-cloudy'],
  ['Dubai', '', '', 0, 0, 6, 0, ''],
  ['Pune', 'India', 'Asia/Kolkata', 18.52, 73.86, 9, 26, 'partly-cloudy'],
  ['Bengaluru', '', '', 0, 0, 30, 0, ''],
  ['Ho Chi Minh City', 'Vietnam', 'Asia/Ho_Chi_Minh', 10.82, 106.63, 7, 28, 'storm'],
  ['Singapore', 'Singapore', 'Asia/Singapore', 1.35, 103.82, 14, 29, 'showers'],
  ['Manila', 'Philippines', 'Asia/Manila', 14.6, 120.98, 13, 28, 'showers'],
  ['Seoul', 'South Korea', 'Asia/Seoul', 37.57, 126.98, 4, 11, 'clear'],
  ['Tokyo', '', '', 0, 0, 10, 0, ''],
  ['Melbourne', '', '', 0, 0, 10, 0, ''],
  ['Sydney', 'Australia', 'Australia/Sydney', -33.87, 151.21, 9, 20, 'clear'],
  ['Auckland', 'New Zealand', 'Pacific/Auckland', -36.85, 174.76, 5, 15, 'wind'],
];

/**
 * A team of 500 as `pages/team/hundreds` lists it and `pages/globe/hundreds` counts it at the
 * mocks' "now": the cast, the eight teammates the mock names in Honolulu and Vancouver, and 479
 * more named from `firstNames` and `familyNames`, in 40 cities and 38 time zones, 324 in working
 * hours and 42 probably asleep, the most in London. `counts` moves teammates between cities, as
 * `pages/team/hundreds-crowded-city` puts 64 in London and 15 in Berlin.
 */
export function teamOf500(counts: Record<string, number> = {}): Answer {
  const pins: PinJson[] = cast.map(([n, c, city]) => pinOf(n, c, city));
  let index = 0;
  for (const [
    name,
    country,
    zone,
    latitude,
    longitude,
    count,
    temperatureC,
    condition,
  ] of cities500) {
    const ofCast = name in NORTHWIND_POSITIONS;
    const place = ofCast
      ? {
          country: cities[name as City].country,
          timeZoneId: cities[name as City].timeZoneId,
          position: NORTHWIND_POSITIONS[name as City],
          weather: weatherOf(name as City),
        }
      : {
          country,
          timeZoneId: zone,
          position: { latitude, longitude },
          weather: { temperatureC, condition, observedAt: '2025-10-27T14:00:00Z' },
        };
    const named = namedIn[name] ?? [];
    const generated =
      (counts[name] ?? count) - cast.filter(([, , city]) => city === name).length - named.length;
    const people: [string, string][] = [
      ...named,
      ...Array.from({ length: generated }, (): [string, string] => {
        const each = index++;
        return [
          `${firstNames[each % 25]} ${familyNames[Math.floor(each / 25) % 20]}`,
          `teammate-${(each % 13) + 1}`,
        ];
      }),
    ];
    for (const [person, colour] of people)
      pins.push({
        teammateId: `00000000-0000-4000-9000-${String(pins.length).padStart(12, '0')}`,
        name: person,
        colour,
        cityName: name,
        country: place.country,
        position: place.position,
        timeZoneId: place.timeZoneId,
        sharesStatus: true,
        isViewer: false,
        weather: place.weather,
        weatherState: 'Available',
      });
  }
  if (pins.length !== 500) throw new Error(`A team of 500 has ${pins.length}`);
  return northwindPins(pins);
}
