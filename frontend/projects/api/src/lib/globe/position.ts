/** A place on the globe, in degrees: a city's position, never a postal code's. */
export interface Position {
  readonly latitude: number;
  readonly longitude: number;
}

/**
 * A pin placed on the still picture of the globe: where it is, as a percentage of the picture's
 * width (`x`) and height (`y`), and how near the viewer it is (`depth`, 1 at the front, fading
 * towards the rim).
 */
export interface StillPlacement {
  readonly x: number;
  readonly y: number;
  readonly depth: number;
}
