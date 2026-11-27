import { formatDay, formatTime, localTime } from './local-time';

// The mocks' "now": Monday 27 October 2025, 14:05 UTC.
const now = Date.UTC(2025, 9, 27, 14, 5);

describe('localTime', () => {
  const cases: [string, string, string][] = [
    ['Europe/Rome', '15:05', 'Monday 27 Oct'],
    ['America/Mexico_City', '08:05', 'Monday 27 Oct'],
    ['Asia/Kolkata', '19:35', 'Monday 27 Oct'],
    ['Australia/Melbourne', '01:05', 'Tuesday 28 Oct'],
    ['Europe/Dublin', '14:05', 'Monday 27 Oct'],
  ];
  for (const [zone, time, day] of cases)
    it(`gives ${time} on ${day} in ${zone}`, () => {
      expect(formatTime(localTime(now, zone), '24-hour')).toBe(time);
      expect(formatDay(localTime(now, zone))).toBe(day);
    });

  it('gives Melbourne’s own day while Milan is on Monday evening', () => {
    const evening = Date.UTC(2025, 9, 27, 19, 30);
    expect(formatDay(localTime(evening, 'Europe/Rome'))).toBe('Monday 27 Oct');
    expect(localTime(evening, 'Australia/Melbourne')).toEqual({
      hour: 6,
      minute: 30,
      weekday: 'tuesday',
      date: '2025-10-28',
    });
  });

  it('follows a daylight-saving change as the clock passes it', () => {
    // Austin leaves daylight saving at 02:00 on Sunday 2 November 2025, 07:00 UTC
    const before = Date.UTC(2025, 10, 2, 6, 59);
    expect(formatTime(localTime(before, 'America/Chicago'), '24-hour')).toBe('01:59');
    expect(formatTime(localTime(before + 60_000, 'America/Chicago'), '24-hour')).toBe('01:00');
  });

  it('gives UTC’s time for a time zone the browser does not know', () => {
    expect(formatTime(localTime(now, 'Nowhere/Atlantis'), '24-hour')).toBe('14:05');
  });
});

describe('formatTime', () => {
  const at = (hour: number, minute: number) => ({
    hour,
    minute,
    weekday: 'monday' as const,
    date: '2025-10-27',
  });
  const cases: [number, number, string, string][] = [
    [8, 5, '08:05', '8:05 am'],
    [0, 5, '00:05', '12:05 am'],
    [12, 30, '12:30', '12:30 pm'],
    [14, 5, '14:05', '2:05 pm'],
    [23, 59, '23:59', '11:59 pm'],
  ];
  for (const [hour, minute, h24, h12] of cases)
    it(`gives ${h24} on a 24-hour clock and ${h12} on a 12-hour clock`, () => {
      expect(formatTime(at(hour, minute), '24-hour')).toBe(h24);
      expect(formatTime(at(hour, minute), '12-hour')).toBe(h12);
    });
});
