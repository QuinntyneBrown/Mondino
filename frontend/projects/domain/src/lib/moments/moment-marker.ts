import type { MarkerView, Moment, MomentKind } from '@mondino/api';
import { daysUntil, whenLabel } from './moment-days';

/** The moments of the kinds the viewer chose (L2-022), in their order. */
export function ofKinds(moments: readonly Moment[], kinds: readonly MomentKind[]): Moment[] {
  return moments.filter((moment) => kinds.includes(moment.kind));
}

/** "In 5 days" as a sentence carries it: "in 5 days". */
const spokenWhen = (when: string) => when.charAt(0).toLowerCase() + when.slice(1);

/**
 * A teammate's moment marker (L2-021, L2-022): of their `moments`, those of the chosen `kinds` dated
 * today to 7 days ahead in each moment's own place, nearest first and the same day by title; null
 * with none. Mondino holds no emblem (ADR 0019), so one moment is shown by its kind's icon.
 */
export function markerFor(
  moments: readonly Moment[],
  kinds: readonly MomentKind[],
  now: number,
): MarkerView | null {
  const week = ofKinds(moments, kinds)
    .map((moment) => ({ moment, days: daysUntil(moment.date, moment.timeZoneId, now) }))
    .filter(({ days }) => days >= 0 && days <= 7)
    .sort((a, b) => a.days - b.days || a.moment.title.localeCompare(b.moment.title))
    .map(({ moment, days }) => ({ moment, when: whenLabel(moment.date, days), days }));
  const [nearest] = week;
  if (!nearest) return null;
  const said = week.map(({ moment, when }) => `${moment.title}, ${spokenWhen(when)}`);
  return {
    kind: nearest.moment.kind,
    title: nearest.moment.title,
    when: nearest.when,
    count: week.length,
    today: nearest.days === 0,
    spoken: week.length === 1 ? said[0] : `${week.length} moments this week: ${said.join('; ')}`,
  };
}
