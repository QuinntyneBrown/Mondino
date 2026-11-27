import type { Moment, MomentKind, MomentView, Pin, WeekMoment } from '@mondino/api';
import { localTime } from '../time/local-time';
import { firstName } from '../pins/first-name';
import { orderWestToEast } from '../pins/west-to-east';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayMs = 86_400_000;

/** How each kind is named in words (L2-020). */
export const KIND_NAMES: Record<MomentKind, string> = {
  holiday: 'Holiday',
  'formula-1': 'Formula 1',
  'local-event': 'Local event',
  sport: 'Sport',
};

/** A calendar date, "2025-11-01", as a day count: two of them subtract to whole days. */
function dayNumber(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / dayMs;
}

/**
 * How many days from today in `timeZoneId` at `now` to `date` (L2-020): 0 on the day, negative once
 * it has passed there. Today is the date in the moment's own place, so Melbourne's 4 November is 7
 * days off while it is already 28 October there.
 */
export function daysUntil(date: string, timeZoneId: string, now: number): number {
  return dayNumber(date) - dayNumber(localTime(now, timeZoneId).date);
}

/** When a moment is, in words: "Today", "Tomorrow", "In 5 days" up to a week, then "9 Nov". */
export function whenLabel(date: string, daysAhead: number): string {
  if (daysAhead === 0) return 'Today';
  if (daysAhead === 1) return 'Tomorrow';
  if (daysAhead <= 7) return `In ${daysAhead} days`;
  const [, month, day] = date.split('-').map(Number);
  return `${day} ${months[month - 1]}`;
}

function viewOf(moment: Moment, daysAhead: number): MomentView {
  return {
    teammateId: moment.teammateId,
    kind: moment.kind,
    kindName: KIND_NAMES[moment.kind] ?? 'Local event',
    title: moment.title,
    detail: moment.detail,
    when: whenLabel(moment.date, daysAhead),
    today: daysAhead === 0,
  };
}

/** A teammate's moments from today on, in date order, as their panel lists them (L2-023). */
export function upcomingMoments(
  moments: readonly Moment[],
  teammateId: string,
  now: number,
): MomentView[] {
  return moments
    .filter((moment) => moment.teammateId === teammateId)
    .map((moment) => ({ moment, days: daysUntil(moment.date, moment.timeZoneId, now) }))
    .filter(({ days }) => days >= 0)
    .sort((a, b) => a.days - b.days)
    .map(({ moment, days }) => viewOf(moment, days));
}

/** A teammate's next moment, Team's "Coming up" (L2-026); null when there is none. */
export function nextMoment(
  moments: readonly Moment[],
  teammateId: string,
  now: number,
): MomentView | null {
  return upcomingMoments(moments, teammateId, now)[0] ?? null;
}

/**
 * "This week around the world" (L2-024): the moments of the teammates on the globe from today to 7
 * days ahead in each moment's own place, soonest first and the same day west to east, `limit` at
 * most. A moment of someone no longer on the team is left out.
 */
export function weekMoments(
  moments: readonly Moment[],
  pins: readonly Pin[],
  now: number,
  limit = 6,
): WeekMoment[] {
  const order = new Map(orderWestToEast(pins, now).map((pin, index) => [pin.teammateId, index]));
  return moments
    .filter((moment) => order.has(moment.teammateId))
    .map((moment) => ({ moment, days: daysUntil(moment.date, moment.timeZoneId, now) }))
    .filter(({ days }) => days >= 0 && days <= 7)
    .sort(
      (a, b) =>
        a.days - b.days ||
        (order.get(a.moment.teammateId) ?? 0) - (order.get(b.moment.teammateId) ?? 0),
    )
    .slice(0, limit)
    .map(({ moment, days }) => ({
      ...viewOf(moment, days),
      who: `${firstName(moment.teammateName)} · ${moment.cityName}`,
    }));
}
