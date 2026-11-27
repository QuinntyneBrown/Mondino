import type { Answer } from './api';

/** Northwind's invite link, as the mocks' cast gives it. */
export const NORTHWIND_INVITE = '/api/invites/northwind-7Kq2';

/** The supported countries, with the form of their postal codes, as the backend answers them. */
const countries = [
  ['AU', 'Australia', 'Australia', 'Australian postal codes have four digits, like 2000.'],
  ['BR', 'Brazil', 'Brazil', 'Brazilian postal codes have eight digits, like 01310-100.'],
  ['CA', 'Canada', 'Canada', 'Canadian postal codes look like A1A 1A1.'],
  ['DE', 'Germany', 'Germany', 'German postal codes have five digits, like 10115.'],
  [
    'GH',
    'Ghana',
    'Ghana',
    'Ghanaian postal codes are two letters and three or four digits, like GA543.',
  ],
  ['IN', 'India', 'India', 'Indian PIN codes have six digits, like 560001.'],
  ['IE', 'Ireland', 'Ireland', 'Irish Eircodes look like D02 X285.'],
  ['IT', 'Italy', 'Italy', 'Italian postal codes have five digits, like 20121.'],
  ['JP', 'Japan', 'Japan', 'Japanese postal codes have seven digits, like 100-0001.'],
  ['MX', 'Mexico', 'Mexico', 'Mexican postal codes have five digits, like 06000.'],
  ['SE', 'Sweden', 'Sweden', 'Swedish postal codes have five digits, like 111 22.'],
  [
    'AE',
    'United Arab Emirates',
    'the United Arab Emirates',
    'UAE addresses use a P.O. Box number of up to six digits, like 12345.',
  ],
  ['US', 'United States', 'the United States', 'US ZIP codes have five digits, like 78701.'],
].map(([code, name, nameInText, postalCodeForm]) => ({ code, name, nameInText, postalCodeForm }));

/** The twelve teammates' cities: one bare position for each, as the backend answers them. */
export const NORTHWIND_POSITIONS = {
  'Mexico City': { latitude: 19.4326, longitude: -99.1332 },
  Austin: { latitude: 30.2672, longitude: -97.7431 },
  'São Paulo': { latitude: -23.5505, longitude: -46.6333 },
  Dublin: { latitude: 53.3498, longitude: -6.2603 },
  Accra: { latitude: 5.6037, longitude: -0.187 },
  Milan: { latitude: 45.4642, longitude: 9.19 },
  Berlin: { latitude: 52.52, longitude: 13.405 },
  Stockholm: { latitude: 59.3293, longitude: 18.0686 },
  Dubai: { latitude: 25.2048, longitude: 55.2708 },
  Bengaluru: { latitude: 12.9716, longitude: 77.5946 },
  Tokyo: { latitude: 35.6762, longitude: 139.6503 },
  Melbourne: { latitude: -37.8136, longitude: 144.9631 },
};

/** What GET /api/invites/northwind-7Kq2 answers to someone who has not joined. */
export function northwindInvite(overrides: Record<string, unknown> = {}): Answer {
  return {
    json: {
      teamName: 'Northwind',
      teammateCount: 12,
      positions: Object.values(NORTHWIND_POSITIONS).sort(
        (a, b) => a.latitude - b.latitude || a.longitude - b.longitude,
      ),
      avatars: [
        { initials: 'ML', colour: 'teammate-2' },
        { initials: 'LO', colour: 'teammate-3' },
        { initials: 'LF', colour: 'teammate-4' },
        { initials: 'KM', colour: 'teammate-5' },
        { initials: 'AA', colour: 'teammate-6' },
      ],
      alreadyJoined: false,
      full: false,
      countries,
      ...overrides,
    },
  };
}

/** Where Join looks a postal code up, and searches the cities, through Northwind's invite link. */
export const NORTHWIND_LOOKUPS = '/api/invites/northwind-7Kq2/postal-code-lookups';
export const NORTHWIND_CITY_SEARCHES = '/api/invites/northwind-7Kq2/city-searches';

/** Cities as the backend answers them: each at its own position, never a postal code's. */
export const CITIES = {
  Milan: {
    name: 'Milan',
    region: 'Lombardy',
    countryCode: 'IT',
    position: { latitude: 45.46427, longitude: 9.18951 },
    timeZoneId: 'Europe/Rome',
  },
  Milazzo: {
    name: 'Milazzo',
    region: 'Sicily',
    countryCode: 'IT',
    position: { latitude: 38.22008, longitude: 15.24023 },
    timeZoneId: 'Europe/Rome',
  },
  Mississauga: {
    name: 'Mississauga',
    region: 'Ontario',
    countryCode: 'CA',
    position: { latitude: 43.5789, longitude: -79.6583 },
    timeZoneId: 'America/Toronto',
  },
  Toronto: {
    name: 'Toronto',
    region: 'Ontario',
    countryCode: 'CA',
    position: { latitude: 43.65333, longitude: -79.38389 },
    timeZoneId: 'America/Toronto',
  },
  Austin: {
    name: 'Austin',
    region: 'Texas',
    countryCode: 'US',
    position: { latitude: 30.26715, longitude: -97.74306 },
    timeZoneId: 'America/Chicago',
  },
};

/** The weather at each city found, as the backend answers it: in °C, at the mocks' "now". */
export const WEATHER_AT: Record<keyof typeof CITIES, unknown> = {
  Milan: { temperatureC: 13, condition: 'fog', observedAt: '2025-10-27T14:00:00Z' },
  Milazzo: { temperatureC: 19, condition: 'clear', observedAt: '2025-10-27T14:00:00Z' },
  Mississauga: { temperatureC: 6, condition: 'cloudy', observedAt: '2025-10-27T14:00:00Z' },
  Toronto: { temperatureC: 7, condition: 'cloudy', observedAt: '2025-10-27T14:00:00Z' },
  Austin: { temperatureC: 24, condition: 'partly-cloudy', observedAt: '2025-10-27T14:00:00Z' },
};

/** The postal codes the lookup knows, by country and as the backend normalises them. */
const KNOWN: Record<string, keyof typeof CITIES> = {
  'IT 20121': 'Milan',
  'CA L5B3C1': 'Mississauga',
  'CA M5V2T6': 'Toronto',
  'US 78701': 'Austin',
};

/**
 * Answers a postal code lookup as the backend would: the city of a postal code it knows, with the
 * weather there (none when `withWeather` is false), and `postal_code_not_found` for any other.
 */
export function lookupAnswer(
  body: { countryCode: string; postalCode: string },
  withWeather = true,
): Answer {
  const key = `${body.countryCode} ${body.postalCode.replace(/[\s-]/g, '').toUpperCase()}`;
  const city = KNOWN[key];
  if (city) return { json: { city: CITIES[city], weather: withWeather ? WEATHER_AT[city] : null } };
  return {
    status: 422,
    headers: { 'content-type': 'application/problem+json' },
    json: { status: 422, code: 'postal_code_not_found' },
  };
}

/** Where Join sends the join request through Northwind's invite link. */
export const NORTHWIND_JOINS = '/api/invites/northwind-7Kq2/teammates';

/** What a join answers when it adds Sofia to Northwind: random ids, and nothing else. */
export const SOFIA_JOINED: Answer = {
  status: 201,
  json: {
    teamId: 'c8a2f0de-5b1e-4f7c-9a3d-2e6b8f1c4d07',
    teammateId: '5f3e9b2a-7c41-4d8e-b6a0-91d2c7e4f318',
  },
};
