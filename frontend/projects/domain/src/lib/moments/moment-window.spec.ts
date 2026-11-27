// Traces to: L2-047
import type { DatedMoment, MomentGroups } from '@mondino/api';
import { countMoments, followWindow, momentWindow, windowGroups } from './moment-window';

const named = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => ({ key: `${prefix}${index}` }) as DatedMoment);
const keys = (groups: MomentGroups) => ({
  today: groups.today.map(({ key }) => key),
  thisWeek: groups.thisWeek.map(({ key }) => key),
  later: groups.later.map(({ key }) => key),
});

describe('momentWindow', () => {
  it('holds every moment up to 60', () => {
    expect(momentWindow(15, 0)).toEqual({ from: 0, to: 15, before: 0, after: 0 });
    expect(momentWindow(60, 20)).toEqual({ from: 0, to: 60, before: 0, after: 0 });
  });

  it('holds 60 from where it starts past 60, never past either end', () => {
    expect(momentWindow(1500, 0)).toEqual({ from: 0, to: 60, before: 0, after: 1440 });
    expect(momentWindow(1500, 100)).toEqual({ from: 100, to: 160, before: 100, after: 1340 });
    expect(momentWindow(1500, 1480)).toEqual({ from: 1440, to: 1500, before: 1440, after: 0 });
    expect(momentWindow(1500, -20)).toEqual({ from: 0, to: 60, before: 0, after: 1440 });
  });
});

describe('followWindow', () => {
  it('stays while the moments shown are well inside it', () => {
    expect(followWindow(1500, 0, 0, 8)).toBe(0);
    expect(followWindow(1500, 100, 115, 140)).toBe(100);
  });

  it('starts 20 above the first shown once either end comes within 10', () => {
    expect(followWindow(1500, 0, 45, 52)).toBe(25);
    expect(followWindow(1500, 100, 105, 112)).toBe(85);
    expect(followWindow(1500, 0, 900, 908)).toBe(880);
  });

  it('never moves past either end, nor for a list it holds whole', () => {
    expect(followWindow(1500, 20, 5, 12)).toBe(0);
    expect(followWindow(1500, 1440, 1490, 1499)).toBe(1440);
    expect(followWindow(1500, 0, 0, 3)).toBe(0);
    expect(followWindow(40, 0, 30, 39)).toBe(0);
  });
});

describe('windowGroups', () => {
  const groups = { today: named('t', 2), thisWeek: named('w', 30), later: named('l', 100) };

  it('counts the moments of all three groups', () => {
    expect(countMoments(groups)).toBe(132);
  });

  it('keeps each group’s moments inside the window, across the groups', () => {
    expect(keys(windowGroups(groups, momentWindow(132, 0)))).toEqual({
      today: ['t0', 't1'],
      thisWeek: named('w', 30).map(({ key }) => key),
      later: named('l', 28).map(({ key }) => key),
    });
    const middle = keys(windowGroups(groups, momentWindow(132, 20)));
    expect(middle.today).toEqual([]);
    expect(middle.thisWeek[0]).toBe('w18');
    expect(middle.thisWeek.length + middle.later.length).toBe(60);
    expect(middle.later.at(-1)).toBe('l47');
    const end = keys(windowGroups(groups, momentWindow(132, 132)));
    expect(end.thisWeek).toEqual([]);
    expect(end.later).toEqual(
      named('l', 100)
        .slice(40)
        .map(({ key }) => key),
    );
  });
});
