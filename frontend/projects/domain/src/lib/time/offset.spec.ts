// Traces to: L2-016
import { formatOffset, offsetBetween, zoneOffsetMinutes } from './offset';

const now = Date.UTC(2025, 9, 27, 14, 5);
const milan = 'Europe/Rome';

describe('zoneOffsetMinutes', () => {
  const cases: [string, number][] = [
    [milan, 60],
    ['America/Mexico_City', -360],
    ['Asia/Kolkata', 330],
    ['Australia/Melbourne', 660],
    ['UTC', 0],
  ];
  for (const [zone, minutes] of cases)
    it(`gives ${minutes} minutes for ${zone}`, () =>
      expect(zoneOffsetMinutes(now, zone)).toBe(minutes));

  it('reads the zone at the instant, not at the start of its minute', () =>
    expect(zoneOffsetMinutes(now + 59_999, 'Asia/Kolkata')).toBe(330));
});

describe('offsetBetween, seen from Milan', () => {
  // The cast at the mocks' "now", as pages/team/default.html gives each row.
  const cases: [string, string, string, string][] = [
    ['America/Mexico_City', 'Mexico City', '7h behind', '7h behind you'],
    ['America/Chicago', 'Austin', '6h behind', '6h behind you'],
    ['America/Sao_Paulo', 'São Paulo', '4h behind', '4h behind you'],
    ['Europe/Dublin', 'Dublin', '1h behind', '1h behind you'],
    ['Africa/Accra', 'Accra', '1h behind', '1h behind you'],
    ['Europe/Berlin', 'Berlin', 'Same time', 'same time as you'],
    ['Europe/Stockholm', 'Stockholm', 'Same time', 'same time as you'],
    [milan, 'Milan', 'Same time', 'same time as you'],
    ['Asia/Dubai', 'Dubai', '3h ahead', '3h ahead of you'],
    ['Asia/Kolkata', 'Bengaluru', '4h 30m ahead', '4h 30m ahead of you'],
    ['Asia/Tokyo', 'Tokyo', '8h ahead', '8h ahead of you'],
    ['Australia/Melbourne', 'Melbourne', '10h ahead', '10h ahead of you'],
  ];
  for (const [zone, city, row, panel] of cases)
    it(`gives ${city} "${row}" on a row and "${panel}" on a panel`, () => {
      const offset = offsetBetween(now, zone, milan);
      expect(formatOffset(offset, 'row')).toBe(row);
      expect(formatOffset(offset, 'panel')).toBe(panel);
    });

  it('gives the size and the direction of the difference', () => {
    expect(offsetBetween(now, 'America/Mexico_City', milan)).toEqual({
      minutes: 420,
      direction: 'behind',
    });
    expect(offsetBetween(now, 'Asia/Kolkata', milan)).toEqual({ minutes: 270, direction: 'ahead' });
    expect(offsetBetween(now, 'Europe/Berlin', milan)).toEqual({ minutes: 0, direction: 'same' });
  });

  it('changes by one hour once a daylight-saving change on one side has passed', () => {
    // Milan leaves summer time at 01:00 UTC on 26 October 2025; Mexico City keeps no summer time.
    const before = Date.UTC(2025, 9, 26, 0, 59);
    expect(formatOffset(offsetBetween(before, 'America/Mexico_City', milan), 'row')).toBe(
      '8h behind',
    );
    expect(formatOffset(offsetBetween(before + 60_000, 'America/Mexico_City', milan), 'row')).toBe(
      '7h behind',
    );
  });
});

describe('formatOffset', () => {
  const cases: [number, 'ahead' | 'behind', string, string][] = [
    [30, 'ahead', '30m ahead', '30m ahead of you'],
    [60, 'behind', '1h behind', '1h behind you'],
    [345, 'ahead', '5h 45m ahead', '5h 45m ahead of you'],
    [570, 'behind', '9h 30m behind', '9h 30m behind you'],
  ];
  for (const [minutes, direction, row, panel] of cases)
    it(`gives ${minutes} minutes ${direction} as "${row}" and "${panel}"`, () => {
      expect(formatOffset({ minutes, direction }, 'row')).toBe(row);
      expect(formatOffset({ minutes, direction }, 'panel')).toBe(panel);
    });

  it('never gives "0h"', () => {
    expect(formatOffset({ minutes: 0, direction: 'same' }, 'row')).toBe('Same time');
    expect(formatOffset({ minutes: 0, direction: 'same' }, 'panel')).toBe('same time as you');
  });
});
