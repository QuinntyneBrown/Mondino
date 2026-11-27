// Traces to: L2-027
import { cast, pin } from './cast.testing';
import { ribbonDensity } from './ribbon-density';

const now = Date.UTC(2025, 9, 27, 14, 5);

describe('ribbonDensity', () => {
  it('counts the cast in 48 half hours by local time, the most at 15:00 in Milan, Berlin and Stockholm', () => {
    const density = ribbonDensity(cast, now, '24-hour');
    expect(density.bins).toHaveLength(48);
    expect(density.bins.reduce((sum, count) => sum + count, 0)).toBe(13);
    // Tomás at 08:05, Priya at 19:35, Noah at 01:05
    expect(density.bins[16]).toBe(1);
    expect(density.bins[39]).toBe(1);
    expect(density.bins[2]).toBe(1);
    expect(density).toEqual(expect.objectContaining({ max: 4, maxBin: 30, maxBinTime: '15:00' }));
  });

  it('counts a teammate who does not share their status in their half hour', () =>
    expect(
      ribbonDensity([pin('Lena', 'Europe/Berlin', 13.4, { sharesStatus: false })], now, '24-hour')
        .bins[30],
    ).toBe(1));

  it('gives the first of two bins that tie, on the 12-hour clock', () => {
    const density = ribbonDensity(
      [pin('Liam', 'Europe/Dublin', -6.26), pin('Luca', 'Europe/Rome', 9.19)],
      now,
      '12-hour',
    );
    expect(density).toEqual(expect.objectContaining({ max: 1, maxBin: 28, maxBinTime: '2:00 pm' }));
  });
});
