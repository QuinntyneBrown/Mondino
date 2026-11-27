/** Which way the globe faces: the longitude and the latitude at the centre of the view, in degrees. */
export interface GlobeOrientation {
  readonly longitude: number;
  readonly tilt: number;
}

/** Which way an arrow key turns the globe's front. */
export type ArrowDirection = 'Left' | 'Right' | 'Up' | 'Down';

/** A step's turn, as a drag the same way would make it: longitude and tilt, in steps. */
const stepTurns: Record<ArrowDirection, readonly [number, number]> = {
  Left: [1, 0],
  Right: [-1, 0],
  Up: [0, -1],
  Down: [0, 1],
};

export type MotionMode = 'TurningOnItsOwn' | 'Dragged' | 'Waiting' | 'Still';

/** How fast the globe turns on its own: a whole turn a minute (ADR 0013). */
export const TurnRateDegreesPerSecond = 6;
/** How long the globe rests after a drag before it turns on its own again (L2-009). */
export const IdleDelayMs = 5000;
/** How far one press of an arrow key turns the globe: one time zone (ADR 0013). */
export const StepDegrees = 15;
/** How far from the equator the centre of the view may tilt, so a pole never passes it. */
export const TiltLimitDegrees = 60;

const clampedTilt = (tilt: number) => Math.max(-TiltLimitDegrees, Math.min(TiltLimitDegrees, tilt));

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
  /** Frame time waited since the last interaction. */
  private waitedMs = 0;

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
    } else if (this.mode === 'Waiting') {
      this.waitedMs += elapsedMs;
      if (this.waitedMs >= IdleDelayMs) this.mode = this.leftAlone();
    }
    return this.current;
  }

  /** A drag begins: the globe stops turning by itself and follows the drag. */
  dragStart(): void {
    this.mode = 'Dragged';
  }

  /** Whether the globe can turn by this much, or is already tilted as far as it goes that way. */
  canTurn(deltaLongitude: number, deltaTilt: number): boolean {
    if (deltaLongitude !== 0) return true;
    if (deltaTilt > 0) return this.current.tilt < TiltLimitDegrees;
    if (deltaTilt < 0) return this.current.tilt > -TiltLimitDegrees;
    return false;
  }

  /** Turns the globe with the drag, the tilt within its limit. */
  dragBy(deltaLongitude: number, deltaTilt: number): void {
    this.turnBy(deltaLongitude, deltaTilt);
  }

  /**
   * Turns the globe's front one step the way the arrow points, and rests as after a drag. Gives
   * false, and does nothing, when the globe is tilted as far as it goes that way.
   */
  step(direction: ArrowDirection): boolean {
    const [longitude, tilt] = stepTurns[direction];
    if (!this.canTurn(longitude, tilt)) return false;
    this.turnBy(longitude * StepDegrees, tilt * StepDegrees);
    this.rest();
    return true;
  }

  /** The drag ends: the globe rests, and turns on its own again 5 seconds later. */
  dragEnd(): void {
    this.rest();
  }

  /** Follows the reduced motion setting: under it the globe never turns by itself. */
  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    if (this.mode === 'TurningOnItsOwn' || this.mode === 'Still') this.mode = this.leftAlone();
  }

  /** Whether the next frame is needed to move the globe on, or to count the rest. */
  isMoving(): boolean {
    return this.mode === 'TurningOnItsOwn' || this.mode === 'Waiting';
  }

  private turnBy(deltaLongitude: number, deltaTilt: number): void {
    this.current = {
      longitude: wrapped(this.current.longitude + deltaLongitude),
      tilt: clampedTilt(this.current.tilt + deltaTilt),
    };
  }

  /** After an interaction: wait, then turn on its own, where the globe does. */
  private rest(): void {
    this.waitedMs = 0;
    this.mode = this.leftAlone() === 'TurningOnItsOwn' ? 'Waiting' : 'Still';
  }

  private leftAlone(): MotionMode {
    return this.turnsOnItsOwn && !this.reducedMotion ? 'TurningOnItsOwn' : 'Still';
  }
}
