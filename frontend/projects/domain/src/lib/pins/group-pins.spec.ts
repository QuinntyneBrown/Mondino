import type { PinView } from '@mondino/api';
import { groupPins, type PlacePoint } from './group-pins';

const pin = (id: string): PinView => ({
  teammateId: id,
  initials: id.toUpperCase(),
  colour: 'teammate-1',
  name: id,
  cityName: id,
  localTime: '15:05',
  status: 'working-hours',
  description: id,
  isViewer: false,
  isNew: false,
});

const place = (x: number, y: number, ids: string[], depth = 1): PlacePoint => ({
  position: { latitude: y, longitude: x },
  x,
  y,
  depth,
  pins: ids.map(pin),
});

const ids = (groups: ReturnType<typeof groupPins>) =>
  groups.map((group) => group.pins.map((each) => each.teammateId).join('+')).sort();

describe('groupPins', () => {
  const none = { radiusPx: 20, selectedId: null, heldIds: [] };

  it('keeps a pin with no other near it alone', () => {
    expect(ids(groupPins([place(0, 0, ['a']), place(100, 0, ['b'])], none))).toEqual(['a', 'b']);
  });

  it('draws two teammates in one city as one group pin', () => {
    expect(ids(groupPins([place(50, 50, ['sofia', 'luca'])], none))).toEqual(['sofia+luca']);
  });

  it('groups places closer than the radius', () => {
    expect(ids(groupPins([place(0, 0, ['a']), place(19, 0, ['b'])], none))).toEqual(['a+b']);
  });

  it('keeps places as far apart as the radius apart', () => {
    expect(ids(groupPins([place(0, 0, ['a']), place(20, 0, ['b'])], none))).toEqual(['a', 'b']);
  });

  it('anchors a group to the place nearest the viewer', () => {
    const [group] = groupPins([place(0, 0, ['rim'], 0.6), place(10, 0, ['front'], 1)], none);
    expect(group.anchor.pins[0].teammateId).toBe('front');
    expect(group.pins.map((each) => each.teammateId)).toEqual(['front', 'rim']);
  });

  it('lets the selected teammate’s pin stand alone, and keeps the rest of its place a group', () => {
    const groups = groupPins([place(50, 50, ['sofia', 'luca', 'marco'])], {
      ...none,
      selectedId: 'luca',
    });
    expect(ids(groups)).toEqual(['luca', 'sofia+marco']);
  });

  it('leaves one teammate as their own pin when the selected one is taken from a pair', () => {
    const groups = groupPins([place(50, 50, ['sofia', 'luca'])], { ...none, selectedId: 'luca' });
    expect(ids(groups)).toEqual(['luca', 'sofia']);
  });

  it('keeps a held group together, even where the places have drifted apart', () => {
    const groups = groupPins([place(0, 0, ['a']), place(60, 0, ['b']), place(200, 0, ['c'])], {
      ...none,
      heldIds: ['a', 'b'],
    });
    expect(ids(groups)).toEqual(['a+b', 'c']);
  });

  it('draws every teammate exactly once', () => {
    const points = Array.from({ length: 200 }, (_, index) =>
      place((index * 37) % 300, (index * 53) % 300, [`t${index}`, `u${index}`]),
    );
    const groups = groupPins(points, { radiusPx: 40, selectedId: 't7', heldIds: [] });
    const drawn = groups.flatMap((group) => group.pins.map((each) => each.teammateId));
    expect(drawn.length).toBe(400);
    expect(new Set(drawn).size).toBe(400);
  });

  it('leaves no two groups closer than the radius, so the pins drawn stay bounded', () => {
    const points = Array.from({ length: 500 }, (_, index) =>
      place((index * 37) % 300, (index * 53) % 300, [`t${index}`]),
    );
    const groups = groupPins(points, { radiusPx: 40, selectedId: null, heldIds: [] });
    for (const a of groups)
      for (const b of groups)
        if (a !== b)
          expect(
            Math.hypot(a.anchor.x - b.anchor.x, a.anchor.y - b.anchor.y),
          ).toBeGreaterThanOrEqual(40);
    expect(groups.length).toBeLessThan(100);
  });
});
