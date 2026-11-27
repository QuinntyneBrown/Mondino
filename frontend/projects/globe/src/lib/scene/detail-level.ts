import type { DetailStep } from './globe-scene';

/** Under this many frames a second, the device is too slow for the step it draws at (L2-046). */
export const LowFrameRate = 30;
/** How long the frame rate must stay under `LowFrameRate` before the detail steps down (ADR 0030). */
export const SustainedMs = 3000;

/**
 * Which detail step the globe is drawn at (L2-046, ADR 0030): the finest first, and the next
 * lower one each time frames that follow one another stay under 30 a second for 3 seconds. A
 * window at 30 or more is the frame rate recovered, and the level holds; it never steps back up,
 * so a device that cannot hold 30 does not go up and down. No DOM, no renderer, no timer: it is
 * told how long each frame took.
 */
export class DetailLevel {
  private index = 0;
  private windowMs = 0;
  private frames = 0;

  constructor(private readonly steps: readonly DetailStep[]) {}

  get current(): DetailStep {
    return this.steps[this.index];
  }

  /**
   * Records one frame, `elapsedMs` after the one before it (0 for the first frame after a rest),
   * and returns the step to draw at when the level has just moved, or null.
   */
  record(elapsedMs: number): DetailStep | null {
    if (elapsedMs <= 0) {
      this.windowMs = 0;
      this.frames = 0;
      return null;
    }
    this.windowMs += elapsedMs;
    this.frames++;
    if (this.windowMs < SustainedMs) return null;
    // Within a millionth of a frame, so frames of exactly 1/30 s added up are not under 30.
    const slow = (this.frames * 1000) / this.windowMs < LowFrameRate - 1e-6;
    this.windowMs = 0;
    this.frames = 0;
    if (!slow || this.index === this.steps.length - 1) return null;
    this.index++;
    return this.current;
  }
}
