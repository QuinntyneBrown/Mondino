// Traces to: L2-017
import { barParts } from './bar-parts';

describe('barParts', () => {
  it('draws Tomás’s day past midnight in two parts, the shared part and now, as the mock does', () =>
    expect(
      barParts(
        { startMinute: 960, endMinute: 1080, lengthMinutes: 120 },
        { startMinute: 960, endMinute: 60 },
        905,
      ),
    ).toEqual({
      theirs: [
        { from: 66.67, span: 33.33 },
        { from: 0, span: 4.17 },
      ],
      both: { from: 66.67, span: 8.33 },
      you: { from: 37.5, span: 37.5 },
      now: 62.85,
    }));

  it('draws Noah’s day and no shared part', () =>
    expect(barParts(null, { startMinute: 1380, endMinute: 480 }, 905)).toEqual({
      theirs: [
        { from: 95.83, span: 4.17 },
        { from: 0, span: 33.33 },
      ],
      both: null,
      you: { from: 37.5, span: 37.5 },
      now: 62.85,
    }));

  it('draws a day within the viewer’s in one part', () =>
    expect(barParts(null, { startMinute: 270, endMinute: 810 }, 0).theirs).toEqual([
      { from: 18.75, span: 37.5 },
    ]));

  it('draws a day that ends at midnight in one part', () =>
    expect(barParts(null, { startMinute: 900, endMinute: 0 }, 0).theirs).toEqual([
      { from: 62.5, span: 37.5 },
    ]));
});
