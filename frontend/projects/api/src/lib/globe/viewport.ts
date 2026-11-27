import type { Position, StillPlacement } from './position';

/**
 * Where things are on a globe at one instant (ADR 0014): the width of the globe's box in CSS px,
 * and where a position is drawn in it (`x` and `y` in % of the box, and its `depth`, 1 facing
 * the viewer and falling towards 0 at the rim), or null on the far side.
 */
export interface GlobeViewport {
  readonly widthPx: number;
  project(position: Position): StillPlacement | null;
}
