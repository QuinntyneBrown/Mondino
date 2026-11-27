// Traces to: L2-026, L2-028, L2-016, L2-015, L2-019
import type { Pin } from '@mondino/api';
import { cast, pin } from './cast.testing';
import { filterByStatus, teamLine, teamRows } from './team-rows';

const now = Date.UTC(2025, 9, 27, 14, 5);
const fog = { temperatureC: 13, condition: 'fog' as const, observedAt: '' };

describe('teamRows', () => {
  it('lists the cast west to east, as pages/team/default does', () =>
    expect(teamRows(cast, now, '24-hour', 'celsius').map((row) => row.name)).toEqual([
      'Tomás Herrera',
      'Jordan Lee',
      'Chloé Martin',
      'Liam O’Connor',
      'Kwame Mensah',
      'Luca Ferri',
      'Sofia Bianchi',
      'Lena Fischer',
      'Mara Lindqvist',
      'Ahmed Al-Sayed',
      'Priya Raman',
      'Aiko Tanaka',
      'Noah Williams',
    ]));

  it('gives each row its local time, status and offset in the row’s words', () => {
    const rows = teamRows(cast, now, '24-hour', 'celsius');
    const of = (name: string) => rows.find((row) => row.name === name)!;
    expect(of('Tomás Herrera')).toEqual(
      expect.objectContaining({
        localTime: '08:05',
        status: 'early-morning',
        offset: '7h behind',
        initials: 'TH',
      }),
    );
    expect(of('Priya Raman').offset).toBe('4h 30m ahead');
    expect(of('Noah Williams').offset).toBe('10h ahead');
    expect(of('Luca Ferri').offset).toBe('Same time');
    expect(of('Sofia Bianchi').offset).toBeNull();
  });

  it('gives the weather in the viewer’s unit, with the night icon where the city is asleep', () => {
    const pins: Pin[] = [
      pin('Sofia Bianchi', 'Europe/Rome', 9.19, {
        isViewer: true,
        weather: fog,
        weatherState: 'Available',
      }),
      pin('Aiko Tanaka', 'Asia/Tokyo', 139.69, {
        weather: { ...fog, temperatureC: 14, condition: 'clear' },
        weatherState: 'Available',
      }),
      pin('Ahmed Al-Sayed', 'Asia/Dubai', 55.27, { weatherState: 'NotShared' }),
    ];
    const rows = teamRows(pins, now, '12-hour', 'fahrenheit');
    expect(rows[0].weather).toEqual({ degrees: '55°', condition: 'fog', night: false });
    expect(rows[0].localTime).toBe('3:05 pm');
    expect(rows[2].weather).toEqual({ degrees: '57°', condition: 'clear', night: true });
    expect(rows[1]).toEqual(expect.objectContaining({ weather: null, weatherState: 'NotShared' }));
  });

  it('gives no status, at any hour, to a teammate who does not share it', () =>
    expect(
      teamRows(
        [pin('Lena Fischer', 'Europe/Berlin', 13.4, { sharesStatus: false })],
        now,
        '24-hour',
        'celsius',
      )[0].status,
    ).toBeNull());
});

describe('filterByStatus', () => {
  const rows = teamRows(
    cast.map((each) => (each.name === 'Lena Fischer' ? { ...each, sharesStatus: false } : each)),
    now,
    '24-hour',
    'celsius',
  );

  it('keeps everyone under all, a teammate with no status among them', () =>
    expect(filterByStatus(rows, 'all').length).toBe(13));

  it('keeps those in working hours, still west to east, and not one who hides their status', () =>
    expect(filterByStatus(rows, 'working').map((row) => row.name)).toEqual([
      'Jordan Lee',
      'Chloé Martin',
      'Liam O’Connor',
      'Kwame Mensah',
      'Luca Ferri',
      'Sofia Bianchi',
      'Mara Lindqvist',
    ]));

  it('keeps those probably asleep', () =>
    expect(filterByStatus(rows, 'asleep').map((row) => row.name)).toEqual([
      'Aiko Tanaka',
      'Noah Williams',
    ]));
});

describe('teamLine', () => {
  it('reads as pages/team/default does', () =>
    expect(teamLine({ teammates: 13, timeZones: 12, working: 8, asleep: 2 })).toBe(
      '13 teammates · 12 time zones · live',
    ));

  it('reads as pages/team/empty does for a team of one', () =>
    expect(teamLine({ teammates: 1, timeZones: 1, working: 1, asleep: 0 })).toBe(
      'Just you · 1 time zone · live',
    ));
});
