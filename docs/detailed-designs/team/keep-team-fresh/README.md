# Keep the team fresh

## Overview

Mondino is left open all day in a tab beside the work, and glanced at. A screen left open has to
stay true: the weather changes, moments come and go, and teammates join and leave. This feature
covers how the Mondino web app reads the team again without a reload.

- **teammate** — person who belongs to a team
- **pin** — a teammate's place on the globe, carrying their city, time zone, weather and moments
- **refresh** — reading the team's pins again from the Mondino API and merging them into what the screen holds
- **quiet** — without a loading state, without losing the selected pin and without moving the globe
- **shared clock** — the one clock every local time on a screen ticks from

Two things keep a screen true. Local times, statuses, counts and the grouping of moments by day
are worked out in the browser from the shared clock, so they follow the minute with no request.
The pins themselves (who is on the team, their weather, their moments) come from the backend,
and the `TeamStore` reads them again every 15 minutes while the tab is visible. A hidden tab
makes no request. A tab shown again after 15 minutes or more refreshes at once.

A teammate who joined while the screen was open appears at the next refresh: their pin is added
to the globe, pulses once, and the counts change. No toast is shown for them; the toast "You’re
on the map." is for the person who has just joined (`view-week-around-the-world`).

## Description

The slice runs from the `TeamStore` in the browser to the Mondino database and Open-Meteo.

Frontend:

- **`TeamStore`** — signal store in the app's `team/`, provided by `TeamShell`, the route
  component that holds the Globe, Team, Moments and Profile & Settings screens. It injects
  `TEAM_API`, `TEAM_MEMBERSHIP`, `SETTINGS_STORE` and `CLOCK`. `load()` reads the pins and the
  moments once when the route opens. An effect on the clock's minute tick calls
  `refreshIfDue(minute)`, which calls `refresh()` when `RefreshIntervalMinutes` (15) or more have
  passed since `refreshedAt` and no request is pending (L2-048). The store has no timer of its
  own.
- **`BrowserClock`** — the one shared clock, bound to `CLOCK` by `TeamShell` for its four
  screens, which no longer bind one each (ADR 0025). It ticks each minute, stops its timer while
  the tab is hidden and ticks at once when the tab is shown again. Because the store refreshes
  only on a tick, a hidden tab makes no refresh, and a tab hidden for 15 minutes or more
  refreshes at once on return, with no visibility listener in the store.
- **`refresh()`** — reads the pins and the moments again, side by side, with the same
  `AbortSignal` as the first load. When the pins answer it replaces `team`: the selection
  (`selectedId`, `heldIds`) is the screen's and is kept; a selected teammate who has left is
  cleared by the Globe, as an address naming no pin is. It sets `arrivedIds` to each teammate id
  that was not held before; the first load sets none. When the moments answer it replaces them;
  when they fail the last ones stay. `team` holds one team's pins, at most 500, and each refresh
  replaces them, so nothing accumulates over a day. A 401 or 404 forgets the membership, as the
  first load does (`show-pins`).
- **`arrivedIds`** — ids whose pins are new since the last refresh. `GlobePage` passes them,
  with the just-joined teammate's id, to `pinViews` as the pins that are new; `PinLayer` draws
  each with `pin--new`, which pulses once (not under reduced motion). No toast is shown for
  them. The next refresh replaces the list.
- **`state`** — `Loading`, `Ready`, `Failed` or `Forgotten`, for the first load only. A refresh
  never changes it but to `Forgotten`: a failed refresh keeps the pins held, sets
  `refreshFailed`, and the store tries again at the next minute tick. `Loading` shows skeletons,
  on the Globe screen under the heading "Your team", and announces "Loading your team…".
  `Failed` shows the open screen's own message with "Try again", which calls `load` again: on
  the Globe screen "The globe didn’t load" and "We couldn’t reach Mondino to fetch your team.
  Check your connection — nothing you set has been lost."; on the Team screen "The team didn’t
  load" and "We couldn’t reach Mondino. Check your connection and try again.", with "Back to
  the globe".
- **`refreshFailed`**, **`refreshing`** and **`refreshedAt`** — whether the last refresh
  failed, whether one is pending, and the minute the pins held were read. While
  `refreshFailed` is true `TeamShell` renders `Banner` (`mo-banner`, block
  `banner`) under `AppHeader`, its words alone a polite live region (`banner__text`,
  `role="status"`), so the button turning to "Trying…" is not announced (ADR 0029),, where it also renders the toast: "Couldn’t
  refresh. Clocks are live; weather and moments are from 14:50.", the time being `refreshedAt`
  on the viewer's clock in tabular figures, with the button "Try again", which calls
  `refresh()` at once. On the Team screen, which shows no list of moments, the banner names the
  weather alone ("weather is from 14:50"). While that request is pending (`refreshing`) the
  button reads "Trying…" and is disabled. The screen keeps everything it showed. The next
  refresh that succeeds clears `refreshFailed` and the banner goes, with no message (L2-048,
  L2-049).
- **The viewer's settings** — `TeamPins.viewerSettings` carries the viewer's own saved settings
  (ADR 0025). Each load and refresh hands them to `SETTINGS_STORE.replace`, so a browser that
  has never opened Profile & Settings draws in the saved unit, clock and kinds, and a choice
  saved in another browser reaches this one at the next refresh. An answer without them leaves
  the store as it was.
- **`TeamApi`** (`TEAM_API`) and **`HttpTeamApi`** — contract and HTTP client in the `api`
  library. `getPins(teamId, signal)` calls `GET /api/teams/{teamId}/pins` and returns a
  `TeamPins`. The store passes an `AbortSignal` and aborts the pending request when the route
  is destroyed, which is when the teammate leaves the four screens.
- **`TeamPins`** — type in `api`: `teamId`, `teamName`, `inviteToken`, `viewerTeammateId`,
  `pins` and `viewerSettings`. It mirrors `TeamPinsDto`.
- **Moments across midnight** — the screens group moments (`weekMoments`, `groupMoments` in
  `moments/`) in computed signals that read the clock's minute tick, with today taken in the
  teammate's city. When the clock passes a teammate's midnight, their moments move between
  Today, This week and Later with no request (L2-048).

The globe keeps its position through a refresh because `GlobeView` receives new placements
and an unchanged `facing`; `PinLayer` draws the pins over it and the scene is not rebuilt.

Backend:

- **`TeamsController`** — `GET /api/teams/{teamId}/pins`. It checks nothing itself and sends one
  `GetPinsQuery`. `TeammateSessionHandler` authenticates the session cookie before the
  controller runs.
- **`GetPinsQueryHandler`** — MediatR handler. It reads `ICurrentTeammate`, loads the `Team`
  and its `Teammate` entities through `IAppDbContext`, and refuses when the session's teammate
  does not belong to the team. It reads the weather once for each distinct `City` through
  `IWeatherSource`, finds each city's moments through `MomentFinder`, and returns a
  `TeamPinsDto`. A `PinDto` carries a null `Weather` when the teammate does not share it or the
  source fails, and its `WeatherState` (`Available`, `Unavailable` or `NotShared`) says which;
  the pin is still returned with its time zone.
- **`TeamPinsDto`** — `TeamId`, `TeamName`, `InviteToken`, `ViewerTeammateId`, the `PinDto`
  list and `ViewerSettings`, the asker's own `SettingsDto` (ADR 0025). It carries no postal code,
  no local time, and no other teammate's settings.
- **`CachedWeatherSource`** — decorator over `OpenMeteoWeatherSource` with a 5 second timeout
  (L2-049) and a circuit breaker. Weather is fresh for 15 minutes (L2-018), the interval of a
  refresh, so a refresh usually finds the weather in the cache; a miss sends Open-Meteo a
  position and nothing else.

The interval is one constant, `refreshIntervalMinutes`. Unit tests move a fake clock bound to
`CLOCK`, and the e2e specs move the page's clock; none sleeps. How the web app learns its team id when a teammate returns
on another device is designed in `joining/sign-in` (L2-052), outside this feature.

## Requirements

The feature realises the following level-2 (L2) requirement, which refines a level-1 (L1)
requirement cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-048` | `L1-015` | A screen left open stays true: weather, moments and the team itself are refreshed quietly. |

The banner is also what L2-049 asks of a screen when the backend cannot be reached; the rest of
L2-049 is designed in `platform/survive-source-failure`.

## Diagrams

### System context

A teammate leaves Mondino open. Mondino reads the weather from Open-Meteo and the moments from
the calendar sources, so what the teammate sees stays current.

![C4 system context for keeping the team fresh](diagrams/c4-context.png)

### Containers

Every 15 minutes while the tab is visible, the Mondino web app reads the team's pins from the
Mondino API. The API reads the team from the Mondino database and the weather and moments from
the outside sources, through its caches.

![C4 container view for keeping the team fresh](diagrams/c4-container.png)

### Components

In the web app, `BrowserClock` ticks `TeamStore`, which calls `HttpTeamApi`. In the API,
`TeamsController` sends `GetPinsQuery` to `GetPinsQueryHandler`, which reads the database,
`CachedWeatherSource` and `MomentFinder`.

![C4 component view for keeping the team fresh](diagrams/c4-component.png)

### Class structure

`TeamStore` depends on the `Clock` and `TeamApi` contracts and merges a `TeamPins`.
`GetPinsQueryHandler` builds the `TeamPinsDto` from `IAppDbContext`, `IWeatherSource` and
`MomentFinder`, for the teammate `ICurrentTeammate` names.

![Class diagram for keeping the team fresh](diagrams/class-structure.png)

### Behaviour — a quiet refresh brings in a new teammate

A minute tick finds 15 minutes passed, and the store reads the pins again. The handler returns
every teammate's pin with weather or null. The store merges them, keeps the selection, and
reports the new teammate's id, whose pin is drawn and pulses once. A failed refresh keeps
the pins held and shows the banner, with "Try again", until a refresh succeeds.

![Sequence diagram for a quiet refresh that brings in a new teammate](diagrams/sequence-quiet-refresh.png)

### Behaviour — a hidden tab, and the return to it

`BrowserClock` stops while the tab is hidden, so no tick reaches the store and no refresh is
made. On return the clock ticks at once; the store refreshes when 15 minutes or more have
passed, and otherwise waits for the tick that completes them.

![Sequence diagram for a hidden tab and the return to it](diagrams/sequence-hidden-and-return.png)
