import type { Pin } from '@mondino/api';
import { localTime } from './local-time';
import { statusAt, statusFor, statusWords } from './status';

describe('statusAt', () => {
  // One case per boundary of L2-015's table
  const cases: [number, string][] = [
    [6, 'Probably asleep'],
    [7, 'Early morning'],
    [8, 'Early morning'],
    [9, 'Working hours'],
    [17, 'Working hours'],
    [18, 'Evening'],
    [22, 'Evening'],
    [23, 'Probably asleep'],
    [0, 'Probably asleep'],
  ];
  for (const [hour, words] of cases)
    it(`gives "${words}" at ${hour}:00`, () => expect(statusWords(statusAt(hour))).toBe(words));
});

describe('statusFor', () => {
  const pin = (sharesStatus: boolean): Pin => ({
    teammateId: 't',
    name: 'Ahmed Al-Sayed',
    colour: 'teammate-6',
    cityName: 'Dubai',
    country: 'United Arab Emirates',
    position: { latitude: 25.2, longitude: 55.3 },
    timeZoneId: 'Asia/Dubai',
    sharesStatus,
    isViewer: false,
  });

  it('gives the status of the local hour, on a Saturday as on a Monday', () => {
    // 12:00 in Dubai on Saturday 1 November 2025
    const saturday = localTime(Date.UTC(2025, 10, 1, 8), 'Asia/Dubai');
    expect(saturday.weekday).toBe('saturday');
    expect(statusFor(pin(true), saturday)).toBe('working-hours');
  });

  it('gives none, at any hour, for a teammate who does not share it', () => {
    for (let hour = 0; hour < 24; hour++)
      expect(
        statusFor(pin(false), { hour, minute: 0, weekday: 'monday', date: '2025-10-27' }),
      ).toBeNull();
  });
});
