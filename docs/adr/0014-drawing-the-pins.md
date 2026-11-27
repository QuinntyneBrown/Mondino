# 0014: The page places the pins over the globe, and the numbers that group, fade and label them

**Status:** Accepted (journey 10, Show pins). Builds on [ADR 0012](0012-drawing-the-globe.md)
and [ADR 0013](0013-turning-the-globe.md).

## Context

L2-011 to L2-013 ask for a pin per teammate, lifted when pointed at, focused or selected, and
group pins where pins would cover each other, on the 3D globe and on the still picture alike.
`globe/show-pins` drew `PinLayer` inside the `globe` library, filled by two templates the page
projects (`PinMarkTemplate`, `PinLabelTemplate`) and grouped through a `PIN_GROUPER` token,
because `globe` depends on `api` only. It left open how near the rim a pin fades, the grouping
radius for a small and a large team, the size of team from which the larger applies, and how
often the pins are grouped again as the globe turns.

Two things weigh against that shape. Rendering a projected template needs `NgTemplateOutlet`
or a `ViewContainerRef` of the page's own; journey 8 measured `NgTemplateOutlet` at 2.8 kB of
the initial chunk, which stands at 259.64 kB against a 260 kB warning. And the still picture,
in `components`, would need a second pin layer of its own, the same markup and styles twice.

## Decision

- **One `PinLayer`, in `components`.** It is presentation: it takes the placements and the
  selected teammate and group, and emits `selectPin` and `selectGroup`; whether the globe is
  compact its styles read from the globe's box, the `globe` container. It draws the mocks'
  `ul.globe__pins > li.globe__pin > button.pin` with each pin's label (`PinLabel`, the design
  system's `pin-label`), and holds which pin the pointer or the keyboard has lifted.
  `GlobeView` and `GlobeFallback` each take it through a content slot (`[pins]`), so the 3D
  globe and the still picture draw the same pins.
- **`GlobeView` says where things are; the page places them.** `GlobeView` emits `viewChange`,
  a `GlobeViewport` (`api`): the box's width in CSS px and a `project(position)` that gives a
  position's place in the box, or null on the far side. It emits once the first frame is
  drawn, on each frame in which the globe has turned, and when the box is resized. The still
  picture's viewport is `stillViewport(width)` (`domain`), the projection the still picture is
  drawn with. `GlobePage` gives the pins, the viewport and the selection to `placePins`
  (`domain`'s `pins/`), which projects each place, drops the far side, groups with
  `groupPins` and sides the labels with `placeLabels`, and hands the placements to `PinLayer`.
  There is no `PIN_GROUPER` token and no projected template: the app calls `domain` itself.
- **What a pin shows is worked out once a minute, not on each frame.** The page makes a
  `PinView` per pin (initials, colour, name with "(you)", city, local time, accessible name)
  from the pins and the clock's minute; a frame only moves the placements.
- **Grouped again on every frame the globe turns.** `groupPins` is linear in the places that
  face the viewer and a team of 500 has at most 500 places, so grouping again is as cheap as
  moving the placements; `RegroupAfterDegrees` is 0.
- **The numbers**, in `domain`'s `pins/place-pins.ts`:
  - `FarDepth = 0.5`: a place whose `depth` is under one half (its surface turned more than
    about 72° from the viewer) is drawn fainter and unlabelled, `globe__pin--far`, as the
    mocks draw Mexico City (0.249), Austin (0.366) and Bengaluru (0.129) while Dubai (0.755)
    keeps its label.
  - `GroupRadiusPx = 20` for a team of up to `LargeTeam = 40` teammates, the size from which
    Team counts the ribbon by the half hour (L2-027): a pin's mark is 26 px, so two marks
    closer than 20 px cover more than a quarter of each other. The cast's Milan pins (one
    place) are one group pin "2", while Berlin and Stockholm, 24 px apart on the desktop
    globe, stand alone, as `pages/globe/default` draws them.
  - `GroupRadiusLargePx = 40` above 40 teammates (L2-013 criterion 2).
  - The compact globe is a globe box under 500 px (31.25 rem), the breakpoint the mocks'
    styles draw it at; L2-013 and the design system's prose said 400 px and are brought in
    line.
- **A tap is told from a drag before the globe takes the pointer.** `GlobeGestures` captures
  the pointer only once it has moved `TapThresholdPx`, so a click on a pin reaches its button;
  a tap that lands on no pin is reported as `blankTap`, which clears the selection (L2-012
  criterion 4).
- **The viewer's own pin is marked by more than colour**: a ring twice as thick
  (`--border-width-pin`) in the ink colour, and "(you)" after the name in its label and in its
  accessible name.
- **The pins add nothing to the initial chunk.** Measured, a text with two interpolations
  (`{{ a }} · {{ b }}`) brings `ɵɵtextInterpolate2` into it (0.41 kB) and `@let` its own
  instructions (0.35 kB); the label's line is one computed string and the templates use no
  `@let`.

## Consequences

- `PinLayer`, `placePins`, `groupPins` and `placeLabels` are in the Globe route's lazy chunk;
  nothing joins the initial chunk.
- The Angular change detection runs on each frame in which the globe turns, for the pin
  elements alone, which are bounded by the globe's area rather than by the team (L2-047).
- The pin and label markup is written once, in `PinLayer`.
- Journey 14 adds the panels on top of `selectPin` and `selectGroup`; journey 13 adds the weather
  to `PinView`, journey 11 the status, journey 20 the moment markers.
