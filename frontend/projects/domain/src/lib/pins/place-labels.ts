import type { LabelSide } from '@mondino/api';

/** A placement as the label placer sees it, in CSS px from the box's corner. */
export interface LabelledPoint {
  readonly x: number;
  readonly y: number;
  /** Whether it may carry a label at rest: a pin alone that is not far. */
  readonly labelled: boolean;
  /** Half the width of its mark: a pin's or a group pin's. */
  readonly markRadius: number;
  /** Its label's width at rest; the time alone's when not given. */
  readonly widthPx?: number;
}

/** A resting label, as the mocks draw "15:05": about 48 × 24 CSS px. */
export const LabelWidthPx = 48;
/** A resting label with weather, as the mocks draw "11:05 ☂ 26°": about 92 CSS px (L2-018). */
export const WeatherLabelWidthPx = 92;
export const LabelHeightPx = 24;
/** The gap from a pin's centre to its label: half a 26 px pin and 8 px. */
const GapPx = 21;
const sides: readonly LabelSide[] = ['right', 'left', 'below', 'above'];

/**
 * A side for each resting label (L2-013): right, left, below or above, the first where the
 * label sits inside the globe's disc and clear of every other placement's mark; null where none
 * is, or where the placement carries no label at rest. On a compact globe no label rests.
 */
export function placeLabels(
  points: readonly LabelledPoint[],
  widthPx: number,
  compact: boolean,
): (LabelSide | null)[] {
  const centre = widthPx / 2;
  const disc = (widthPx / 2) * 0.88;
  const inside = (x: number, y: number) => Math.hypot(x - centre, y - centre) <= disc;
  return points.map((point) => {
    if (compact || !point.labelled) return null;
    for (const side of sides) {
      const width = point.widthPx ?? LabelWidthPx;
      const [left, top] = boxOf(point, side, width);
      const [right, bottom] = [left + width, top + LabelHeightPx];
      if (
        ![
          [left, top],
          [right, top],
          [left, bottom],
          [right, bottom],
        ].every(([x, y]) => inside(x, y))
      )
        continue;
      const clear = points.every((other) => {
        if (other === point) return true;
        const nearestX = Math.min(Math.max(other.x, left), right);
        const nearestY = Math.min(Math.max(other.y, top), bottom);
        return Math.hypot(other.x - nearestX, other.y - nearestY) > other.markRadius;
      });
      if (clear) return side;
    }
    return null;
  });
}

function boxOf(point: LabelledPoint, side: LabelSide, width: number): [number, number] {
  switch (side) {
    case 'right':
      return [point.x + GapPx, point.y - LabelHeightPx / 2];
    case 'left':
      return [point.x - GapPx - width, point.y - LabelHeightPx / 2];
    case 'below':
      return [point.x - width / 2, point.y + GapPx];
    case 'above':
      return [point.x - width / 2, point.y - GapPx - LabelHeightPx];
  }
}
