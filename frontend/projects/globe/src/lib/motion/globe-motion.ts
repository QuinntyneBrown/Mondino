/** Which way the globe faces: the longitude and the latitude at the centre of the view, in degrees. */
export interface GlobeOrientation {
  readonly longitude: number;
  readonly tilt: number;
}

export type MotionMode = 'TurningOnItsOwn' | 'Still';

/** How fast the globe turns on its own: a whole turn a minute (ADR 0013). */
export const TurnRateDegreesPerSecond = 6;

/** Puts a longitude between -180° and 180°. */
function wrapped(longitude: number): number {
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

/**
 * The rules of turning the globe (L2-009), and nothing else: no DOM, no renderer, no timer. It is
 * advanced by the time each frame took.
 */
export class GlobeMotion {
  private current: GlobeOrientation;
  private mode: MotionMode;
  private reducedMotion = false;

  /**
   * @param turnsOnItsOwn whether the globe turns by itself when left alone: only the Globe
   *   screen's interactive globe does (ADR 0013).
   */
  constructor(
    private readonly turnsOnItsOwn: boolean,
    starting: GlobeOrientation,
  ) {
    this.current = starting;
    this.mode = this.leftAlone();
  }

  get orientation(): GlobeOrientation {
    return this.current;
  }

  get motionMode(): MotionMode {
    return this.mode;
  }

  /** Moves the globe on by the time a frame took, and gives where it faces now. */
  advance(elapsedMs: number): GlobeOrientation {
    if (this.mode === 'TurningOnItsOwn') {
      const longitude = this.current.longitude - (TurnRateDegreesPerSecond * elapsedMs) / 1000;
      this.current = { ...this.current, longitude: wrapped(longitude) };
    }
    return this.current;
  }

  /** Follows the reduced motion setting: under it the globe never turns by itself. */
  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    if (this.mode === 'TurningOnItsOwn' || this.mode === 'Still') this.mode = this.leftAlone();
  }

  /** Whether the next frame is needed to move the globe on. */
  isMoving(): boolean {
    return this.mode === 'TurningOnItsOwn';
  }

  private leftAlone(): MotionMode {
    return this.turnsOnItsOwn && !this.reducedMotion ? 'TurningOnItsOwn' : 'Still';
  }
}
