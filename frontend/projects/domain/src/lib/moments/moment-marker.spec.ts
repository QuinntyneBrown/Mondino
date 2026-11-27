// Traces to: L2-021, L2-022
import type { Moment, MomentKind } from '@mondino/api';
import { ALL_MOMENT_KINDS } from '@mondino/api';
import { markerFor, ofKinds } from './moment-marker';

/** The mocks' "now": 14:05 UTC on Monday 27 October 2025. */
const now = Date.UTC(2025, 9, 27, 14, 5);

const moment = (
  kind: MomentKind,
  date: string,
  title: string,
  timeZoneId = 'America/Mexico_City',
): Moment => ({
  teammateId: 'tomas',
  teammateName: 'Tomás Herrera',
  cityName: 'Mexico City',
  countryCode: 'MX',
  timeZoneId,
  kind,
  title,
  date,
  detail: '',
  emblemKey: null,
});

const muertos = moment('holiday', '2025-11-01', 'Día de Muertos');
const clasico = moment('sport', '2025-11-02', 'Clásico Nacional');

describe('markerFor', () => {
  it('marks a holiday today with its kind, today and its words', () => {
    const bankHoliday = moment('holiday', '2025-10-27', 'October Bank Holiday', 'Europe/Dublin');
    expect(markerFor([bankHoliday], ALL_MOMENT_KINDS, now)).toEqual({
      kind: 'holiday',
      title: 'October Bank Holiday',
      when: 'Today',
      count: 1,
      today: true,
      spoken: 'October Bank Holiday, today',
    });
  });

  it('marks a moment tomorrow and one 7 days ahead, and none 8 days ahead', () => {
    expect(
      markerFor([moment('sport', '2025-10-28', 'Derby')], ALL_MOMENT_KINDS, now),
    ).toMatchObject({ when: 'Tomorrow', today: false, spoken: 'Derby, tomorrow' });
    expect(
      markerFor([moment('sport', '2025-11-03', 'Derby')], ALL_MOMENT_KINDS, now),
    ).toMatchObject({ when: 'In 7 days', spoken: 'Derby, in 7 days' });
    expect(markerFor([moment('sport', '2025-11-04', 'Derby')], ALL_MOMENT_KINDS, now)).toBeNull();
  });

  it('counts the days in the moment’s own place: Melbourne’s 4 November is 7 days off', () => {
    const cup = moment('sport', '2025-11-04', 'Melbourne Cup Day', 'Australia/Melbourne');
    expect(markerFor([cup], ALL_MOMENT_KINDS, now)).toMatchObject({ when: 'In 7 days' });
  });

  it('leaves out a moment that has passed, and gives none with no moment', () => {
    expect(
      markerFor([moment('holiday', '2025-10-26', 'Yesterday')], ALL_MOMENT_KINDS, now),
    ).toBeNull();
    expect(markerFor([], ALL_MOMENT_KINDS, now)).toBeNull();
  });

  it('counts two moments this week, nearest first, and names each', () => {
    expect(markerFor([clasico, muertos], ALL_MOMENT_KINDS, now)).toEqual({
      kind: 'holiday',
      title: 'Día de Muertos',
      when: 'In 5 days',
      count: 2,
      today: false,
      spoken: '2 moments this week: Día de Muertos, in 5 days; Clásico Nacional, in 6 days',
    });
  });

  it('is today’s when the nearest of two is today', () => {
    const today = moment('local-event', '2025-10-27', 'Market');
    expect(markerFor([clasico, today], ALL_MOMENT_KINDS, now)).toMatchObject({
      count: 2,
      today: true,
      title: 'Market',
    });
  });

  it('orders two moments of one day by title', () => {
    const b = moment('sport', '2025-11-01', 'Bravo');
    const a = moment('holiday', '2025-11-01', 'Alpha');
    expect(markerFor([b, a], ALL_MOMENT_KINDS, now)?.spoken).toBe(
      '2 moments this week: Alpha, in 5 days; Bravo, in 5 days',
    );
  });

  it('counts only the kinds still on, and gives the one left its own kind and no count', () => {
    expect(markerFor([muertos, clasico], ['sport'], now)).toEqual({
      kind: 'sport',
      title: 'Clásico Nacional',
      when: 'In 6 days',
      count: 1,
      today: false,
      spoken: 'Clásico Nacional, in 6 days',
    });
  });

  it('marks nothing with a race turned off when the race is the only moment, or every kind off', () => {
    const race = moment('formula-1', '2025-11-01', 'São Paulo Grand Prix');
    expect(markerFor([race], ['holiday', 'local-event', 'sport'], now)).toBeNull();
    expect(markerFor([muertos, clasico], [], now)).toBeNull();
  });

  it('shows a held emblem nowhere: the kind is what the marker draws, whatever key arrives', () => {
    const keyed = { ...clasico, emblemKey: 'club-america' };
    expect(markerFor([keyed], ALL_MOMENT_KINDS, now)?.kind).toBe('sport');
  });
});

describe('ofKinds', () => {
  it('keeps the moments of the kinds given, in their order', () => {
    expect(ofKinds([muertos, clasico], ['sport'])).toEqual([clasico]);
    expect(ofKinds([muertos, clasico], ALL_MOMENT_KINDS)).toEqual([muertos, clasico]);
  });
});
