# View a teammate's panel

## Overview

Mondino shows a team spread around the world as pins on a 3D globe. The Globe screen is the home
screen: the globe on one side and a panel beside it (under it on a phone). This feature covers
what the panel shows when a pin, or a group pin, is selected.

- **teammate** — person who belongs to a team
- **viewer** — teammate looking at the screen
- **pin** — a teammate's place on the globe, placed at their city
- **status** — label that follows from a teammate's local hour: Working hours, Early morning, Evening or Probably asleep
- **offset** — how far ahead or behind a teammate's local time is, compared with the viewer's
- **overlap** — part of two teammates' working hours (09:00 to 18:00) that coincides, shown on the viewer's clock
- **moment** — something happening where a teammate lives: a holiday, Formula 1, a local event or sport

Selecting a pin opens that teammate in the panel: name, city and country, local time and day,
offset, status, weather, upcoming moments and overlap. The selection is held in one place, the
`TeamStore`, and follows the address, which carries an opaque teammate id, so a reload or a
shared address selects the same teammate. Closing the panel clears the selection and returns the panel
to the week around the world (L2-024, designed in `view-week-around-the-world`).

Where pins would cover each other, the globe draws them as one group pin with a count
(`globe/show-pins`). Selecting a group pin turns the globe to it and opens the group in the
panel: its teammates, city by city, each a link that selects that teammate's pin.

A teammate chooses what teammates see of them in Profile & Settings. A teammate who shares
neither their weather nor their status keeps a panel with their name, city, local time, offset
and moments, and a note in place of the rest.

The feature reads no data of its own. Every value in the panel is worked out in the browser from
the pins the `TeamStore` already holds and from the one shared clock.

## Description

The slice lives in the Mondino web app. The pins come from `GET /api/teams/{teamId}/pins`, whose
loading and refreshing are designed in `keep-team-fresh`.

- **`GlobePage`** — page of the `mondino` application at `/globe`, a lazy route. It binds the
  address, the `TeamStore`, the `GlobeView` and the panel. It reads the `teammate` query
  parameter from `ActivatedRoute.queryParamMap` (no component input binding, which would put the
  router's binding code in the initial chunk) and passes it to `TeamStore.select` once the pins
  are read. It renders `TeammatePanel` when a pin is selected, `GroupPanel` when a group pin is
  selected, and `WeekPanel` otherwise; until `WeekPanel` is built (journey 15) the panel's place
  is empty with no selection. It listens for Escape on the document while a teammate's or a
  group's panel is open. It passes the same selection to the `PinLayer` over `GlobeFallback`
  where the still picture stands in for the globe (`globe/draw-globe`), so a pin on the still
  picture opens the same panels.
- **Address** — `/globe?teammate={teammateId}`. The parameter carries the teammate's id, an
  opaque `Guid`, and no name, city or postal code (L2-023). The address is the source of the
  selection: selecting a pin, choosing a group's row, closing and a tap off the pins navigate,
  each replacing the history entry (so glancing at pins does not fill the history that "back"
  walks), and the store follows the address. The pin of a teammate who has just joined
  (`joining/join-team`) is the one selection not in the address: it is selected for that visit
  only, so a reload of the Globe selects no one, as it greets no one.
- **`TeamStore`** — signal store of the Globe screen, in the app's `globe/` (built by
  `globe/show-pins`), provided at the Globe route so the selection is released when the teammate
  leaves the screen; `TeamShell` provides it for the four screens of a team when it is built. It
  holds the `team`, the `selectedId` and the `heldIds` of a selected group pin.
  `select(teammateId)` returns `false` and leaves the selection empty when no pin of the team has
  that id; `GlobePage` then removes the parameter from the address.
- **`teammatePanelView(pin, viewer, now, settings)`** — pure function in `pins/`. It builds a
  `TeammatePanelContent` from the selected pin, the viewer's pin, the clock's time and the
  viewer's display settings. It calls `localTime`, `formatTime`, `formatDay`, `statusFor`,
  `offsetBetween`, `formatOffset`, `workingDayOnViewerClock`, `overlapBetween` and
  `formatOverlap` from `time/` (through `compareWithViewer`, `time/show-offset-and-overlap`).
  The moments join with journey 19 (`moments/find-moments`), which keeps the pin's moments that
  are today or later in the pin's city, in date order; until then the content has none. The offset is in the panel's form, which names the viewer: "7h
  behind you", "10h ahead of you", "same time as you". For the viewer's own pin it sets
  `isViewer` and leaves `offset`, `overlap`, `theirDay` and `overlapText` null. `status` is
  what `statusFor(pin, time)` gives: null, at every hour, when the pin's `sharesStatus` is
  false. For such a pin `overlap`, `theirDay` and `overlapText` are null as well, since the
  overlap would say when the teammate is working (L2-017). `weather` is null unless the pin's
  `weatherState` is `Available`, and `weatherState` is carried so the panel can say which of
  the two it is. `keepsPrivate` is true when the pin shares neither: `sharesStatus` is false
  and `weatherState` is `NotShared`. `firstName` is `firstName(pin.name)`
  from `pins/`, the first word of the name, by which the panel's running copy names the
  teammate.
- **`TeammatePanelContent`** — type in `api` (`pins/panel-content`), with `GroupContent`,
  `GroupCity` and `GroupRow`, so `TeammatePanel` and `GroupPanel` in `components` can read it:
  the strings and values the panel
  presents. It holds no postal code; the `Pin` type has none to give.
- **`TeammatePanel`** (`mo-teammate-panel`) — presentation component. It takes `content` and
  emits `closed`. It renders the `Avatar`, the name (followed by "(you)" when `isViewer`), the
  city and country, the local time and day in tabular figures, the offset, a `StatusBadge`, a
  `WeatherIcon` with the temperature and the weather in words, one moment card per moment (its
  kind and when, "Holiday · In 5 days" within 7 days and the date, "Formula 1 · 12 Nov", beyond
  them, its title and its detail) and the `OverlapBar`. A teammate with two moments has two
  cards, one under the other: for Tomás, "Holiday · In 5 days", "Día de Muertos", and "Sport ·
  In 6 days", "Clásico Nacional", "América vs. Chivas at the Azteca, 19:00 local". The day
  and the offset share one line ("Monday 27 Oct · 7h behind you"). In the weather's place it
  says "Weather for Mexico City isn’t available right now. We’ll try again in a few minutes.",
  naming the pin's city, when `weatherState` is `Unavailable` (designed in
  `weather/show-weather`). It omits the moments section when `moments` is empty, the offset
  when it is null, the status when it is null and the overlap when it is null.
- **The private note** — when `keepsPrivate` is true, `TeammatePanel` shows one note
  (`panel__note`, an icon and a sentence) under the local time: "Ahmed keeps their weather and
  working hours private. You’ll still see their local time and city.", naming the teammate by
  `firstName`. With it the panel hides the status, the weather section and the working-hours
  overlap, and keeps the avatar, the name, the city and country, the local time, the day and
  offset ("Monday 27 Oct · 3h ahead of you") and the moment cards. Moments belong to the
  teammate's city, not to what they share, so they stay. The teammate's pin gives the local
  time alone in its label and its accessible name ("Ahmed Al-Sayed, Dubai, 18:05"). What the
  panel says for a teammate who shares one of the two and not the other is `<TO SUPPLY>`; the
  mocks draw the teammate who shares neither. Such a panel shows what is shared and omits the
  rest. The close button is named
  "Close" and the teammate's name ("Close Tomás Herrera"). Its heading has `tabindex="-1"`, so
  the page can move focus to it. A change of teammate fades in over `--duration-base` (180 ms,
  at most 200 ms); the `prefers-reduced-motion` query removes the fade. There is no "Message"
  button: Mondino has no chat.
- **`OverlapBar`** (`mo-overlap-bar`) — presentation component, the `overlap` block of the
  mocks, designed in `time/show-offset-and-overlap`. `TeammatePanel` gives it the inputs that
  design defines, all from `content`: `overlap` (an `Overlap` or null), `theirDay` (the
  teammate's working day on the viewer's clock, a `DaySpan`), `nowMinute` (the viewer's minute
  of the day), `firstName` and `text` (an `OverlapText`: the `figure` beside the title and the
  `sentence` under the bar). With no overlap it still draws both working days, and the text
  reads "None today".
- **`groupCities(pins, teammateIds, now, settings)`** — pure function in `pins/`. It keeps the
  pins whose teammate id is in the group and gathers them by city. It returns a
  `GroupContent`: the `count` of teammates, the `lead` line and one `GroupCity` for each city,
  the city with the most teammates first and cities of one size west to east. A `GroupCity`
  holds the city's name, its formatted local time and one `GroupRow` for each teammate there:
  teammate id, name, initials, colour and `isViewer`. The local time is the city's, worked out
  once from its time zone, not once for each row. Within a city the viewer comes first, as the
  mock lists them, then the others by name.
- **`GroupPanel`** (`mo-group-panel`) — presentation component, `TeammatePanel`'s sibling, in
  the mocks' `panel` block. It takes `content` and emits `teammateChosen` with a teammate id
  and `closed`. Its heading is the count, "2 teammates close together". Under it the lead
  (`panel__lead`) reads "All in Milan · pick someone to see their pin" when the group is in one
  city, and gives the number of cities when it is in two or more: "3 cities · pick someone to
  see their pin". Then comes one block for each city: the city's name as a heading with the
  city's local time in tabular figures beside it (`panel__city`, `panel__city-time`: "Milan",
  "15:05"), and under it a list of rows (`row-list`). Each row is a link (`a.row`) to that
  teammate's address, which `GroupPanel` builds with the `address` function the page gives it;
  a plain click is taken by the page as `teammateChosen` and does not reload, and a click that
  opens a new tab follows the link. It holds an `Avatar` and the name, followed by "(you)" for
  the viewer; the city and the time are said once, in the block's heading. The head carries a
  close button named "Close" (`panel__head--close`), which emits `closed`. Its heading has
  `tabindex="-1"`. A group pin of a team of 500 stands for as many as 68 teammates in the
  mocks; how the rows of a group of that size are bounded in the page is `<TO SUPPLY>`, since
  the mocks draw the panel for a group of 2.
- **`PinLayer`** (`mo-pin-layer`) — the pins over the globe or the still picture
  (`globe/show-pins`). It emits `selectPin` with a teammate id and `selectGroup` with the group
  pin, and takes the `selectedId` and the `selectedGroupKey` back, which keep the selected pin
  alone, or the group pin together, lifted and pressed. `GlobeView` (`mo-globe`) turns to the
  page's `facing` and holds (`globe/turn-globe`).
- **`GlobePage.focusPin(teammateId)`** — returns focus to the pin, or the group pin, that
  stands for that teammate: the `button.pin` at that placement's place in the page's pin list.
- **`Clock`** (`CLOCK`) — the one injected clock. `panel` is a computed signal that reads the
  clock's minute tick, so the local time, the status and the offset change as the minute passes,
  with no timer of the panel's own.

Focus follows L2-023: a selection came from the keyboard when the pin chosen has keyboard focus
(`:focus-visible`) as it is chosen. Then `GlobePage` moves focus to the panel's heading after the
panel renders, and on close calls `focusPin` with the teammate that was selected.

One polite `role="status"` region under the panel says what was selected, once, as the mocks
word it: "Tomás Herrera, Mexico City, selected.", for the viewer "Sofia Bianchi, you, Milan,
selected.", and for a group "2 teammates close together.". The minute ticking over changes no
announcement.

Under 64 rem the panel (`aside.globe-screen__panel`, named as its heading) is under the globe;
from 64 rem it is beside it, `--layout-panel-width` wide.

A group is held by `TeamStore` alone, as `heldIds`, and is not in the address. On
`selectGroup` the page removes the `teammate` parameter, which clears the selection, sets
`heldIds`, passes the group to `PinLayer` and `placePins` as the held group and renders `GroupPanel`
from `groupCities`; the globe turns to the group pin and holds. A polite `role="status"`
region says "2 teammates close together." once, when the group opens. Choosing a row
navigates to `/globe?teammate={teammateId}`, which empties `heldIds` and opens that
teammate's panel; that teammate's pin then stands alone on the globe. The close button and
Escape empty `heldIds`, and `WeekPanel` returns. A refresh that takes a teammate off
the team drops them from the rows; a group left with one teammate, or none, closes. Focus
follows the same rule as for a teammate's panel: opened from the keyboard, the panel takes
focus on its heading, and closing returns focus to the group pin.

The viewer's time zone is the time zone of the viewer's own pin. The viewer's display settings
(°C or °F, 24-hour or 12-hour clock) start from the country of the viewer's pin
(`defaultTemperatureUnit`, `defaultClockFormat`; ADR 0015) until Profile & Settings stores a
choice in `SettingsCache` (journey 23).

The name, the city and a moment's title are data: `TeammatePanel` renders each as text, never as
HTML.

## Requirements

The feature realises the following level-2 (L2) requirement, which refines a level-1 (L1)
requirement cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-023` | `L1-008` | Selecting a pin opens that teammate in the panel: name, city and country, local time and day, offset from the viewer, status, weather, upcoming moments and the overlap with the viewer. Selecting a group pin lists the teammates it stands for. |

L2-023's criterion for a group pin's panel is realised by `GroupPanel`, and its criterion for a
teammate who shares neither their weather nor their status by the private note.

## Diagrams

### System context

A teammate reads another teammate's panel in Mondino. The weather and moments the panel shows
reach Mondino from Open-Meteo and the calendar sources, through the backend only.

![C4 system context for viewing a teammate's panel](diagrams/c4-context.png)

### Containers

The panel is built in the Mondino web app from pins the Mondino API has already returned. The
API reads the team from the Mondino database and the weather and moments from the outside
sources.

![C4 container view for viewing a teammate's panel](diagrams/c4-container.png)

### Components

Inside the web app, `PinLayer` reports a selected pin to `GlobePage`. `GlobePage` records the
selection in `TeamStore`, asks `teammatePanelView` for the content and passes it to
`TeammatePanel`. A selected group pin goes through `groupCities` to `GroupPanel`.

![C4 component view for viewing a teammate's panel](diagrams/c4-component.png)

### Class structure

`GlobePage` depends on `TeamStore`, the `CLOCK` and `teammatePanelView`, and renders `GlobeView`
and `TeammatePanel`. `TeammatePanelContent` is the only thing `TeammatePanel` receives, and it
owns the `Overlap`, the `DaySpan` and the `OverlapText` that `OverlapBar` draws. `GroupPanel`
presents a `GroupContent`: its `GroupCity` values and their `GroupRow`s.

![Class diagram for viewing a teammate's panel](diagrams/class-structure.png)

### Behaviour — select a pin and open the panel

A selection becomes a navigation to `/globe?teammate={teammateId}`, and the store follows the
address. An id that is not a pin of the team clears the parameter and leaves the week panel in
place. A panel opened from the keyboard takes focus on its heading. A teammate who shares
neither weather nor status gets the private note in place of status, weather and overlap. A
group pin turns the globe to it and opens `GroupPanel`, and choosing one of its rows selects
that teammate.

![Sequence diagram for selecting a pin and opening the panel](diagrams/sequence-select-pin.png)

### Behaviour — close the panel

The close button and Escape both remove the parameter from the address. `TeamStore` clears the
selection, the pin settles back, `WeekPanel` replaces `TeammatePanel`, and focus returns to the
pin when the panel was opened from the keyboard. A group's panel closes the same way: its
close button and Escape empty the group, and `WeekPanel` returns.

![Sequence diagram for closing the panel](diagrams/sequence-close-panel.png)
