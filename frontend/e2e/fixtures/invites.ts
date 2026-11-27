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
