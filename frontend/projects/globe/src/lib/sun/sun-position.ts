import type { Position } from '@mondino/api';

const radians = (degrees: number) => (degrees * Math.PI) / 180;
const degrees = (radians: number) => (radians * 180) / Math.PI;
/** Wraps an angle into -180° to 180°. */
const wrap = (angle: number) => ((((angle + 180) % 360) + 360) % 360) - 180;

/**
 * Where the sun is directly overhead at `now` (milliseconds since the epoch): its latitude is the
 * sun's declination for the date, and its longitude follows from the time in UTC. The low-precision
 * solar position of the Astronomical Almanac, good to about a hundredth of a degree for decades
 * either side of 2000, which is far finer than a globe shows. It reads no clock of its own.
 */
export function subsolarPoint(now: number): Position {
  // Days since noon UTC on 1 January 2000 (J2000.0).
  const n = now / 86_400_000 + 2_440_587.5 - 2_451_545;
  const meanLongitude = 280.46 + 0.9856474 * n;
  const meanAnomaly = radians(357.528 + 0.9856003 * n);
  const eclipticLongitude = radians(
    meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly),
  );
  const obliquity = radians(23.439 - 0.0000004 * n);
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));
  const rightAscension = Math.atan2(
    Math.cos(obliquity) * Math.sin(eclipticLongitude),
    Math.cos(eclipticLongitude),
  );
  const siderealTime = 280.46061837 + 360.98564736629 * n;
  return {
    latitude: degrees(declination),
    longitude: wrap(degrees(rightAscension) - siderealTime),
  };
}

/** The direction of a position from the centre of the globe, as a unit vector (x east at 90°, y north, z at 0°). */
export function directionOf({ latitude, longitude }: Position): [number, number, number] {
  const φ = radians(latitude);
  const λ = radians(longitude);
  return [Math.cos(φ) * Math.sin(λ), Math.sin(φ), Math.cos(φ) * Math.cos(λ)];
}

/** Whether `position` is in the half of the globe facing away from the sun at `now`. */
export function isNight(position: Position, now: number): boolean {
  const [x, y, z] = directionOf(position);
  const [sx, sy, sz] = directionOf(subsolarPoint(now));
  return x * sx + y * sy + z * sz < 0;
}
