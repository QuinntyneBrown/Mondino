import type { Answer } from './api';

/** Northwind's invite link, as the mocks' cast gives it. */
export const NORTHWIND_INVITE = '/api/invites/northwind-7Kq2';

const countries = [
  ['AU', 'Australia'],
  ['BR', 'Brazil'],
  ['CA', 'Canada'],
  ['DE', 'Germany'],
  ['GH', 'Ghana'],
  ['IN', 'India'],
  ['IE', 'Ireland'],
  ['IT', 'Italy'],
  ['JP', 'Japan'],
  ['MX', 'Mexico'],
  ['SE', 'Sweden'],
  ['AE', 'United Arab Emirates'],
  ['US', 'United States'],
].map(([code, name]) => ({ code, name }));

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
};

/** The postal codes the lookup knows, by country and as the backend normalises them. */
const KNOWN: Record<string, (typeof CITIES)[keyof typeof CITIES]> = {
  'IT 20121': CITIES.Milan,
  'CA L5B3C1': CITIES.Mississauga,
  'CA M5V2T6': CITIES.Toronto,
};

/**
 * Answers a postal code lookup as the backend would: the city of a postal code it knows, and
 * `postal_code_not_found` for any other.
 */
export function lookupAnswer(body: { countryCode: string; postalCode: string }): Answer {
  const key = `${body.countryCode} ${body.postalCode.replace(/[\s-]/g, '').toUpperCase()}`;
  const city = KNOWN[key];
  if (city) return { json: { city, weather: null } };
  return {
    status: 422,
    headers: { 'content-type': 'application/problem+json' },
    json: { status: 422, code: 'postal_code_not_found' },
  };
}
