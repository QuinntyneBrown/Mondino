import type { Answer } from './api';
import { idOf } from './pins';
import { NORTHWIND_MEMBERSHIP } from '../support/membership';

/** Where the team's screens read Northwind's moments. */
export const NORTHWIND_MOMENTS = `/api/teams/${NORTHWIND_MEMBERSHIP.teamId}/moments`;

export interface MomentJson {
  teammateId: string;
  teammateName: string;
  cityName: string;
  countryCode: string;
  timeZoneId: string;
  kind: 'holiday' | 'formula-1' | 'local-event' | 'sport';
  title: string;
  date: string;
  detail: string;
  emblemKey: string | null;
}

const places: Record<string, [string, string, string]> = {
  'Tomás Herrera': ['Mexico City', 'MX', 'America/Mexico_City'],
  'Jordan Lee': ['Austin', 'US', 'America/Chicago'],
  'Chloé Martin': ['São Paulo', 'BR', 'America/Sao_Paulo'],
  'Liam O’Connor': ['Dublin', 'IE', 'Europe/Dublin'],
  'Kwame Mensah': ['Accra', 'GH', 'Africa/Accra'],
  'Luca Ferri': ['Milan', 'IT', 'Europe/Rome'],
  'Sofia Bianchi': ['Milan', 'IT', 'Europe/Rome'],
  'Lena Fischer': ['Berlin', 'DE', 'Europe/Berlin'],
  'Mara Lindqvist': ['Stockholm', 'SE', 'Europe/Stockholm'],
  'Ahmed Al-Sayed': ['Dubai', 'AE', 'Asia/Dubai'],
  'Priya Raman': ['Bengaluru', 'IN', 'Asia/Kolkata'],
  'Aiko Tanaka': ['Tokyo', 'JP', 'Asia/Tokyo'],
  'Noah Williams': ['Melbourne', 'AU', 'Australia/Melbourne'],
};

/** A moment of one of the cast, at their city, as the backend answers it. */
export function momentOf(
  teammate: string,
  kind: MomentJson['kind'],
  date: string,
  title: string,
  detail: string,
): MomentJson {
  const [cityName, countryCode, timeZoneId] = places[teammate];
  return {
    teammateId: idOf(teammate),
    teammateName: teammate,
    cityName,
    countryCode,
    timeZoneId,
    kind,
    title,
    date,
    detail,
    emblemKey: null,
  };
}

/** The cast's moments (docs/mocks/README.md), in date order, as the seeded Northwind's are found. */
export const CAST_MOMENTS: MomentJson[] = [
  momentOf(
    'Liam O’Connor',
    'holiday',
    '2025-10-27',
    'October Bank Holiday',
    'Office closed in Ireland today',
  ),
  momentOf(
    'Jordan Lee',
    'local-event',
    '2025-10-31',
    'Halloween on 6th Street',
    'Costume crawl downtown — expect a slow Friday',
  ),
  momentOf(
    'Tomás Herrera',
    'holiday',
    '2025-11-01',
    'Día de Muertos',
    'Ofrendas, marigolds and the big parade on Reforma',
  ),
  momentOf(
    'Priya Raman',
    'holiday',
    '2025-11-01',
    'Karnataka Rajyotsava',
    'State formation day — yellow and red flags everywhere',
  ),
  momentOf(
    'Mara Lindqvist',
    'holiday',
    '2025-11-01',
    'Alla helgons dag',
    'All Saints’ Day — candles in every cemetery',
  ),
  momentOf(
    'Tomás Herrera',
    'sport',
    '2025-11-02',
    'Clásico Nacional',
    'América vs. Chivas at the Azteca, 19:00 local',
  ),
  momentOf(
    'Aiko Tanaka',
    'holiday',
    '2025-11-03',
    'Culture Day',
    'Bunka no Hi — public holiday in Japan',
  ),
  momentOf(
    'Noah Williams',
    'sport',
    '2025-11-04',
    'Melbourne Cup Day',
    'The race that stops a nation — public holiday',
  ),
  momentOf(
    'Chloé Martin',
    'formula-1',
    '2025-11-09',
    'São Paulo Grand Prix',
    'Race day at Interlagos, 14:00 local',
  ),
  momentOf(
    'Lena Fischer',
    'local-event',
    '2025-11-11',
    'St. Martin’s lantern walk',
    'Kids’ lantern parades across Mitte',
  ),
  momentOf(
    'Luca Ferri',
    'formula-1',
    '2025-11-12',
    'Monza tickets on sale',
    'Italian GP 2026 general sale opens at 10:00',
  ),
  momentOf(
    'Sofia Bianchi',
    'formula-1',
    '2025-11-12',
    'Monza tickets on sale',
    'Italian GP 2026 general sale opens at 10:00',
  ),
  momentOf(
    'Ahmed Al-Sayed',
    'holiday',
    '2025-12-02',
    'UAE National Day',
    'Long weekend across the Emirates',
  ),
  momentOf(
    'Kwame Mensah',
    'holiday',
    '2025-12-05',
    'Farmers’ Day',
    'National holiday honouring Ghana’s farmers',
  ),
  momentOf(
    'Ahmed Al-Sayed',
    'formula-1',
    '2025-12-07',
    'Abu Dhabi Grand Prix',
    'Season finale at Yas Marina, 17:00 local',
  ),
];

/** What GET /api/teams/{id}/moments answers: the cast's, or the moments given. */
export function northwindMoments(moments: MomentJson[] = CAST_MOMENTS): Answer {
  return { json: moments };
}

/** No moment where any teammate lives, as `pages/globe/no-moments` draws the week. */
export const NO_MOMENTS: Answer = { json: [] };

/**
 * Three moments for every teammate of a team of 500 (`teamOf500`), dated in their city's time
 * zone: 1,500, more than the Moments screen holds in the page at once. The first is today in
 * Honolulu, "The first of the 500", and the last, "The last of the 500", 89 days ahead in Auckland.
 */
export function momentsOf500(
  pins: { teammateId: string; name: string; cityName: string; timeZoneId: string }[],
): MomentJson[] {
  const dates = ['2025-10-29', '2025-11-20', '2025-12-15'];
  const moments = pins.flatMap((pin, index) =>
    dates.map((date, each): MomentJson => ({
      teammateId: pin.teammateId,
      teammateName: pin.name,
      cityName: pin.cityName,
      countryCode: '',
      timeZoneId: pin.timeZoneId,
      kind: (['holiday', 'formula-1', 'local-event', 'sport'] as const)[(index + each) % 4],
      title: `Moment ${each + 1} of ${pin.name}`,
      date,
      detail: `In ${pin.cityName}`,
      emblemKey: null,
    })),
  );
  const first = pins.find((pin) => pin.cityName === 'Honolulu')!;
  const last = pins.find((pin) => pin.cityName === 'Auckland')!;
  return [
    { ...moments[0], ...pick(first), title: 'The first of the 500', date: '2025-10-27' },
    ...moments,
    { ...moments[0], ...pick(last), title: 'The last of the 500', date: '2026-01-24' },
  ];
}

function pick(pin: { teammateId: string; name: string; cityName: string; timeZoneId: string }) {
  return {
    teammateId: pin.teammateId,
    teammateName: pin.name,
    cityName: pin.cityName,
    timeZoneId: pin.timeZoneId,
  };
}
