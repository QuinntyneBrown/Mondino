// Traces to: L2-029, L2-020
import { ALL_MOMENT_KINDS, type Moment, type MomentKind } from '@mondino/api';
import { cast, pin } from '../pins/cast.testing';
import { daysAheadLabel, groupMoments, noMomentsOf } from './moment-list';

/** The mocks' "now": 14:05 UTC on Monday 27 October 2025. */
const now = Date.UTC(2025, 9, 27, 14, 5);

const moment = (
  teammate: string,
  timeZoneId: string,
  kind: MomentKind,
  date: string,
  title: string,
  cityName = teammate,
): Moment => ({
  teammateId: teammate,
  teammateName: teammate,
  cityName,
  countryCode: '',
  timeZoneId,
  kind,
  title,
  date,
  detail: `${title}'s detail`,
  emblemKey: null,
});

const titles = (dated: readonly { title: string; when: string }[]) =>
  dated.map(({ title, when }) => `${when} ${title}`);

describe('daysAheadLabel', () => {
  it('says today, tomorrow, and how many days ahead however far', () => {
    expect([0, 1, 3, 7, 13, 90].map(daysAheadLabel)).toEqual([
      'Today',
      'Tomorrow',
      'In 3 days',
      'In 7 days',
      'In 13 days',
      'In 90 days',
    ]);
  });
});

describe('noMomentsOf', () => {
  it('names each kind in its own note (L2-030 criterion 3)', () => {
    expect(ALL_MOMENT_KINDS.map(noMomentsOf)).toEqual([
      'No holiday moments coming up',
      'No Formula 1 moments coming up',
      'No local event moments coming up',
      'No sport moments coming up',
    ]);
  });
});

describe('groupMoments', () => {
  it('puts today’s first, then 1 to 7 days ahead, then 8 to 90 (L2-029 criterion 1)', () => {
    const groups = groupMoments(
      [
        moment('Jordan Lee', 'America/Chicago', 'local-event', '2025-11-12', 'Later'),
        moment('Liam O’Connor', 'Europe/Dublin', 'holiday', '2025-10-27', 'Today', 'Dublin'),
        moment('Jordan Lee', 'America/Chicago', 'local-event', '2025-10-31', 'On the 31st'),
        moment('Jordan Lee', 'America/Chicago', 'local-event', '2025-11-01', 'On the 1st'),
      ],
      cast,
      now,
    );
    expect(titles(groups.today)).toEqual(['Today Today']);
    expect(titles(groups.thisWeek)).toEqual(['In 4 days On the 31st', 'In 5 days On the 1st']);
    expect(titles(groups.later)).toEqual(['In 16 days Later']);
  });

  it('leaves out yesterday and 91 days ahead, and keeps the 90th day (criteria 2 and 3)', () => {
    const at = (date: string) => moment('Luca Ferri', 'Europe/Rome', 'sport', date, date);
    const groups = groupMoments([at('2025-10-26'), at('2026-01-25'), at('2026-01-26')], cast, now);
    expect(groups.today).toEqual([]);
    expect(groups.thisWeek).toEqual([]);
    expect(titles(groups.later)).toEqual(['In 90 days 2026-01-25']);
  });

  it('counts today in the moment’s own place', () => {
    // 01:05 on 28 October in Melbourne: 27 October there has passed, and 4 November is 7 days off
    const groups = groupMoments(
      [
        moment('Noah Williams', 'Australia/Melbourne', 'holiday', '2025-10-27', 'Gone'),
        moment('Noah Williams', 'Australia/Melbourne', 'sport', '2025-11-04', 'Cup'),
        moment('Luca Ferri', 'Europe/Rome', 'sport', '2025-11-04', 'Derby'),
      ],
      cast,
      now,
    );
    expect(titles(groups.thisWeek)).toEqual(['In 7 days Cup']);
    expect(titles(groups.later)).toEqual(['In 8 days Derby']);
  });

  it('lists one date west to east, however the moments arrive (criterion 8)', () => {
    const groups = groupMoments(
      [
        moment('Priya Raman', 'Asia/Kolkata', 'holiday', '2025-11-01', 'Bengaluru'),
        moment('Mara Lindqvist', 'Europe/Stockholm', 'holiday', '2025-11-01', 'Stockholm'),
        moment('Tomás Herrera', 'America/Mexico_City', 'holiday', '2025-11-01', 'Mexico City'),
      ],
      cast,
      now,
    );
    expect(groups.thisWeek.map(({ title }) => title)).toEqual([
      'Mexico City',
      'Stockholm',
      'Bengaluru',
    ]);
  });

  it('gives each moment its day and names its teammate by first name and city (criterion 9)', () => {
    const jordan = pin('Jordan Lee', 'America/Chicago', -97.74, { colour: 'teammate-12' });
    const [dated] = groupMoments(
      [moment('Jordan Lee', 'America/Chicago', 'local-event', '2025-10-31', 'Halloween', 'Austin')],
      [jordan],
      now,
    ).thisWeek;
    expect(dated).toMatchObject({
      kind: 'local-event',
      kindName: 'Local event',
      when: 'In 4 days',
      weekday: 'Fri',
      day: 31,
      month: 'Oct',
      firstName: 'Jordan',
      initials: 'JL',
      colour: 'teammate-12',
      who: 'Jordan · Austin',
    });
  });

  it('lists both of a teammate’s moments, each naming them (criterion 10)', () => {
    const groups = groupMoments(
      [
        moment('Tomás Herrera', 'America/Mexico_City', 'sport', '2025-11-02', 'Clásico Nacional'),
        moment('Tomás Herrera', 'America/Mexico_City', 'holiday', '2025-11-01', 'Día de Muertos'),
      ],
      cast,
      now,
    );
    expect(
      groups.thisWeek.map(({ title, kindName, when, firstName }) => [
        title,
        kindName,
        when,
        firstName,
      ]),
    ).toEqual([
      ['Día de Muertos', 'Holiday', 'In 5 days', 'Tomás'],
      ['Clásico Nacional', 'Sport', 'In 6 days', 'Tomás'],
    ]);
  });

  it('leaves out a moment of someone no longer on the team', () => {
    const groups = groupMoments(
      [moment('Someone Gone', 'Europe/Rome', 'holiday', '2025-10-30', 'Theirs')],
      cast,
      now,
    );
    expect(groups.thisWeek).toEqual([]);
  });
});
