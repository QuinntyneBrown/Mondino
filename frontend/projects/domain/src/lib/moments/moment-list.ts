import type { DatedMoment, Moment, MomentGroups, Pin } from '@mondino/api';
import { firstName } from '../pins/first-name';
import { initialsOf } from '../pins/initials';
import { orderWestToEast } from '../pins/west-to-east';
import { daysUntil, KIND_NAMES } from './moment-days';

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The furthest ahead the Moments screen lists a moment (L2-029). */
export const MomentsAhead = 90;

/** How far ahead a moment is, as Moments says it: "Today", "Tomorrow", "In 13 days" (L2-029). */
export function daysAheadLabel(daysAhead: number): string {
  if (daysAhead === 0) return 'Today';
  if (daysAhead === 1) return 'Tomorrow';
  return `In ${daysAhead} days`;
}

function datedOf(moment: Moment, pin: Pin, daysAhead: number): DatedMoment {
  const [year, month, day] = moment.date.split('-').map(Number);
  const first = firstName(moment.teammateName);
  return {
    key: `${moment.teammateId}|${moment.date}|${moment.kind}|${moment.title}`,
    teammateId: moment.teammateId,
    kind: moment.kind,
    kindName: KIND_NAMES[moment.kind] ?? 'Local event',
    title: moment.title,
    detail: moment.detail,
    cityName: moment.cityName,
    when: daysAheadLabel(daysAhead),
    weekday: weekdays[new Date(Date.UTC(year, month - 1, day)).getUTCDay()],
    day,
    month: months[month - 1],
    firstName: first,
    initials: initialsOf(pin.name),
    colour: pin.colour,
    who: `${first} · ${moment.cityName}`,
  };
}

/**
 * The Moments screen's groups (L2-029): each moment's days ahead counted from today in its own
 * place, today's (0), this week's (1 to 7) and later (8 to 90), each in date order and on one date
 * west to east, as the Team screen orders the pins. A moment before today, past 90 days, or of
 * someone no longer on the team is left out.
 */
export function groupMoments(
  moments: readonly Moment[],
  pins: readonly Pin[],
  now: number,
): MomentGroups {
  const order = new Map(
    orderWestToEast(pins, now).map((pin, index) => [pin.teammateId, { pin, index }]),
  );
  const listed = moments
    .flatMap((moment) => {
      const teammate = order.get(moment.teammateId);
      if (!teammate) return [];
      const days = daysUntil(moment.date, moment.timeZoneId, now);
      return days >= 0 && days <= MomentsAhead ? [{ moment, days, ...teammate }] : [];
    })
    .sort(
      (a, b) =>
        a.moment.date.localeCompare(b.moment.date) ||
        a.index - b.index ||
        a.moment.title.localeCompare(b.moment.title),
    )
    .map(({ moment, days, pin }) => ({ days, dated: datedOf(moment, pin, days) }));
  return {
    today: listed.filter(({ days }) => days === 0).map(({ dated }) => dated),
    thisWeek: listed.filter(({ days }) => days >= 1 && days <= 7).map(({ dated }) => dated),
    later: listed.filter(({ days }) => days >= 8).map(({ dated }) => dated),
  };
}
