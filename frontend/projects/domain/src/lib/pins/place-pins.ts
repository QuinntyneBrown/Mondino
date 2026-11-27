import type { GlobeViewport, Pin, PinPlacement, PinView } from '@mondino/api';
import { describeGroup } from './pin-views';
import { groupPins, type PlacePoint } from './group-pins';
import { placeLabels } from './place-labels';

/** A place turned further than this from the viewer is drawn fainter and unlabelled (ADR 0014). */
export const FarDepth = 0.5;
/** Up to this many teammates, the grouping radius is a pin's own; past it, the larger one. */
export const LargeTeam = 40;
export const GroupRadiusPx = 20;
export const GroupRadiusLargePx = 40;
/** A globe whose box is narrower than this (31.25 rem) is compact: smaller pins, no resting labels. */
export const CompactWidthPx = 500;

/** Half the drawn width of a pin's mark (26 px) and of a group pin's (32 px), in CSS px. */
const PinRadiusPx = 13;
const GroupRadiusMarkPx = 16;

export interface PinSelection {
  readonly selectedId: string | null;
  /** The teammates of the selected group pin, or none. */
  readonly heldIds: readonly string[];
}

/** Whether a globe of this width is drawn compact (L2-013). */
export function isCompact(widthPx: number): boolean {
  return widthPx < CompactWidthPx;
}

/**
 * The placements drawn over a globe at one instant (ADR 0014): each city's place projected once,
 * the far side dropped (L2-011), the rest grouped where pins would cover each other (L2-013),
 * those near the rim marked far, the labels sided, and the whole in order from west to east, so
 * the list a keyboard walks does not change as the globe turns.
 */
export function placePins(
  pins: readonly Pin[],
  views: ReadonlyMap<string, PinView>,
  viewport: GlobeViewport,
  selection: PinSelection,
): PinPlacement[] {
  const { widthPx } = viewport;
  const places = new Map<string, { position: Pin['position']; pins: PinView[] }>();
  for (const pin of pins) {
    const view = views.get(pin.teammateId);
    if (!view) continue;
    const key = `${pin.position.latitude},${pin.position.longitude}`;
    const place = places.get(key);
    if (place) place.pins.push(view);
    else places.set(key, { position: pin.position, pins: [view] });
  }
  const points: PlacePoint[] = [];
  for (const { position, pins: placed } of places.values()) {
    const at = viewport.project(position);
    if (!at) continue;
    points.push({
      position,
      x: (at.x * widthPx) / 100,
      y: (at.y * widthPx) / 100,
      depth: at.depth,
      pins: placed,
    });
  }
  const groups = groupPins(points, {
    radiusPx: pins.length > LargeTeam ? GroupRadiusLargePx : GroupRadiusPx,
    selectedId: selection.selectedId,
    heldIds: selection.heldIds,
  }).sort(
    (a, b) =>
      a.anchor.position.longitude - b.anchor.position.longitude ||
      b.anchor.position.latitude - a.anchor.position.latitude,
  );
  const sides = placeLabels(
    groups.map(({ anchor, pins: grouped }) => ({
      x: anchor.x,
      y: anchor.y,
      labelled: grouped.length === 1 && anchor.depth >= FarDepth,
      markRadius: grouped.length === 1 ? PinRadiusPx : GroupRadiusMarkPx,
    })),
    widthPx,
    isCompact(widthPx),
  );
  const round = (value: number) => Number(value.toFixed(2));
  return groups.map(({ anchor, pins: grouped }, index) => {
    const alone = grouped.length === 1;
    return {
      key: alone ? grouped[0].teammateId : `group:${grouped[0].teammateId}`,
      kind: alone ? 'pin' : 'group',
      x: round((anchor.x / widthPx) * 100),
      y: round((anchor.y / widthPx) * 100),
      depth: anchor.depth,
      far: anchor.depth < FarDepth,
      pins: grouped,
      description: alone ? grouped[0].description : describeGroup(grouped),
      labelSide: sides[index],
    };
  });
}
