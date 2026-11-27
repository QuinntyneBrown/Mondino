import { stillPlacements } from './still-placements';

describe('stillPlacements', () => {
  // Where the Join mock draws each city, in % of the picture, with its depth where it fades.
  const cases: [string, number, number, { x: number; y: number; depth: number } | null][] = [
    ['Accra', 5.6037, -0.187, { x: 42.61, y: 58.46, depth: 1 }],
    ['Berlin', 52.52, 13.405, { x: 51.52, y: 25.88, depth: 1 }],
    ['Milan', 45.4642, 9.19, { x: 49.28, y: 30.04, depth: 1 }],
    ['Dublin', 53.3498, -6.2603, { x: 42.98, y: 25.11, depth: 1 }],
    ['Stockholm', 59.3293, 18.0686, { x: 53.01, y: 21.93, depth: 1 }],
    ['Dubai', 25.2048, 55.2708, { x: 77.0, y: 40.99, depth: 1 }],
    ['Bengaluru', 12.9716, 77.5946, { x: 87.85, y: 45.72, depth: 0.674 }],
    ['São Paulo', -23.5505, -46.6333, { x: 17.84, y: 72.38, depth: 0.576 }],
    ['Mexico City', 19.4326, -99.1332, null],
    ['Austin', 30.2672, -97.7431, null],
    ['Tokyo', 35.6762, 139.6503, null],
    ['Melbourne', -37.8136, 144.9631, null],
  ];

  for (const [city, latitude, longitude, drawn] of cases) {
    it(
      drawn ? `places ${city} where the mock draws it` : `leaves ${city}, on the far side, out`,
      () => {
        const [placed] = stillPlacements([{ latitude, longitude }]);
        if (!drawn) {
          expect(placed).toBeUndefined();
          return;
        }
        expect(Math.abs(placed.x - drawn.x)).toBeLessThan(0.5);
        expect(Math.abs(placed.y - drawn.y)).toBeLessThan(0.5);
        expect(Math.abs(placed.depth - drawn.depth)).toBeLessThan(0.05);
      },
    );
  }

  it('places nothing for no positions', () => {
    expect(stillPlacements([])).toEqual([]);
  });

  it('puts the point it faces at the centre, fully drawn', () => {
    expect(stillPlacements([{ latitude: 17.4, longitude: 10.1 }])).toEqual([
      { x: 50, y: 50, depth: 1 },
    ]);
  });
});
