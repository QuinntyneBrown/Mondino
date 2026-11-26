# Show pins

## Overview

Mondino shows a team spread around the world on a 3D globe. Each teammate appears as a pin at
their city. This feature covers the pins: reading them from the backend, drawing each one with
its teammate's initials, colour and label, lifting a pin out when it is pointed at, focused or
selected, and keeping pins apart when teammates live in the same city or in cities close
together.

The feature exists because a pin is how one teammate finds another. A globe on a phone is
about 320 px wide and a team can hold 500 teammates, so a pin at rest is small. Lifting makes
one pin readable at a time, and fanning and grouping make sure no pin hides another.

Terms used below:

- **pin** — a teammate's place on the globe: their initials in their own colour, at their city
- **label** — text beside a pin with the teammate's local time, weather and temperature, and, when the pin is lifted, their name and city
- **lifted pin** — pin drawn larger, raised above the surface and in front of its neighbours, with its label shown
- **hit area** — region around a pin that takes the pointer or a tap, at least 44 × 44 CSS px
- **placement** — where one pin, or one group of pins, is drawn relative to its city's position at the globe's current size
- **fan** — arrangement of the pins of one place around that place's position, so each stays visible
- **group pin** — one pin with a count that stands for more pins than can be fanned at the current size
- **viewer** — the teammate looking at the screen

A pin is placed at its city, never at a postal code, and nothing in this feature carries a
postal code (L2-007). Drawing the globe is covered by `draw-globe`, turning it by `turn-globe`.
The moment marker beside a pin (L2-021) and the text a screen reader hears for each pin
(L2-040) are designed in their own features and use the parts described here.

## Description

The slice runs from the Globe screen to the database. The backend gives the pins; the browser
decides how they are drawn.

**Backend**

- **`TeamsController`** — exposes `GET /api/teams/{teamId}/pins` to a teammate of the team. It
  checks nothing itself and sends one `GetPinsQuery`.
- **`GetPinsQuery`** — carries the `TeamId`.
- **`GetPinsQueryHandler`** — loads the team only where the teammate named by
  `ICurrentTeammate` belongs to it, and answers 404 otherwise, the same answer as for a team
  that does not exist (L2-043). For each distinct city it asks `IWeatherSource` for the
  weather and `MomentFinder` for the moments, then builds one `PinDto` for each teammate and
  answers them in a `TeamPinsDto` (the team's id and name, its invite token, the viewer's
  teammate id and the pins). A teammate whose `TeammateSettings.ShareWeather` is false gets a
  null weather and the `WeatherState` `NotShared`. When the weather source fails or times out
  the weather is null, the `WeatherState` is `Unavailable` and the pin is still returned
  (L2-049). The weather source receives a position and nothing else.
- **`PinDto`** — teammate id, name, colour, city name, country, position, time zone id,
  weather or null, the weather's state (`WeatherState`: `Available`, `Unavailable` or
  `NotShared`), whether the status is shown, whether the pin is the viewer's own
  (`IsViewer`), and the moments. The position is the city's. The DTO has no postal code field
  and no local time: the browser works the time out from the time zone id.
- **`CachedWeatherSource`** — `IWeatherSource` decorator over `OpenMeteoWeatherSource`, with a
  timeout and a circuit breaker.
- **`PinColourPicker`** — picks a teammate's colour from the pin palette when they join, so
  that it differs from the teammates nearest to them where the palette allows. It runs in the
  join slice; this feature reads the stored colour.

**In the `api` library**

- **`Pin`** — the browser's type for a `PinDto`.
- **`PinPlacement`** — a `kind` (`'pin'` or `'group'`), the `position` it is anchored to, the
  `pins` it stands for (one for a pin, two or more for a group), and an offset in CSS px from
  the projected position (`offsetX`, `offsetY`).
- **`PinSpreader`** / `PIN_SPREADER` — contract and token for the function that turns pins into
  placements. The `globe` library depends on `api` only, so it reaches `spreadPins` through
  this token.
- **`TeamApi`** / `TEAM_API`, **`HttpTeamApi`** — read the pins.

**In the `domain` library**

- **`TeamStore`** — holds the pins and the selected teammate id as signals and reads the pins
  again every 15 minutes (L2-048).
- **`spreadPins(pins, globeSize)`** — pure function. It gathers pins whose cities are closer
  together than one pin's width at the given globe size. A cluster that fits is fanned: each
  pin gets its own placement, offset around the shared position. A cluster with more pins than
  can be fanned becomes one group placement. The number of pins a fan holds at each size is
  `<TO SUPPLY>`; the mocks settle it. The result depends only on the pins and the size, not on
  the globe's orientation, so it is recomputed when either changes and not on each frame.
- **`initialsOf(name)`** — the first character of up to the first two words of a name, so a
  pin is never blank.
- **`localTime`**, **`formatTime`** — the label's local time, from the pin's time zone id and
  the clock.

**In the `globe` library**

- **`GlobeView`** (`mo-globe`) — takes `pins`, `descriptions`, `selectedId` and `interactive`, and emits
  `select` with a teammate id or null and `selectGroup` with a group pin's teammate ids. It measures its own width with a `ResizeObserver`,
  computes `placements` by calling `PIN_SPREADER` with the pins and that width, and passes
  them to `PinLayer`. It sets `compact` when the globe is less than 400 px wide.
- **`PinLayer`** — component that draws the pins as HTML elements over the scene's canvas.
  The pins it draws are the list a keyboard and a screen reader reach (L2-040): the mocks'
  `ul.globe__pins`, with one `li.globe__pin` for each placement, holding a `button.pin`. A
  button's accessible name is its pin's description (`descriptions`, see `make-accessible`),
  it carries `aria-pressed`, which is true while its pin is selected, and the visible label
  beside it is `aria-hidden`. The buttons are in a fixed order, west to east, which does not
  change as the globe turns. Each is a Tab stop; Enter or Space emits `select`.
  On each frame in which the globe has turned it asks `GlobeScene.project` for each
  placement's point and moves the pin's element there with a transform. A placement that does
  not face the viewer is hidden, with its label, so it takes no focus and is not in the list
  until the globe turns it into view; its teammate is reached through the panel and the Team
  screen. A placement near the globe's edge is drawn
  fainter and without its label (`globe__pin--far`) until it is lifted; how near is
  `<TO SUPPLY>`. `PinLayer` holds `liftedId`: the pin under
  the pointer, or else the pin with keyboard focus. A pin is drawn lifted when it is the
  lifted pin or the selected pin. The canvas under the layer is hidden from the accessibility
  tree. Whether the renderer also draws a
  3D body under each pin is `<TO SUPPLY>` with the renderer ADR; the element over the canvas
  is what is pointed at, selected and tested.
- **`PinMarkTemplate`** (`ng-template[moPinMark]`) and **`PinLabelTemplate`**
  (`ng-template[moPinLabel]`) — templates that the page projects into `GlobeView`. The `globe`
  library cannot import `components` or `domain`, so it does not know how to draw an avatar or
  format a time. It places and lifts; the page says what a pin and its label show. Each
  template receives the `Pin` and whether it is lifted.
- **`LabelPlacer`** — pure helper. Given the projected pins and the globe's area it picks a
  side for each shown label (right, left, above or below), so that the label sits beside its
  pin, inside the globe's area and clear of other pins.

**In the `mondino` application and the `components` library**

- **`GlobePage`** — binds `PIN_SPREADER` to `spreadPins` in its route's providers and fills
  the two templates. The mark template renders `Avatar` with `initialsOf(pin.name)` and the
  pin's colour. The label template renders `PinLabel` with the formatted local time and, where
  `pin.weather` is not null, `WeatherIcon` and the temperature in the viewer's unit. Names and
  cities are rendered as text. Where `pin.isViewer` is true the name is followed by "(you)"
  and the mark carries a ring, so the viewer's pin differs by more than colour. When
  `GlobeView` emits `selectGroup` the page clears the selected teammate and shows the group in
  the panel, as `GroupPanel` (`team/view-teammate-panel`): the heading "3 teammates close together" (with the group's count), "Choose one to
  see where they are in their day.", a row for each teammate, west to east, which selects
  them, and a link back to "This week around the world". On Join the
  page projects no label template, so pins there carry no name, city, local time or weather
  (L2-001).

**Lifting**

A pin at rest is a small mark inside a transparent hit area of at least 44 × 44 CSS px,
whatever the globe's size. Lifting is a change of state on the pin's element (the mocks'
`globe__pin--lifted` and `pin-label--lifted` modifiers), styled with a transform that raises
and enlarges it and a higher stacking order. The transition lasts no more than 200 ms; its
exact length comes from the design system's motion token `--duration-fast` (150 ms). Under reduced motion the transition
is removed and the pin changes size at once. Each minute the label's time changes through the
shared clock; no pin has a timer of its own.

By pointer, entering the hit area lifts the pin and leaving it settles the pin back unless it
is selected. By keyboard, focus on a pin's button lifts that pin exactly as the
pointer does, and the focus indicator is drawn on the pin itself. A pin on the far side of
the globe is hidden and takes no focus, so focus is never on something hidden. By
touch, where nothing hovers, a tap on a pin selects it and a tap elsewhere on the globe emits
`select` with null. `GlobeGestures` (see `turn-globe`) tells a tap from a drag. A selected
pin stays lifted, and `GlobePage` shows its teammate in the panel (L2-023).

A newly placed pin, the viewer's own after joining (L2-005) or one in `arrivedIds` (see
`keep-team-fresh`), carries the `pin--new` modifier and pulses once. Reduced motion removes
the pulse.

**Keeping pins apart**

Fanned pins are drawn around their city's position and each has its own hit area, so each is
pointed at and selected on its own. Hit areas of neighbouring pins may touch; where they
would overlap, the lifted pin's area is in front. On a globe less than 400 px wide the marks
are drawn smaller and a label is shown only for the lifted or selected pin. On a wider globe
`LabelPlacer` decides which resting labels fit; a label that cannot be placed clear of other
pins is not shown until its pin is lifted.

A group pin (`pin--group`) shows its count and is named "3 teammates close together:" and
their names. Selecting it emits `selectGroup`; the group pin stays lifted and pressed while
its teammates are listed in the panel. `selectedId` stays null, so the globe does not turn.

**Bounds and release**

A team holds at most 500 teammates. `PinLayer` keeps elements only for placements that face
the viewer, and grouping bounds how many pins one place can produce, so the number of
elements does not grow with the length of a visit. `PinLayer` reads positions inside the
scene's frame listener and adds no loop of its own. Its pointer listeners are removed when
`GlobeView` is destroyed.

## Requirements

The feature realises the following level-2 (L2) requirements. Each refines a level-1 (L1)
requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-011` | `L1-004` | A pin shows the teammate's initials in the teammate's own colour, and a label beside it with their local time, the weather and the temperature. The viewer's own pin is marked as theirs. |
| `L2-012` | `L1-004` | On a small globe pins are small. A pin that the pointer is over, that has keyboard focus, or that is selected rises from the globe's surface, grows, comes in front of its neighbours and shows its label, so the teammate can be read clearly. When the pointer leaves it settles back. |
| `L2-013` | `L1-004` | Teammates in the same city, or in cities close together at the current size of the globe, are never drawn on top of one another so that one is hidden. |

## Diagrams

### System context

A teammate sees and selects pins in Mondino. Mondino reads the weather shown in a pin's label
from Open-Meteo.

![C4 system context for showing pins](diagrams/c4-context.png)

### Containers

The Mondino web app reads the pins from the Mondino API with one request. The API reads the
team's teammates from the Mondino database and the cached weather for each city from
Open-Meteo.

![C4 container view for showing pins](diagrams/c4-container.png)

### Components

In the web app, `GlobePage` gives the pins from `TeamStore` to `GlobeView`, which asks
`spreadPins` for placements and hands them to `PinLayer`, whose pin buttons take the pointer and keyboard focus. In the API, `TeamsController` sends `GetPinsQuery` to
`GetPinsQueryHandler`, which reads the database and `CachedWeatherSource`.

![C4 component view for showing pins](diagrams/c4-component.png)

### Class structure

`PinDto` is serialised as `Pin`. `spreadPins` realises the `PinSpreader` contract and returns
`PinPlacement`s, each standing for one or more pins. `GlobeView` injects the contract and owns
`PinLayer`, which uses `LabelPlacer` and `GlobeScene.project`.

![Class diagram for showing pins](diagrams/class-structure.png)

### Behaviour — read the team's pins

The handler answers 404 to anyone who is not a teammate of the team. Otherwise it builds a
`PinDto` for each teammate with the city's position and no postal code. A weather that is not
shared, or that Open-Meteo did not give in time, is null, with the `WeatherState` saying
which, and the pin is returned all the same.

![Sequence diagram for reading the team's pins](diagrams/sequence-read-pins.png)

### Behaviour — lift a pin

The pointer lifts a pin in `PinLayer`. Keyboard focus on the pin's button lifts it the same
way. A tap, or Enter or Space, selects it; the selection travels to `TeamStore`
and returns as an input, and the pin stays lifted until the selection is cleared.

![Sequence diagram for lifting a pin on hover, focus or tap](diagrams/sequence-lift-pin.png)

### Behaviour — fan and group pins

`GlobeView` asks for placements when the pins or the globe's size change. `PinLayer` projects
each placement as the globe turns, hides those on the far side and places the labels. Selecting
a group pin lists its teammates in the panel to choose from.

![Sequence diagram for fanning and grouping pins that are close together](diagrams/sequence-spread-pins.png)
