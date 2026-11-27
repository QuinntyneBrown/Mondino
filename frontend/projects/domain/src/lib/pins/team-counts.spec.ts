// Traces to: L2-025, L2-015
import { cast } from './cast.testing';
import { countsWords, teamCounts } from './team-counts';

const now = Date.UTC(2025, 9, 27, 14, 5);

describe('teamCounts', () => {
  it('reads the cast as the mock does: 13 teammates, 12 time zones, 8 working, 2 asleep', () => {
    const counts = teamCounts(cast, now);
    expect(counts).toEqual({ teammates: 13, timeZones: 12, working: 8, asleep: 2 });
    expect(countsWords(counts)).toEqual({
      title: '13 teammates',
      line: '12 time zones · 8 working · 2 asleep',
    });
  });

  it('changes when an hour changes a status: at 15:00 UTC Tomás starts work', () =>
    expect(teamCounts(cast, Date.UTC(2025, 9, 27, 15, 0)).working).toBe(9));

  it('counts a teammate who does not share their status as a teammate and a time zone only', () =>
    expect(
      teamCounts(
        cast.map((each) =>
          ['Lena Fischer', 'Aiko Tanaka'].includes(each.name)
            ? { ...each, sharesStatus: false }
            : each,
        ),
        now,
      ),
    ).toEqual({ teammates: 13, timeZones: 12, working: 7, asleep: 1 }));

  it('speaks of one teammate and one time zone in the singular', () =>
    expect(countsWords({ teammates: 1, timeZones: 1, working: 1, asleep: 0 })).toEqual({
      title: '1 teammate',
      line: '1 time zone · 1 working · 0 asleep',
    }));
});
