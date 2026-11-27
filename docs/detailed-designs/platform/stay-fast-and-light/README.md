# Stay fast and light

## Overview

Mondino is left open all day, in a tab beside the work, and glanced at. Its globe is a 3D
scene, the heaviest thing in the application. This feature covers the parts that keep Mondino
quick to open on a phone, smooth to turn on an ordinary laptop, and no heavier at the end of
the day than at the start: what is loaded when, what is released when a screen is left, the
one clock that drives every local time, and the limit on how many rows a long list holds.

Lazy loading and memory management are the frontend's first priority. A change that grows the
initial bundle or leaks memory is not done, whatever else it achieves.

The terms used below:

- **initial bundle** — code the browser downloads before the first screen is shown
- **reference phone** — mid-range phone on a 4G connection throttled to 1.6 Mbps and 150 ms
- **reference laptop** — laptop with integrated graphics
- **detail step** — one level of resolution and model detail at which the globe's scene can be drawn
- **windowed list** — list that keeps in the page only the rows near the visible part
- **city section** — part of the Team list of a large team that holds one city's teammates and opens and closes

The globe's renderer is three.js on WebGL 2, drawing a Blender-built glTF model and two mask
textures (ADR 0012). What this feature adds to it, and how the load is proven without a stopwatch,
is ADR 0030.

## Description

**Load only what is needed now (L2-046).**

- **Lazy routes.** Each screen is loaded with `loadComponent` (`adapt-to-every-width`), so a
  screen's code arrives when its address is opened. Sign In (`/sign-in`), Create Team (`/new`)
  and the pages that say one thing are routes of their own, so a teammate who opens the Globe
  downloads none of them. Each of those routes binds its own API token (`SIGN_IN_API`,
  `TEAM_CREATION_API`) and provides its own store, which keeps the clients out of the initial
  bundle and lets the state go with the route.
- **The invite dialog is loaded on demand.** `InviteDialogOpener` imports `InviteDialog`
  dynamically when "Invite teammate" is first chosen (`invite-teammates`). The dialog, with
  `CopyField`, is in a chunk of its own: it is in no screen's chunk and not in the initial
  bundle, although the button that opens it is in the header of every teammate screen.
  `LeaveTeamDialog` and `DiscardChangesDialog` arrive with the `/profile` route.
- **The globe's renderer is imported dynamically.** No file in the initial bundle imports
  `@mondino/globe`. The screens that draw a globe import `GlobeView` into their own lazy chunk
  (about 8 kB of the library's own code); `GlobeScene.create` imports the renderer, three.js with
  the scene (160 kB compressed), only once a WebGL 2 context has been had, and then fetches the
  assets (ADR 0012). The globe's placeholder reserves its box, so the layout does not shift when
  the globe arrives.
- **The globe is drawn first from a light model.** The model is two files: `globe-low.glb`
  (`GlobeLow` and `Clouds`, 72 kB compressed), which the first frame is drawn from, and
  `globe-high.glb` (`GlobeHigh`, 215 kB compressed), which `GlobeScene` fetches after the first
  frame while the step asks for it and shows when it arrives (ADR 0030).
- **The still picture is deferred on the Globe screen.** `GlobePage` places `GlobeFallback` in
  `@defer (on immediate)`, imported through `@mondino/components/globe-fallback`, so its 116 kB of
  drawing arrives only where the globe cannot be drawn.
- **The screen is usable before the globe.** `GlobePage` renders its heading, counts and panel
  from `TeamStore` without waiting for the renderer or the model.
- **Budgets.** The behaviour spec `globe-load` gzips the page and every script and style it
  names, and fails above 150 kB; it also finds no renderer and no asset of the globe in them.
  `angular.json` warns at 285 kB and fails at 290 kB raw, just above what the build measures
  (ADR 0030). Raising a budget needs a reason in the change. Fonts are self-hosted, subset to
  latin and latin-ext, and `font-display: swap`.
- **The load is proven by a model of the phone's connection.** `globe-load` places each request
  one round trip after the deepest one that had arrived before it was sent, and counts three
  round trips to connect, one per trip and every byte at 1.6 Mbps, as an upper bound: the screen
  is shown when the pins have arrived (2.5 s at most) and the globe drawn when its assets have
  (5 s at most). The layout shift is read from Chromium's `layout-shift` entries (ADR 0030).
- **Assets are cached.** The globe's assets and each chunk have content-hashed file names
  (`name-XXXXXXXX.ext`). `Mondino API`, which serves the build on Azure App Service (ADR 0004),
  sends each with `Cache-Control: public, max-age=31536000, immutable`, and everything else,
  `index.html` among it, with `no-cache`.
- **Responses are compressed.** `Mondino API` compresses with Brotli or gzip: scripts, styles,
  the page, JSON, SVG and the model (`model/gltf-binary`).
- **`DetailLevel`** — class in `globe`, owned by `GlobeView` (`draw-globe`). It holds the
  ordered `DetailStep`s (`pixelRatio`, `modelDetail`) from `detailSteps` and the current one:
  `High`, the device's pixel ratio up to 2 and `GlobeHigh`; `Low`, a pixel ratio of 1 and
  `GlobeLow`. `GlobeView` passes it each frame's duration, which `GlobeScene.onFrame` reports,
  through `record(elapsedMs)`, which returns the next step when the level changes. Frames that
  follow one another are counted in windows of 3 seconds (a 0, the first frame after a rest, ends
  a window without a verdict); a window under 30 frames a second moves to the next lower step,
  and `GlobeView` calls `GlobeScene.setDetail(step)`, which lowers the model's detail and the
  drawing resolution. A window at 30 or more is the frame rate recovered: the level stays, and it
  never steps back up within a visit (ADR 0030).
- **`GlobeFallback`** — component in `components`: the still picture shown when WebGL is
  unavailable or the `globe` library fails to load. It allocates no renderer and runs no
  animation frame. It keeps the team's pins, in place and working, drawn as HTML over the
  picture (`draw-globe`, `show-pins`); it does not turn and is not dragged, so it holds no
  pointer listener for dragging. `NoticePage` draws its small globe the same way, as a
  picture.
- **Interactions stay under 200 ms.** State is held in signals, every component is `OnPush`
  and the app is zoneless, so a selection or a filter re-renders only what reads the changed
  signal.
- **The backend answers a team of 500 quickly.** `GetPinsQueryHandler` loads the team's
  teammates in one query without tracking, and weather comes from the cache
  (`survive-source-failure`), asked once per city. The `Mondino API` compresses its responses;
  the answer for 500 is at most 24 kB compressed. The 95th-percentile target is 300 ms, timed
  only in the performance sweep (`dotnet test --filter Category=Performance`).

**Release everything acquired (L2-047).**

- **`GlobeView`** owns one `GlobeScene` for as long as it is on the page. It registers its
  teardown with `DestroyRef`: it removes its pointer listeners, disconnects its
  `ResizeObserver` and calls `GlobeScene.dispose()`.
- **`GlobeScene.dispose()`** cancels the pending animation frame and releases the model, its
  materials and textures, the renderer and the WebGL context. After it returns, the scene
  holds nothing. `GlobeScene.stop()` and `start()` pause and resume the render loop without
  releasing anything.
- **`TeamStore`** is provided by `TeamShell`, the parent route of the four teammate screens,
  not in `root`. It holds the `AbortController` of its pending read; its 15-minute refresh runs
  from the one clock's minute tick, so it has no timer of its own (`keep-team-fresh`). When it
  is destroyed, or when a newer read starts, it aborts, which cancels the
  HTTP request. A page that starts its own request ties it to `takeUntilDestroyed`, so leaving
  a screen cancels the request.
- **Scoped state.** A screen's own state (a filter, a draft of the settings) lives in the page
  component or a service it provides, and goes when the teammate leaves the screen. An email
  typed on Sign In or Create Team, a postal code and a city search go the same way.
- **Timers that count down.** The toast's 4 s dismissal (`InviteLinkCopier`), the rate limit
  countdown and the pause before a city search (`JoinStore`) are each one timer, cleared when
  it ends and when its owner is destroyed. A pending city search is aborted when a newer one
  starts and when the route is left.

**One clock, and it rests (L2-047).**

- **`Clock`** / `CLOCK` — contract and token in `api`: `now(): Date` and the signal `minute`.
- **`BrowserClock`** — the one implementation, in `domain`'s `time/`, bound by `TeamShell` for
  Globe, Team, Moments and Profile & Settings (ADR 0025), and by Join and Create Team for their
  own screens. It holds one timer, aligned to the start of the next minute, and sets
  `minute` when it fires. Every local time, status, offset and overlap is a `computed` over
  `minute` and a pin's time zone; no pin and no component has a timer of its own.
- On `visibilitychange` to hidden, `BrowserClock` clears its timer. On return it sets `minute`
  at once and schedules again, so local times, statuses and the night side are correct at
  once.
- `GlobeView` listens for the same event and calls `GlobeScene.stop()` while the tab is hidden
  and `start()` when it returns. No frame is drawn while hidden.

**Bound what grows (L2-047).**

- **The Team list** is bounded by its sections, not by virtual scrolling. Past
  `LargeTeamThreshold` (40) teammates it is split into one `CitySection` per city; a closed
  section holds no rows, and an open one holds at most `CityRowLimit` (50)
  (`view-team-through-the-day`, L2-056). The day ribbon of such a team is 48 bars, whatever
  the team's size.
- **The Moments list** keeps a window of 60 rows in the page past 60 moments, moved by the page
  as it is scrolled (`momentWindow`, ADR 0021), so the rows in the page stay under a fixed limit.
- **The Globe's panel** lists at most six moments and six teammates in working hours
  (`view-week-around-the-world`).
- `TeamStore` replaces its pins on each refresh; it keeps no history. A team has at most 500
  teammates (`Team.MaxTeammates`).
- `GlobePage` groups close pins (`groupPins`, through `placePins`), so the pins and labels
  drawn at once are bounded by the globe's size, not the team's: a team of 500 is drawn as
  group pins with counts.

**Prove it.** The behaviour specs prove what is counted: the bytes and round trips of a first
visit, the layout shift, the initial bundle, the step down by the frame times the browser
reports, one clock however many pins, nothing drawn while hidden, the requests cancelled, the
WebGL contexts, listeners and observers released. The `performance` sweep (`npm run
e2e:performance`) holds what only a measurement of the running app can show: a heap check
enters and leaves the Globe screen, a team of 500, Team and Moments 20 times and compares the
heap after garbage collection with its size after the first visit; a second runs the Globe
screen for 8 simulated hours on a fake clock; each allows growth of 5%. It also measures the
frame rate while a team of 100 is dragged, the response to an interaction and the largest
contentful paint on a throttled connection. Like the visual and accessibility sweeps, it runs
only when a person asks.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a
level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-046` | `L1-015` | Mondino opens quickly on a phone and the globe turns smoothly on an ordinary laptop. The reference devices are a mid-range phone on a 4G connection (throttled 1.6 Mbps, 150 ms) and a laptop with integrated graphics. |
| `L2-047` | `L1-015` | Mondino is left open all day. It uses no more memory at the end than at the start, and every screen gives its memory back when the teammate leaves it. |

## Diagrams

### System context

A teammate opens Mondino, glances at it and leaves it open all day. No outside system takes
part in this feature.

![C4 system context for staying fast and light](diagrams/c4-context.png)

### Containers

The `Mondino web app` keeps its initial bundle small and loads the `globe` library and its
assets on first draw. The `Mondino API` answers a team of 500 within 300 ms at the 95th
percentile, compressed.

![C4 container view for staying fast and light](diagrams/c4-container.png)

### Components

`app.routes.ts` loads the Globe chunk. `GlobePage` shows its text first, beside `GlobeView`,
which imports the renderer dynamically, creates and disposes `GlobeScene` and reports its frame
times to `DetailLevel`. `GlobePage` and `GlobeView` read the one `BrowserClock`.

![C4 component view for staying fast and light](diagrams/c4-component.png)

### Class structure

`BrowserClock` implements `Clock`. `GlobeView` composes `GlobeScene` and
`DetailLevel`; `GlobePage` defers the `GlobeFallback` it shows when WebGL is unavailable.
`GlobePage` depends on `TeamStore`, `Clock` and `GlobeView`, which imports the renderer
dynamically. `TeamTable` and `MomentList` hold a bounded number of rows.

![Class diagram for staying fast and light](diagrams/class-structure.png)

### Behaviour — enter and leave the Globe screen

On entry, the router loads the Globe chunk, `GlobePage` shows its heading, counts and panel,
and `GlobeView` imports the renderer, draws from the low model and fetches the high one after
its first frame (L2-046). While the
screen is open, `DetailLevel` steps down when the frame rate stays under 30, one clock ticks
every local time, and both the clock and the render loop rest while the tab is hidden. On
leaving, a pending request of the page's own is cancelled, `GlobeView` removes its listeners and observer, and
`GlobeScene.dispose()` releases the renderer and the WebGL context (L2-047).

![Sequence diagram for entering and leaving the Globe screen](diagrams/sequence-enter-and-leave-globe.png)
