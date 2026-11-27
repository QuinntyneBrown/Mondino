import type { Answer } from './api';
import { NORTHWIND_POSITIONS } from './invites';
import { NORTHWIND_MEMBERSHIP } from '../support/membership';

/** Where the Globe reads Northwind's pins. */
export const NORTHWIND_PINS = `/api/teams/${NORTHWIND_MEMBERSHIP.teamId}/pins`;

type City = keyof typeof NORTHWIND_POSITIONS;

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

export interface PinJson {
  teammateId: string;
  name: string;
  colour: string;
  cityName: string;
  country: string;
  position: { latitude: number; longitude: number };
  timeZoneId: string;
  isViewer: boolean;
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
    isViewer: name === 'Sofia Bianchi',
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

/** Northwind with only the teammates named, as a smaller team. */
export function northwindPinsOf(...names: string[]): Answer {
  return northwindPins(
    cast.filter(([name]) => names.includes(name)).map(([n, c, city]) => pinOf(n, c, city)),
  );
}

/**
 * A team of 500: the cast and 487 more, spread over the cast's twelve cities and 28 more, the most
 * in the first (as the prototype's `bigTeam.ts` spreads them over 40 cities).
 */
export function teamOf500(): Answer {
  const more: [string, number, number, string][] = [
    ['Toronto', 43.65, -79.38, 'America/Toronto'],
    ['New York', 40.71, -74.0, 'America/New_York'],
    ['Chicago', 41.88, -87.63, 'America/Chicago'],
    ['Los Angeles', 34.05, -118.24, 'America/Los_Angeles'],
    ['Vancouver', 49.28, -123.12, 'America/Vancouver'],
    ['Bogotá', 4.71, -74.07, 'America/Bogota'],
    ['Lima', -12.05, -77.04, 'America/Lima'],
    ['Buenos Aires', -34.6, -58.38, 'America/Argentina/Buenos_Aires'],
    ['London', 51.51, -0.13, 'Europe/London'],
    ['Paris', 48.86, 2.35, 'Europe/Paris'],
    ['Madrid', 40.42, -3.7, 'Europe/Madrid'],
    ['Lisbon', 38.72, -9.14, 'Europe/Lisbon'],
    ['Amsterdam', 52.37, 4.9, 'Europe/Amsterdam'],
    ['Rome', 41.9, 12.5, 'Europe/Rome'],
    ['Turin', 45.07, 7.69, 'Europe/Rome'],
    ['Warsaw', 52.23, 21.01, 'Europe/Warsaw'],
    ['Athens', 37.98, 23.73, 'Europe/Athens'],
    ['Istanbul', 41.01, 28.98, 'Europe/Istanbul'],
    ['Cairo', 30.04, 31.24, 'Africa/Cairo'],
    ['Lagos', 6.52, 3.38, 'Africa/Lagos'],
    ['Nairobi', -1.29, 36.82, 'Africa/Nairobi'],
    ['Cape Town', -33.92, 18.42, 'Africa/Johannesburg'],
    ['Mumbai', 19.08, 72.88, 'Asia/Kolkata'],
    ['Singapore', 1.35, 103.82, 'Asia/Singapore'],
    ['Seoul', 37.57, 126.98, 'Asia/Seoul'],
    ['Shanghai', 31.23, 121.47, 'Asia/Shanghai'],
    ['Sydney', -33.87, 151.21, 'Australia/Sydney'],
    ['Auckland', -36.85, 174.76, 'Pacific/Auckland'],
  ];
  const places = [
    ...Object.entries(NORTHWIND_POSITIONS).map(([name, position]) => ({
      name,
      position,
      ...cities[name as City],
    })),
    ...more.map(([name, latitude, longitude, timeZoneId]) => ({
      name,
      position: { latitude, longitude },
      country: '',
      timeZoneId,
    })),
  ];
  const pins: PinJson[] = cast.map(([n, c, city]) => pinOf(n, c, city));
  for (let index = 0; index < 487; index++) {
    // Each place takes one more of the rest than the next, so some are crowded and some are not.
    const place = places[Math.floor(Math.sqrt(index * 3.9)) % places.length];
    pins.push({
      teammateId: `00000000-0000-4000-9000-${String(index).padStart(12, '0')}`,
      name: `Teammate ${index + 1}`,
      colour: `teammate-${(index % 13) + 1}`,
      cityName: place.name,
      country: place.country,
      position: place.position,
      timeZoneId: place.timeZoneId,
      isViewer: false,
    });
  }
  return northwindPins(pins);
}
