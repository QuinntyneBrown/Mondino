import {
  GlobeMotion,
  IdleDelayMs,
  StepDegrees,
  TiltLimitDegrees,
  TurnRateDegreesPerSecond,
} from './globe-motion';

const facingEurope = { longitude: 10, tilt: 17 };

describe('GlobeMotion: turning on its own', () => {
  it('turns eastward at the turning rate: the longitude at the centre falls', () => {
    const motion = new GlobeMotion(true, facingEurope);
    for (let frame = 0; frame < 300; frame++) motion.advance(1000 / 60);
    expect(motion.orientation.longitude).toBeCloseTo(10 - 5 * TurnRateDegreesPerSecond, 6);
    expect(motion.orientation.tilt).toBe(17);
    expect(motion.isMoving()).toBe(true);
  });

  it('keeps the longitude between -180° and 180° as it goes round', () => {
    const motion = new GlobeMotion(true, { longitude: -170, tilt: 0 });
    motion.advance(5000);
    expect(motion.orientation.longitude).toBeCloseTo(160, 6);
  });

  it('stays still when it does not turn on its own', () => {
    const motion = new GlobeMotion(false, facingEurope);
    motion.advance(5000);
    expect(motion.orientation).toEqual(facingEurope);
    expect(motion.isMoving()).toBe(false);
  });

  it('stays still under reduced motion, and turns again when the setting is turned off', () => {
    const motion = new GlobeMotion(true, facingEurope);
    motion.setReducedMotion(true);
    motion.advance(5000);
    expect(motion.orientation).toEqual(facingEurope);
    expect(motion.isMoving()).toBe(false);

    motion.setReducedMotion(false);
    motion.advance(1000);
    expect(motion.orientation.longitude).toBeCloseTo(10 - TurnRateDegreesPerSecond, 6);
  });
});

describe('GlobeMotion: dragging', () => {
  it('follows the drag, and stops turning on its own while dragged', () => {
    const motion = new GlobeMotion(true, facingEurope);
    motion.dragStart();
    motion.dragBy(20, -5);
    motion.advance(1000);
    expect(motion.orientation).toEqual({ longitude: 30, tilt: 12 });
    expect(motion.isMoving()).toBe(false);
  });

  it('rests for 5 seconds of frame time after the drag ends, then turns on its own again', () => {
    const motion = new GlobeMotion(true, facingEurope);
    motion.dragStart();
    motion.dragBy(-10, 0);
    motion.dragEnd();
    motion.advance(IdleDelayMs - 1);
    expect(motion.orientation.longitude).toBe(0);
    expect(motion.isMoving()).toBe(true);
    motion.advance(1);
    expect(motion.motionMode).toBe('TurningOnItsOwn');
    motion.advance(1000);
    expect(motion.orientation.longitude).toBeCloseTo(-TurnRateDegreesPerSecond, 6);
  });

  it('ends still after a drag where it does not turn on its own', () => {
    for (const motion of [
      new GlobeMotion(false, facingEurope),
      new GlobeMotion(true, facingEurope),
    ]) {
      motion.setReducedMotion(true);
      motion.dragStart();
      motion.dragBy(5, 0);
      motion.dragEnd();
      expect(motion.motionMode).toBe('Still');
      expect(motion.isMoving()).toBe(false);
    }
  });

  it('keeps the tilt within its limit, and says when it can tilt no further that way', () => {
    const motion = new GlobeMotion(true, facingEurope);
    motion.dragStart();
    motion.dragBy(0, -200);
    expect(motion.orientation.tilt).toBe(-TiltLimitDegrees);
    expect(motion.canTurn(0, -1)).toBe(false);
    expect(motion.canTurn(0, 1)).toBe(true);
    expect(motion.canTurn(1, 0)).toBe(true);
    motion.dragBy(0, 500);
    expect(motion.orientation.tilt).toBe(TiltLimitDegrees);
    expect(motion.canTurn(0, 1)).toBe(false);
  });
});

describe('GlobeMotion: arrow keys', () => {
  it('turns the front one step the way each arrow points, as a drag that way would', () => {
    const motion = new GlobeMotion(true, { longitude: 0, tilt: 0 });
    expect(motion.step('Left')).toBe(true);
    expect(motion.orientation).toEqual({ longitude: StepDegrees, tilt: 0 });
    motion.step('Right');
    motion.step('Right');
    expect(motion.orientation).toEqual({ longitude: -StepDegrees, tilt: 0 });
    motion.step('Down');
    expect(motion.orientation).toEqual({ longitude: -StepDegrees, tilt: StepDegrees });
    motion.step('Up');
    motion.step('Up');
    expect(motion.orientation).toEqual({ longitude: -StepDegrees, tilt: -StepDegrees });
  });

  it('rests for 5 seconds after a step, as after a drag', () => {
    const motion = new GlobeMotion(true, { longitude: 0, tilt: 0 });
    motion.step('Left');
    expect(motion.motionMode).toBe('Waiting');
    motion.advance(IdleDelayMs);
    expect(motion.motionMode).toBe('TurningOnItsOwn');
  });

  it('takes no step past the tilt limit', () => {
    const motion = new GlobeMotion(true, { longitude: 0, tilt: TiltLimitDegrees });
    expect(motion.step('Down')).toBe(false);
    expect(motion.orientation.tilt).toBe(TiltLimitDegrees);
    motion.step('Up');
    motion.step('Down');
    motion.step('Down');
    expect(motion.orientation.tilt).toBe(TiltLimitDegrees);
  });
});
