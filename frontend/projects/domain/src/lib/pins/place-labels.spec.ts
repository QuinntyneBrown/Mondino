import { placeLabels, WeatherLabelWidthPx, type LabelledPoint } from './place-labels';

const at = (x: number, y: number, labelled = true): LabelledPoint => ({
  x,
  y,
  labelled,
  markRadius: 13,
});

describe('placeLabels', () => {
  it('puts a label on the right where nothing is in the way', () => {
    expect(placeLabels([at(300, 300)], 600, false)).toEqual(['right']);
  });

  it('puts it on the left where another pin is on the right', () => {
    expect(placeLabels([at(300, 300), at(340, 300, false)], 600, false)[0]).toBe('left');
  });

  it('puts it below where pins are on both sides', () => {
    expect(
      placeLabels([at(300, 300), at(340, 300, false), at(260, 300, false)], 600, false)[0],
    ).toBe('below');
  });

  it('allows a label with weather its own width: it fits on the left where the time alone fits on the right', () => {
    expect(placeLabels([at(470, 300)], 600, false)).toEqual(['right']);
    expect(placeLabels([{ ...at(470, 300), widthPx: WeatherLabelWidthPx }], 600, false)).toEqual([
      'left',
    ]);
  });

  it('keeps it inside the globe: a pin at the right rim is labelled on the left', () => {
    expect(placeLabels([at(540, 300)], 600, false)).toEqual(['left']);
  });

  it('shows none where no side is clear', () => {
    const crowd = [
      at(300, 300),
      at(340, 300, false),
      at(260, 300, false),
      at(300, 340, false),
      at(300, 260, false),
    ];
    expect(placeLabels(crowd, 600, false)[0]).toBeNull();
  });

  it('shows none for a placement that carries no label at rest', () => {
    expect(placeLabels([at(300, 300, false)], 600, false)).toEqual([null]);
  });

  it('shows none on a compact globe', () => {
    expect(placeLabels([at(150, 150)], 320, true)).toEqual([null]);
  });
});
