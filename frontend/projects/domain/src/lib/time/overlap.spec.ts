// Traces to: L2-017
import {
  formatMinuteOfDay,
  formatOverlap,
  overlapBetween,
  workingDayOnViewerClock,
} from './overlap';

const now = Date.UTC(2025, 9, 27, 14, 5);
const milan = 'Europe/Rome';

describe('workingDayOnViewerClock, seen from Milan', () => {
  const cases: [string, number, number][] = [
    ['America/Mexico_City', 960, 60],
    ['Australia/Melbourne', 1380, 480],
    ['Asia/Kolkata', 270, 810],
    ['Europe/Berlin', 540, 1080],
  ];
  for (const [zone, startMinute, endMinute] of cases)
    it(`moves ${zone}'s working day to ${startMinute} to ${endMinute}`, () =>
      expect(workingDayOnViewerClock(now, zone, milan)).toEqual({ startMinute, endMinute }));
});

describe('overlapBetween, seen from Milan', () => {
  it('gives Mexico City 16:00 to 18:00, two hours', () =>
    expect(overlapBetween(now, 'America/Mexico_City', milan)).toEqual({
      startMinute: 960,
      endMinute: 1080,
      lengthMinutes: 120,
    }));

  it('gives Melbourne none', () =>
    expect(overlapBetween(now, 'Australia/Melbourne', milan)).toBeNull());

  it('gives the same time zone the whole working day', () =>
    expect(overlapBetween(now, 'Europe/Berlin', milan)).toEqual({
      startMinute: 540,
      endMinute: 1080,
      lengthMinutes: 540,
    }));

  it('gives Bengaluru 09:00 to 13:30', () =>
    expect(overlapBetween(now, 'Asia/Kolkata', milan)).toEqual({
      startMinute: 540,
      endMinute: 810,
      lengthMinutes: 270,
    }));

  it('finds a working day that falls on the viewer’s next day', () =>
    // Seen from Honolulu (UTC−10), Tokyo's 09:00 to 18:00 is 14:00 to 23:00 the day before.
    expect(overlapBetween(now, 'Asia/Tokyo', 'Pacific/Honolulu')).toEqual({
      startMinute: 840,
      endMinute: 1080,
      lengthMinutes: 240,
    }));

  it('moves with a daylight-saving change on one side', () => {
    const before = Date.UTC(2025, 9, 26, 0, 59);
    expect(overlapBetween(before, 'America/Mexico_City', milan)?.startMinute).toBe(1020);
    expect(overlapBetween(before + 60_000, 'America/Mexico_City', milan)?.startMinute).toBe(960);
  });
});

describe('formatMinuteOfDay', () => {
  const cases: [number, string, string][] = [
    [960, '16:00', '4 pm'],
    [1080, '18:00', '6 pm'],
    [810, '13:30', '1:30 pm'],
    [0, '00:00', '12 am'],
    [720, '12:00', '12 pm'],
    [545, '09:05', '9:05 am'],
  ];
  for (const [minute, h24, h12] of cases)
    it(`gives minute ${minute} as ${h24} and ${h12}`, () => {
      expect(formatMinuteOfDay(minute, '24-hour')).toBe(h24);
      expect(formatMinuteOfDay(minute, '12-hour')).toBe(h12);
    });
});

describe('formatOverlap', () => {
  const tomas = workingDayOnViewerClock(now, 'America/Mexico_City', milan);
  const noah = workingDayOnViewerClock(now, 'Australia/Melbourne', milan);

  it('gives Tomás’s overlap as the mock does, on both clocks', () => {
    const overlap = overlapBetween(now, 'America/Mexico_City', milan);
    expect(formatOverlap(overlap, tomas, 'Tomás', '24-hour')).toEqual({
      figure: '16:00–18:00 your time',
      sentence: 'You and Tomás share 2 hours of working hours: 16:00 to 18:00 on your clock.',
    });
    expect(formatOverlap(overlap, tomas, 'Tomás', '12-hour')).toEqual({
      figure: '4 pm–6 pm your time',
      sentence: 'You and Tomás share 2 hours of working hours: 4 pm to 6 pm on your clock.',
    });
  });

  it('gives none and Noah’s working day on the viewer’s clock', () =>
    expect(formatOverlap(null, noah, 'Noah', '24-hour')).toEqual({
      figure: 'None today',
      sentence:
        'You and Noah share no working hours. Noah’s working day is 23:00 to 08:00 on your clock.',
    }));

  const lengths: [number, string][] = [
    [60, '1 hour'],
    [30, '30 minutes'],
    [270, '4 hours 30 minutes'],
    [90, '1 hour 30 minutes'],
  ];
  for (const [lengthMinutes, words] of lengths)
    it(`gives ${lengthMinutes} minutes as "${words}"`, () =>
      expect(
        formatOverlap(
          { startMinute: 540, endMinute: 540 + lengthMinutes, lengthMinutes },
          tomas,
          'Priya',
          '24-hour',
        ).sentence,
      ).toContain(`share ${words} of working hours`));
});
