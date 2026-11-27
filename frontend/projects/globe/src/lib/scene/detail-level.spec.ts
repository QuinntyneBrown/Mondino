import { DetailLevel, LowFrameRate, SustainedMs } from './detail-level';
import { detailSteps } from './globe-scene';

/** Records `seconds` of frames at `fps`, after a rest, and returns every step the level moved to. */
function run(level: DetailLevel, fps: number, seconds: number): string[] {
  const moves: string[] = [];
  const record = (elapsedMs: number) => {
    const next = level.record(elapsedMs);
    if (next) moves.push(next.modelDetail);
  };
  record(0);
  for (let frame = 0; frame < fps * seconds; frame++) record(1000 / fps);
  return moves;
}

describe('DetailLevel: stepping down on a slow device', () => {
  const steps = detailSteps(2);

  it('starts at the finest step', () => {
    expect(new DetailLevel(steps).current).toEqual({ pixelRatio: 2, modelDetail: 'High' });
  });

  it('steps down to the next lower step after 3 seconds under 30 frames a second', () => {
    const level = new DetailLevel(steps);
    expect(run(level, 20, SustainedMs / 1000 - 0.5)).toEqual([]);
    expect(level.current.modelDetail).toBe('High');
    expect(run(level, 20, SustainedMs / 1000 + 0.5)).toEqual(['Low']);
    expect(level.current).toEqual({ pixelRatio: 1, modelDetail: 'Low' });
  });

  it('keeps the finest step at 30 frames a second or more', () => {
    const level = new DetailLevel(steps);
    expect(run(level, LowFrameRate, 10)).toEqual([]);
    expect(run(level, 60, 10)).toEqual([]);
    expect(level.current.modelDetail).toBe('High');
  });

  it('does not count a frame after a rest: a globe that turns now and then is not slow', () => {
    const level = new DetailLevel(steps);
    // Two seconds of slow frames, a rest, and two more: never three seconds in a row.
    expect(run(level, 20, 2)).toEqual([]);
    expect(run(level, 20, 2)).toEqual([]);
    expect(level.current.modelDetail).toBe('High');
  });

  it('stays at the lowest step, and once the frame rate recovers it holds where it is', () => {
    const level = new DetailLevel(steps);
    expect(run(level, 10, 4)).toEqual(['Low']);
    expect(run(level, 10, 10)).toEqual([]);
    expect(run(level, 60, 10)).toEqual([]);
    expect(level.current.modelDetail).toBe('Low');
  });
});
