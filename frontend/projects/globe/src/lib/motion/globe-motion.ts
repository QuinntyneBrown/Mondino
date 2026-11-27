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

export type MotionMode =
  'TurningOnItsOwn' | 'Dragged' | 'Waiting' | 'TurningToPin' | 'Holding' | 'Still';

/** How fast the globe turns on its own: a whole turn a minute (ADR 0013). */
export const TurnRateDegreesPerSecond = 6;
/** How long the globe rests after a drag before it turns on its own again (L2-009). */
export const IdleDelayMs = 5000;
/** How far one press of an arrow key turns the globe: one time zone (ADR 0013). */
export const StepDegrees = 15;
/** How long the turn to a held pin takes: inside the requirement's second (L2-009). */
export const TurnToPinMs = 800;
/** How far from the equator the centre of the view may tilt, so a pole never passes it. */
export const TiltLimitDegrees = 60;

const clampedTilt = (tilt: number) => Math.max(-TiltLimitDegrees, Math.min(TiltLimitDegrees, tilt));

/** Eases a turn out, the shape of `--ease-standard`. */
const easedOut = (progress: number) => 1 - (1 - progress) ** 3;

/** Puts a longitude between -180° and 180°. */
function wrapped(longitude: number): number {
  if (longitude >= -180 && longitude < 180) return longitude;
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
  /** The position held, while the globe is told to face one. */
  private held: GlobeOrientation | null = null;
  /** The turn to the held position: where it began and how long it has run. */
  private turn = { from: { longitude: 0, tilt: 0 } as GlobeOrientation, elapsedMs: 0 };

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
    } else if (this.mode === 'TurningToPin' && this.held) {
      this.turn.elapsedMs += elapsedMs;
      const progress = Math.min(1, this.turn.elapsedMs / TurnToPinMs);
      const { from } = this.turn;
      // The shorter way round.
      const longitudeToGo = wrapped(this.held.longitude - from.longitude);
      const eased = easedOut(progress);
      this.current = {
        longitude: wrapped(from.longitude + longitudeToGo * eased),
        tilt: from.tilt + (this.held.tilt - from.tilt) * eased,
      };
      if (progress === 1) {
        this.current = this.held;
        this.mode = 'Holding';
      }
    } else if (this.mode === 'Waiting') {
      this.waitedMs += elapsedMs;
      if (this.waitedMs >= IdleDelayMs) {
        // The time past the rest is spent turning, so the globe is where the clock says.
        const overMs = this.waitedMs - IdleDelayMs;
        this.mode = this.leftAlone();
        return this.advance(overMs);
      }
    }
    return this.current;
  }

  /**
   * Turns the globe to face `position` and holds it there: within `TurnToPinMs`, or at once under
   * reduced motion.
   */
  hold(position: { latitude: number; longitude: number }): void {
    this.held = { longitude: wrapped(position.longitude), tilt: clampedTilt(position.latitude) };
    if (this.reducedMotion) {
      this.current = this.held;
      this.mode = 'Holding';
      return;
    }
    this.turn = { from: this.current, elapsedMs: 0 };
    this.mode = 'TurningToPin';
  }

  /** The position is no longer held: the globe rests, then turns on its own again. */
  release(): void {
    this.held = null;
    this.rest();
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
    if (reduced && this.mode === 'Waiting') this.mode = 'Still';
    if (reduced && this.mode === 'TurningToPin' && this.held) {
      this.current = this.held;
      this.mode = 'Holding';
    }
  }

  /** Whether the next frame is needed to move the globe on, or to count the rest. */
  isMoving(): boolean {
    return (
      this.mode === 'TurningOnItsOwn' || this.mode === 'Waiting' || this.mode === 'TurningToPin'
    );
  }

  private turnBy(deltaLongitude: number, deltaTilt: number): void {
    this.current = {
      longitude: wrapped(this.current.longitude + deltaLongitude),
      tilt: clampedTilt(this.current.tilt + deltaTilt),
    };
  }

  /**
   * After an interaction: wait, then turn on its own, where the globe does. While a position is
   * held it stays where it was left (ADR 0013).
   */
  private rest(): void {
    this.waitedMs = 0;
    this.mode = this.leftAlone() === 'TurningOnItsOwn' ? 'Waiting' : 'Still';
  }

  private leftAlone(): MotionMode {
    return this.turnsOnItsOwn && !this.reducedMotion && !this.held ? 'TurningOnItsOwn' : 'Still';
  }
}
