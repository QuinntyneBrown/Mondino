import type { Position, StillPlacement } from '@mondino/api';

/** The still picture faces the point at 10.1° E, 17.4° N: Europe and Africa, as the mocks draw it. */
const centre = { longitude: 10.1, latitude: 17.4 };
/** The globe's radius, as a share of the picture: 252 of its 600 units. */
const radius = 252 / 600;
/** Pins fade towards the rim: fully drawn where the surface faces the viewer this much or more. */
const fullDepth = 0.625;

const radians = (degrees: number) => (degrees * Math.PI) / 180;
const round = (value: number, places: number) => Number(value.toFixed(places));

/**
 * Places each position on the still picture of the globe, by orthographic projection, and keeps
 * those on the near side. Positions on the far side are not drawn.
 */
export function stillPlacements(positions: readonly Position[]): StillPlacement[] {
  const φ0 = radians(centre.latitude);
  const placements: StillPlacement[] = [];
  for (const { latitude, longitude } of positions) {
    const φ = radians(latitude);
    const λ = radians(longitude - centre.longitude);
    const x = Math.cos(φ) * Math.sin(λ);
    const y = Math.cos(φ0) * Math.sin(φ) - Math.sin(φ0) * Math.cos(φ) * Math.cos(λ);
    const z = Math.sin(φ0) * Math.sin(φ) + Math.cos(φ0) * Math.cos(φ) * Math.cos(λ);
    if (z <= 0) continue;
    placements.push({
      x: round(50 + 100 * radius * x, 2),
      y: round(50 - 100 * radius * y, 2),
      depth: round(Math.min(1, z / fullDepth), 3),
    });
  }
  return placements;
}
