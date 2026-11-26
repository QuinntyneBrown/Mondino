# Mark pins with moments

## Overview

Mondino shows a team on a 3D globe. Each teammate is a pin with their initials, local time and
weather. When something is happening where a teammate lives in the coming week, their pin
carries a small marker so the viewer notices it at a glance.

**moment** — something happening where a teammate lives, of one of four kinds: holiday,
Formula 1, local event or sport

**moment marker** — mark beside a pin, in the sun colour, showing that its teammate has a moment
today or in the next 7 days

**emblem** — picture inside a moment marker that says what the moment is

**viewer** — teammate looking at the globe

This feature decides, for each pin, whether it carries a moment marker, which moment the marker
stands for and which emblem it shows. A team's or a series' own logo is used only where Mondino
holds the right to use it. Everywhere else the marker shows Mondino's own icon for the kind, and
the moment's title names the team or race.

The viewer chooses which kinds of moment mark pins, in Profile & Settings. All four kinds are on
at first. The choice changes only the viewer's own globe. The Moments screen ignores it and
lists every kind.

The moments themselves come from the backend (`find-moments`). This feature is the browser-side
rule and the drawing of the marker.

## Description

The rule lives in `domain`'s `moments/`. The `globe` library draws the result and holds no rule.

- **`EmblemCatalogue`** — backend application service. It sets `Moment.EmblemKey` where Mondino
  holds the right to use the emblem of the moment's subject, and leaves it empty otherwise. The
  emblems Mondino holds the right to use are `<TO SUPPLY>`.
- **`Pin`** — `api` type. Each pin carries its `timeZoneId` and its teammate's `moments`, each
  a `Moment`, the `api` type for a `MomentDto` (`find-moments`).
- **`Settings.momentKinds`** — the viewer's chosen kinds. `ProfileApi` reads and saves them,
  `SettingsStore` holds them as a signal for every screen, and `SettingsCache` keeps them in
  the browser for the next visit (`profile/choose-display-and-sharing`).
- **`markerFor(pin, kinds, now)`** — pure function. It drops the moments whose kind is not in
  `kinds`. It keeps the moments dated today or 1 to 7 days ahead, counted in the pin's own time
  zone by `daysUntil`. With none left it returns nothing. Otherwise it returns a `MomentMarker`
  for the nearest moment. `now` comes from the injected `Clock`.
- **`daysUntil(date, timeZoneId, now)`** — number of whole days from today in the given time
  zone to the date.
- **`emblemFor(moment)`** — pure function returning an `Emblem`. It returns the held emblem when
  the moment's `emblemKey` is in `HELD_EMBLEMS`, and the icon of the moment's kind otherwise.
- **`HELD_EMBLEMS`** — set of emblem keys whose pictures are bundled with the app. Its contents
  are `<TO SUPPLY>`. A key the backend sends that is not in the set falls back to the kind's
  icon. Emblem pictures are served with the app and never loaded from a third party.
- **`Emblem`** — `api` type: whether the picture is a held emblem or a kind's icon, its key and
  the kind.
- **`MomentMarker`** — `api` type: the chosen `moment`, its `emblem`, the `count` of the pin's
  moments in the window, a `today` flag, and the `when` label from
  `whenLabel(daysAhead, date)` ("Today", "Tomorrow", "In 3 days"; a marker's moment is never
  more than 7 days ahead, so it never reads as a date). The type sits in `api` so `globe` can read it without importing
  `domain`.
- **`GlobePage`** — page in the `mondino` application. A computed signal maps each teammate id
  to its marker from `TeamStore`'s pins, the chosen kinds and the clock's minute tick. The page
  passes the map to `GlobeView`.
- **`GlobeView`** — `mo-globe`. It takes the map as its `markers` input, keyed by teammate
  id, beside `pins`, and hands it to `PinLayer`'s `markers` input.
- **`PinLayer`** — draws each marker beside its pin in the sun colour, with the emblem inside. A
  marker for a moment today is larger and carries a ring. A count badge shows when `count` is 2
  or more. A marker is at least 16 px across at every globe size and sits clear of the pin's
  initials. A marker is not a control of its own: when its pin is pointed at, focused or
  selected and lifts, the label shows the moment's title and the `when` label as text. The
  layer is a component of `GlobeView` and is released with it (`globe/show-pins`).
  The marker is in the pin's text too: the accessible name of the pin's button, built by
  `describePin` (`make-accessible`), ends with the marker's title and `when` label ("October
  Bank Holiday, today").

When the viewer turns a kind off, `markerFor` no longer sees moments of that kind. A pin whose
only moment this week is of that kind carries no marker. `weekMoments` (`team/view-week-around-the-world`) takes the same chosen
kinds, so the moment is absent from "This week around the world". With every kind off, no pin
carries a marker, and the panel says "Nothing to show: every kind of moment is turned off for
your globe."

When two moments fall on the same day, the order between them is `<TO SUPPLY>`.

## Requirements

The feature realises the following level-2 (L2) requirements. Each refines the level-1 (L1)
requirement cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-021` | `L1-007` | A pin whose teammate has a moment today or in the next 7 days carries a moment marker beside it, in the sun colour, showing an emblem for the moment so it can be told at a glance: a race car for Formula 1, a team's emblem for a sport fixture, and so on. An emblem that belongs to someone else (a team's or a series' own logo) is used only where Mondino holds the right to use it; otherwise the marker shows Mondino's own icon for the kind and the title names the team or race. |
| `L2-022` | `L1-007` | The viewer chooses which kinds of moment mark pins on the globe. All four kinds are on to begin with. The choice changes what the viewer sees and nothing for anyone else. |

## Diagrams

### System context

A teammate sees moment markers on the pins of the globe. Mondino reads the moments behind them
from the calendar sources.

![C4 system context for marking pins with moments](diagrams/c4-context.png)

### Containers

The Mondino API gives each pin its moments and their emblem keys. The Mondino web app chooses
each pin's marker and draws it.

![C4 container view for marking pins with moments](diagrams/c4-container.png)

### Components

`GlobePage` reads the pins from `TeamStore` and the chosen kinds from `SettingsStore`. It calls
`markerFor`, which calls `emblemFor`, and passes the markers to `GlobeView`. `PinLayer` draws
them, and each pin's accessible name gives its marker as text.

![C4 component view for marking pins with moments](diagrams/c4-component.png)

### Class structure

`markerFor` reads a `Pin` and the chosen kinds and returns a `MomentMarker`, which holds a
`Moment` and an `Emblem`. `GlobePage` passes the markers to `GlobeView`, and `PinLayer`
presents them.

![Class diagram for marking pins with moments](diagrams/class-structure.png)

### Behaviour — choose a marker and its emblem for a pin

The backend sets an emblem key only where the right is held. In the browser, `markerFor` drops
the kinds the viewer turned off (`L2-022`), keeps the moments of the next 7 days and picks the
nearest (`L2-021`). `emblemFor` returns the held emblem or the icon of the kind. A pin with no
moment left carries no marker.

![Sequence diagram for choosing a marker and its emblem](diagrams/sequence-choose-marker.png)
