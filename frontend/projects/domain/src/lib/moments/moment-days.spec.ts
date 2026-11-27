// Traces to: L2-020, L2-023, L2-024, L2-026
import type { Moment, MomentKind } from '@mondino/api';
import { cast } from '../pins/cast.testing';
import { daysUntil, nextMoment, upcomingMoments, weekMoments, whenLabel } from './moment-days';

/** The mocks' "now": 14:05 UTC on Monday 27 October 2025. */
const now = Date.UTC(2025, 9, 27, 14, 5);

const moment = (
  teammate: string,
  timeZoneId: string,
  kind: MomentKind,
  date: string,
  title: string,
  cityName = teammate,
): Moment => ({
  teammateId: teammate,
  teammateName: teammate,
  cityName,
  countryCode: '',
  timeZoneId,
  kind,
  title,
  date,
  detail: `${title}'s detail`,
  emblemKey: null,
});

const castMoments: Moment[] = [
  moment(
    'Liam O’Connor',
    'Europe/Dublin',
    'holiday',
    '2025-10-27',
    'October Bank Holiday',
    'Dublin',
  ),
  moment('Jordan Lee', 'America/Chicago', 'local-event', '2025-10-31', 'Halloween on 6th Street'),
  moment('Priya Raman', 'Asia/Kolkata', 'holiday', '2025-11-01', 'Karnataka Rajyotsava'),
  moment('Tomás Herrera', 'America/Mexico_City', 'holiday', '2025-11-01', 'Día de Muertos'),
  moment('Mara Lindqvist', 'Europe/Stockholm', 'holiday', '2025-11-01', 'Alla helgons dag'),
  moment('Tomás Herrera', 'America/Mexico_City', 'sport', '2025-11-02', 'Clásico Nacional'),
  moment('Aiko Tanaka', 'Asia/Tokyo', 'holiday', '2025-11-03', 'Culture Day'),
  moment('Noah Williams', 'Australia/Melbourne', 'sport', '2025-11-04', 'Melbourne Cup Day'),
  moment('Chloé Martin', 'America/Sao_Paulo', 'formula-1', '2025-11-09', 'São Paulo Grand Prix'),
  moment('Ahmed Al-Sayed', 'Asia/Dubai', 'formula-1', '2025-12-07', 'Abu Dhabi Grand Prix'),
  moment('Ahmed Al-Sayed', 'Asia/Dubai', 'holiday', '2025-12-02', 'UAE National Day'),
];

describe('daysUntil', () => {
  it('counts from today in the moment’s own place', () => {
    // 14:05 UTC is 01:05 on 28 October in Melbourne, still 27 October in Milan
    expect(daysUntil('2025-11-04', 'Australia/Melbourne', now)).toBe(7);
    expect(daysUntil('2025-11-04', 'Europe/Rome', now)).toBe(8);
    expect(daysUntil('2025-10-27', 'Europe/Dublin', now)).toBe(0);
    expect(daysUntil('2025-10-27', 'Australia/Melbourne', now)).toBe(-1);
  });

  it('counts whole days across a change of the clocks and of the month', () => {
    // Europe's clocks went back on 26 October; the count is still in days
    expect(daysUntil('2025-12-02', 'Asia/Dubai', now)).toBe(36);
    expect(daysUntil('2026-01-01', 'Europe/Dublin', now)).toBe(66);
  });
});

describe('whenLabel', () => {
  it.each([
    [0, '2025-10-27', 'Today'],
    [1, '2025-10-28', 'Tomorrow'],
    [5, '2025-11-01', 'In 5 days'],
    [7, '2025-11-04', 'In 7 days'],
    [8, '2025-11-04', '4 Nov'],
    [13, '2025-11-09', '9 Nov'],
    [36, '2025-12-02', '2 Dec'],
  ])('%i days ahead on %s is "%s"', (days, date, label) => {
    expect(whenLabel(date, days)).toBe(label);
  });
});

describe('upcomingMoments', () => {
  it('gives a teammate’s moments from today on, soonest first, each with its kind and when', () => {
    expect(upcomingMoments(castMoments, 'Ahmed Al-Sayed', now)).toEqual([
      {
        teammateId: 'Ahmed Al-Sayed',
        kind: 'holiday',
        kindName: 'Holiday',
        title: 'UAE National Day',
        detail: "UAE National Day's detail",
        when: '2 Dec',
        today: false,
      },
      {
        teammateId: 'Ahmed Al-Sayed',
        kind: 'formula-1',
        kindName: 'Formula 1',
        title: 'Abu Dhabi Grand Prix',
        detail: "Abu Dhabi Grand Prix's detail",
        when: '7 Dec',
        today: false,
      },
    ]);
  });

  it('leaves out a moment that has passed in its place, and has none for a teammate with none', () => {
    const past = moment('Noah Williams', 'Australia/Melbourne', 'sport', '2025-10-27', 'Yesterday');
    expect(upcomingMoments([past], 'Noah Williams', now)).toEqual([]);
    expect(upcomingMoments(castMoments, 'Luca Ferri', now)).toEqual([]);
  });

  it('says "Today" of today’s moment', () => {
    const [today] = upcomingMoments(castMoments, 'Liam O’Connor', now);
    expect(today.when).toBe('Today');
    expect(today.today).toBe(true);
  });
});

describe('nextMoment', () => {
  it('is the soonest, or null', () => {
    expect(nextMoment(castMoments, 'Tomás Herrera', now)?.title).toBe('Día de Muertos');
    expect(nextMoment(castMoments, 'Noah Williams', now)?.when).toBe('In 7 days');
    expect(nextMoment(castMoments, 'Chloé Martin', now)?.when).toBe('9 Nov');
    expect(nextMoment(castMoments, 'Luca Ferri', now)).toBeNull();
  });
});

describe('weekMoments', () => {
  it('lists this week’s first six, soonest first and the same day west to east', () => {
    expect(weekMoments(castMoments, cast, now).map((each) => `${each.when} ${each.title}`)).toEqual(
      [
        'Today October Bank Holiday',
        'In 4 days Halloween on 6th Street',
        'In 5 days Día de Muertos',
        'In 5 days Alla helgons dag',
        'In 5 days Karnataka Rajyotsava',
        'In 6 days Clásico Nacional',
      ],
    );
  });

  it('names the teammate by their first name and city', () => {
    const [first] = weekMoments(castMoments, cast, now);
    expect(first.who).toBe('Liam · Dublin');
    expect(first.kindName).toBe('Holiday');
    expect(first.today).toBe(true);
  });

  it('keeps 7 days ahead in each place and leaves out the eighth', () => {
    const all = weekMoments(castMoments, cast, now, 20).map((each) => each.title);
    expect(all).toContain('Melbourne Cup Day');
    expect(all).toContain('Culture Day');
    expect(all).not.toContain('São Paulo Grand Prix');
  });

  it('leaves out a moment of someone not on the globe', () => {
    const gone = moment('Someone Gone', 'Europe/Dublin', 'holiday', '2025-10-27', 'Gone');
    expect(weekMoments([gone], cast, now)).toEqual([]);
  });

  it('is empty in a week with no moment', () => {
    expect(weekMoments([], cast, now)).toEqual([]);
  });
});
