// Traces to: L2-024, L2-026
import { cast, pin } from './cast.testing';
import { orderWestToEast } from './west-to-east';
import { workingNow } from './working-now';

const now = Date.UTC(2025, 9, 27, 14, 5);

describe('orderWestToEast', () => {
  it('orders by the zone’s offset from UTC, then longitude: Mexico City, Austin, São Paulo, Dublin, Milan, Tokyo', () =>
    expect(
      orderWestToEast(
        cast.filter((each) =>
          [
            'Aiko Tanaka',
            'Sofia Bianchi',
            'Jordan Lee',
            'Liam O’Connor',
            'Tomás Herrera',
            'Chloé Martin',
          ].includes(each.name),
        ),
        now,
      ).map((each) => each.timeZoneId),
    ).toEqual([
      'America/Mexico_City',
      'America/Chicago',
      'America/Sao_Paulo',
      'Europe/Dublin',
      'Europe/Rome',
      'Asia/Tokyo',
    ]));
});

describe('workingNow', () => {
  it('lists the first six by local hour, then west to east, as the default mock does, and counts 2 more', () => {
    const working = workingNow(cast, now, '24-hour', 6);
    expect(working.count).toBe(8);
    expect(working.more).toBe(2);
    expect(working.teammates.map((each) => [each.name, each.cityName, each.localTime])).toEqual([
      ['Jordan Lee', 'Jordan Lee', '09:05'],
      ['Chloé Martin', 'Chloé Martin', '11:05'],
      ['Liam O’Connor', 'Liam O’Connor', '14:05'],
      ['Kwame Mensah', 'Kwame Mensah', '14:05'],
      ['Luca Ferri', 'Luca Ferri', '15:05'],
      ['Sofia Bianchi', 'Sofia Bianchi', '15:05'],
    ]);
    expect(working.teammates[5]).toEqual(
      expect.objectContaining({ initials: 'SB', isViewer: true }),
    );
  });

  it('lists all when six or fewer are working, with none more', () => {
    const working = workingNow(cast.slice(0, 5), now, '24-hour', 6);
    expect(working.count).toBe(4);
    expect(working.teammates.length).toBe(4);
    expect(working.more).toBe(0);
  });

  it('gives the local time on a 12-hour clock', () =>
    expect(workingNow(cast, now, '12-hour', 1).teammates[0].localTime).toBe('9:05 am'));

  it('leaves out a teammate who does not share their status', () => {
    const working = workingNow(
      cast.map((each) => (each.name === 'Jordan Lee' ? { ...each, sharesStatus: false } : each)),
      now,
      '24-hour',
      6,
    );
    expect(working.count).toBe(7);
    expect(working.teammates.map((each) => each.name)).not.toContain('Jordan Lee');
  });

  it('has nobody at 23:30 in Milan for Sofia, Mara and Liam', () =>
    expect(
      workingNow(
        [
          pin('Sofia Bianchi', 'Europe/Rome', 9.19),
          pin('Mara', 'Europe/Stockholm', 18),
          pin('Liam', 'Europe/Dublin', -6),
        ],
        Date.UTC(2025, 9, 27, 22, 30),
        '24-hour',
        6,
      ),
    ).toEqual({ count: 0, teammates: [], more: 0 }));
});
