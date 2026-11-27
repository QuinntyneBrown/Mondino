import type { Position, PinView } from '@mondino/api';

/** A place (the pins of one city) as it is drawn at one instant, in CSS px from the box's corner. */
export interface PlacePoint {
  readonly position: Position;
  readonly x: number;
  readonly y: number;
  /** 1 facing the viewer, falling towards 0 at the rim. */
  readonly depth: number;
  readonly pins: readonly PinView[];
}

export interface GroupOptions {
  /** Places closer than this, in CSS px, are one group pin. */
  readonly radiusPx: number;
  /** The selected teammate, whose pin always stands alone; or null. */
  readonly selectedId: string | null;
  /** The teammates of the selected group pin, who stay one group; or none. */
  readonly heldIds: readonly string[];
}

/** Pins drawn as one: anchored to a place, standing for one pin or more. */
export interface PinGroup {
  readonly anchor: PlacePoint;
  readonly pins: readonly PinView[];
}

/**
 * Groups the places that would cover each other (L2-013), greedily by on-screen distance:
 * the selected teammate's pin stands alone; the held group stays one; then, nearest the viewer
 * first, each place not yet grouped seeds a group and takes every other such place within the
 * radius. Neighbours are found in a grid of cells one radius wide, so the pass is linear in the
 * places. It reads no clock and no DOM: the same points and options give the same groups.
 */
export function groupPins(points: readonly PlacePoint[], options: GroupOptions): PinGroup[] {
  const groups: PinGroup[] = [];
  const held = new Set(options.heldIds);
  held.delete(options.selectedId ?? '');
  const heldPins = new Map<string, PinView>();
  let heldAnchor: PlacePoint | null = null;
  const remaining: PlacePoint[] = [];

  for (const point of points) {
    let pins = point.pins;
    const selected = pins.find((pin) => pin.teammateId === options.selectedId);
    if (selected) {
      groups.push({ anchor: point, pins: [selected] });
      pins = pins.filter((pin) => pin !== selected);
    }
    const inHeld = pins.filter((pin) => held.has(pin.teammateId));
    if (inHeld.length) {
      for (const pin of inHeld) heldPins.set(pin.teammateId, pin);
      if (inHeld.some((pin) => pin.teammateId === options.heldIds[0]) || !heldAnchor)
        heldAnchor = point;
      pins = pins.filter((pin) => !held.has(pin.teammateId));
    }
    if (pins.length) remaining.push(pins === point.pins ? point : { ...point, pins });
  }
  if (heldAnchor) {
    const pins = options.heldIds.flatMap((id) => heldPins.get(id) ?? []);
    groups.push({ anchor: heldAnchor, pins });
  }

  const radius = Math.max(options.radiusPx, 1);
  const cellOf = (value: number) => Math.floor(value / radius);
  const grid = new Map<string, PlacePoint[]>();
  for (const point of remaining) {
    const key = `${cellOf(point.x)},${cellOf(point.y)}`;
    const cell = grid.get(key);
    if (cell) cell.push(point);
    else grid.set(key, [point]);
  }
  const ordered = [...remaining].sort((a, b) => b.depth - a.depth || a.x - b.x || a.y - b.y);
  const taken = new Set<PlacePoint>();
  for (const seed of ordered) {
    if (taken.has(seed)) continue;
    taken.add(seed);
    const pins = [...seed.pins];
    const [cx, cy] = [cellOf(seed.x), cellOf(seed.y)];
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (const other of grid.get(`${cx + dx},${cy + dy}`) ?? []) {
          if (taken.has(other)) continue;
          if (Math.hypot(other.x - seed.x, other.y - seed.y) >= radius) continue;
          taken.add(other);
          pins.push(...other.pins);
        }
    groups.push({ anchor: seed, pins });
  }
  return groups;
}
