import { localTimeIn } from './local-time';

describe('localTimeIn', () => {
  // The mocks' "now": Monday 27 October 2025, 14:05 UTC.
  const now = Date.UTC(2025, 9, 27, 14, 5);

  const cases: [string, string][] = [
    ['Europe/Rome', '15:05'],
    ['America/Mexico_City', '08:05'],
    ['Asia/Kolkata', '19:35'],
    ['Australia/Melbourne', '01:05'],
    ['Europe/Dublin', '14:05'],
  ];
  for (const [zone, time] of cases)
    it(`gives ${time} in ${zone}`, () => expect(localTimeIn(zone, now)).toBe(time));

  it('gives UTC’s time for a time zone the browser does not know', () => {
    expect(localTimeIn('Nowhere/Atlantis', now)).toBe('14:05');
  });
});
