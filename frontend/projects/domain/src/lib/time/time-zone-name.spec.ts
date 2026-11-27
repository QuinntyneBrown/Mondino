import { timeZoneName } from './time-zone-name';

// The mocks' "now": Monday 27 October 2025, 14:05 UTC.
const now = Date.UTC(2025, 9, 27, 14, 5);

describe('timeZoneName', () => {
  const cases: [string, string][] = [
    ['Europe/Rome', 'Central European Time'],
    ['America/Toronto', 'Eastern Time'],
    ['Asia/Tokyo', 'Japan Standard Time'],
  ];
  for (const [zone, name] of cases)
    it(`names ${zone} "${name}"`, () => expect(timeZoneName(zone, now)).toBe(name));

  it('names Milan the same in summer as in winter', () =>
    expect(timeZoneName('Europe/Rome', Date.UTC(2025, 6, 1))).toBe('Central European Time'));

  it('gives a zone the browser does not know by its id', () =>
    expect(timeZoneName('Mars/Olympus_Mons', now)).toBe('Mars/Olympus_Mons'));
});
