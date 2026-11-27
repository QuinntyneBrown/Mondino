import { GlobeMotion, TurnRateDegreesPerSecond } from './globe-motion';

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
