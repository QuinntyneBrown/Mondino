import { isNight, subsolarPoint } from './sun-position';

const at = (iso: string) => Date.parse(iso);

describe('subsolarPoint', () => {
  it('puts the sun over the equator near longitude 0° at 12:00 UTC on 21 March', () => {
    const sun = subsolarPoint(at('2025-03-21T12:00:00Z'));
    expect(Math.abs(sun.latitude)).toBeLessThan(0.5);
    expect(Math.abs(sun.longitude)).toBeLessThan(3);
  });

  it('puts the sun over the Tropic of Cancer at the June solstice', () => {
    expect(subsolarPoint(at('2025-06-21T12:00:00Z')).latitude).toBeCloseTo(23.44, 0);
  });

  it('moves the sun about 15° west in an hour', () => {
    const before = subsolarPoint(at('2025-10-27T14:05:00Z'));
    const after = subsolarPoint(at('2025-10-27T15:05:00Z'));
    expect(before.longitude - after.longitude).toBeCloseTo(15, 0);
  });

  it('moves the sun a quarter of a degree west in a minute', () => {
    const before = subsolarPoint(at('2025-10-27T14:05:00Z'));
    const after = subsolarPoint(at('2025-10-27T14:06:00Z'));
    expect(before.longitude - after.longitude).toBeCloseTo(0.25, 2);
  });

  it('keeps the longitude between -180° and 180°', () => {
    for (let hour = 0; hour < 24; hour++) {
      const { longitude } = subsolarPoint(Date.UTC(2025, 9, 27, hour));
      expect(longitude).toBeGreaterThanOrEqual(-180);
      expect(longitude).toBeLessThanOrEqual(180);
    }
  });
});

describe('isNight', () => {
  const noonMarch = at('2025-03-21T12:00:00Z');

  it('lights longitude 0° on the equator at 12:00 UTC on 21 March', () => {
    expect(isNight({ latitude: 0, longitude: 0 }, noonMarch)).toBe(false);
  });

  it('shades longitude 180° on the equator at 12:00 UTC on 21 March', () => {
    expect(isNight({ latitude: 0, longitude: 180 }, noonMarch)).toBe(true);
  });

  it('shades a teammate whose local time is 02:00', () => {
    // 02:05 in Tokyo is 17:05 UTC.
    expect(isNight({ latitude: 35.68, longitude: 139.65 }, at('2025-10-27T17:05:00Z'))).toBe(true);
  });

  it('lights a teammate whose local time is 14:00', () => {
    // 15:05 in Milan is 14:05 UTC, the mocks' "now".
    expect(isNight({ latitude: 45.46, longitude: 9.19 }, at('2025-10-27T14:05:00Z'))).toBe(false);
  });

  it('moves the edge of the shading westward as the hour passes', () => {
    // Off the Horn of Africa the sun sets between 14:05 and 15:05 UTC on 27 October.
    const place = { latitude: 0, longitude: 50 };
    expect(isNight(place, at('2025-10-27T14:05:00Z'))).toBe(false);
    expect(isNight(place, at('2025-10-27T15:05:00Z'))).toBe(true);
  });
});
