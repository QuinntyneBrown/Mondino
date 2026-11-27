# 0013: The globe turns from one frame loop, at numbers of its own, and only the Globe screen's globe turns on its own

**Status:** Accepted (journey 9, Turn the globe). Builds on
[ADR 0012](0012-drawing-the-globe.md).

## Context

L2-009 says the globe turns slowly on its own, is dragged to spin by pointer or touch, turns by a
fixed step with the arrow keys, turns to a selected pin within a second and holds there, stops
under reduced motion and while its tab is hidden, and never traps the page on a phone.
`globe/turn-globe` leaves open the turning rate, the step, the tilt limit, the easing, the
distance that tells a tap from a drag, and what a drag does while a pin is selected. Neither the
mocks nor the motion tokens give them: the mocks draw the globe still.

The constraints are the instructions': one frame loop that rests while the tab is hidden, nothing
in the initial chunk, everything released when the globe is left, and every rule of turning unit
tested without a timer. WCAG 2.2.2 asks that moving content shown beside other content can be
stopped.

## Decision

- **The numbers**, named constants in the `globe` library (`motion/globe-motion.ts`, with
  `TapThresholdPx` in `motion/globe-gestures.ts` and `MaxFrameMs` in `scene/globe-scene.ts`):
  - `TurnRateDegreesPerSecond = 6`: a whole turn a minute, slow enough to read a label as it
    passes, fast enough that 5 seconds visibly move the globe (30°, two time zones).
  - `StepDegrees = 15`: one press of an arrow key turns the globe by one time zone.
  - `TiltLimitDegrees = 60`: the latitude at the centre of the view stays between 60° S and
    60° N, so a pole never passes the centre and every inhabited city can still be brought near
    the front.
  - `IdleDelayMs = 5000` (L2-009) and `TurnToPinMs = 800`, inside the requirement's 1 second,
    eased out (`1 − (1 − t)³`), the shape of `--ease-standard`.
  - `TapThresholdPx = 6`: a pointer that moves less is a tap, kept for selecting a pin
    (journey 10).
  - A frame's elapsed time is capped at `MaxFrameMs = 100`, so a frame after a pause or a rest
    never jumps the globe.
- **Directions.** The orientation is the longitude and latitude at the centre of the view.
  Turning eastward is the Earth's own way: the surface moves from west to east, so the longitude
  at the centre falls and the pins move right. A drag turns the globe's front with the pointer,
  one radius of the disc for one radian, so the place under the pointer follows it. An arrow key
  turns the front the way it points, as a drag that way would: `←` brings the east into view,
  `↓` the north.
- **Only an interactive globe turns on its own.** `GlobeView`'s `interactive` input, set only by
  the Globe screen, makes the globe focusable, takes drags and arrow keys, and turns it on its
  own. A globe that is not interactive (Join's, later the small one on Profile & Settings) is a
  picture beside a form, named as a single image, which the teammate has no way to stop; it
  stays still unless it is told to face a position, as Join's turns to the new pin's city and
  holds (the mock `join/found`). On the Globe screen a drag or a key stops the turn, and reduced
  motion stops it for good.
- **Facing a position is an input.** `GlobeView` takes `facing`, a position or null: it turns to
  it and holds, and turns on its own again 5 seconds after it is cleared. Until pins can be
  selected (journey 10), Join passes the new pin's position; then the selected pin's or group
  pin's position is resolved into it.
- **A drag while a pin is held turns the globe**, which stays where it was left and does not
  turn on its own while the selection lasts; selecting again turns back to the pin. It is the
  teammate's own movement, so it is never refused, and the pin's panel stays open.
- **One frame loop, driven by `GlobeView`.** `GlobeScene.onFrame` reports the time since the
  previous frame. On each frame `GlobeView` advances `GlobeMotion`, gives the scene the new
  orientation and asks for the next frame only while the globe is moving or waiting out the
  5 seconds. Holding, still or hidden, no frame is asked for, so the 5 seconds are counted in
  frame time and stop with the loop; there is no timer to release.
- **Touch is read from touch events, the mouse and pen from pointer events.** The globe's box
  sets `touch-action: pan-y`. On a touch drag's first move, a vertical drag the globe cannot
  follow (the tilt at its limit in that direction) is left to the browser, which scrolls the
  page; any other drag is taken by cancelling the `touchmove` (a listener that is not passive),
  so the page does not move under it. Pointer events would be cancelled by the browser as soon
  as it pans, so they cannot hand a drag back; the mouse and the pen use them, with pointer
  capture, released when the drag ends or the globe is left.

## Consequences

- `GlobeMotion` and `GlobeGestures` join the `globe` library's own code in the pages' lazy
  chunks (a few kB); the initial chunk does not change.
- The e2e specs that read the 3D globe's pixels at a known orientation emulate reduced motion,
  so the globe holds still while they look.
- Journey 10 resolves a selected pin into `facing`; nothing in this decision changes then.
