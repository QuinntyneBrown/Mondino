import type { MomentGroups, MomentWindowView } from '@mondino/api';

/** The most moments the Moments screen holds in the page at once (ADR 0021, L2-047). */
export const MomentWindowSize = 60;
/** How many moments the window keeps above the first the viewport shows, once it moves. */
export const MomentWindowStep = 20;

/** How many moments the groups hold, today's, this week's and later's. */
export function countMoments(groups: MomentGroups): number {
  return groups.today.length + groups.thisWeek.length + groups.later.length;
}

/**
 * The moments held in the page (ADR 0021): every one up to 60, and past 60 the 60 from `start`,
 * never past the end, with how many are left out before and after them.
 */
export function momentWindow(total: number, start: number): MomentWindowView {
  if (total <= MomentWindowSize) return { from: 0, to: total, before: 0, after: 0 };
  const from = Math.min(Math.max(start, 0), total - MomentWindowSize);
  const to = from + MomentWindowSize;
  return { from, to, before: from, after: total - to };
}

/**
 * Where the window starts for the moments the viewport shows, `first` to `last` (ADR 0021). While
 * they are 10 or more moments inside the window it stays; once either end comes nearer, and there
 * are moments beyond it, the window starts 20 moments above the first shown.
 */
export function followWindow(total: number, start: number, first: number, last: number): number {
  const view = momentWindow(total, start);
  const margin = MomentWindowStep / 2;
  const nearTop = view.before > 0 && first < view.from + margin;
  const nearBottom = view.after > 0 && last > view.to - margin;
  return nearTop || nearBottom ? momentWindow(total, first - MomentWindowStep).from : view.from;
}

/** The groups cut to the window: each keeps the moments of it that fall inside. */
export function windowGroups(groups: MomentGroups, view: MomentWindowView): MomentGroups {
  const cut = <T>(list: readonly T[], offset: number) =>
    list.slice(Math.max(view.from - offset, 0), Math.max(view.to - offset, 0));
  const week = groups.today.length;
  const later = week + groups.thisWeek.length;
  return {
    today: cut(groups.today, 0),
    thisWeek: cut(groups.thisWeek, week),
    later: cut(groups.later, later),
  };
}
