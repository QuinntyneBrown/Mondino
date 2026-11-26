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
- **detail level** — step on a scale of the globe's geometry, texture and drawing resolution
- **windowed list** — list that keeps in the page only the rows near the visible part

The globe's renderer and the format its Blender-built assets are exported to are decided in an
ADR before the Globe is built; both are `<TO SUPPLY>`. This design fixes what holds whichever
renderer is chosen.

## Description

**Load only what is needed now (L2-046).**

- **Lazy routes.** Each screen is loaded with `loadComponent` (`adapt-to-every-width`), so a
  screen's code arrives when its address is opened.
- **The `globe` library is imported dynamically.** No file in the initial bundle imports
  `@mondino/globe` statically. `GlobePage`, `JoinPage` and `ProfilePage` place `mo-globe`
  inside a `@defer` block, which imports the library, its renderer and its map data when a
  globe is first drawn. The block's placeholder reserves the globe's box, so the layout does
  not shift when the globe arrives.
- **The screen is usable before the globe.** `GlobePage` renders its heading, counts and panel
  from `TeamStore` without waiting for the `@defer` block.
- **Budgets.** `angular.json` sets an error budget on the initial bundle that corresponds to
  150 kB compressed, and `tools/verify/verify.mjs` measures the compressed size of the built
  initial chunks. Raising a budget needs a reason in the change. Fonts are self-hosted, subset
  and preloaded; only the weights the screens use are bundled.
- **Assets are cached.** The globe's assets and each chunk have content-hashed file names and
  are served with a long-lived, immutable `Cache-Control`. The hosting platform that sets the
  header is `<TO SUPPLY>`.
- **`DetailLevel`** — class in `globe`, owned by `GlobeScene`. `GlobeScene` passes it each
  frame's duration through `sample(frameMs)`. When the frame rate stays under 30 for a
  sustained interval, `stepDown()` lowers the detail level and the drawing resolution, and
  repeats until the frame rate recovers. The steps and the interval are `<TO SUPPLY>` with the
  renderer's ADR.
- **`GlobeFallback`** — still picture shown when WebGL is unavailable. It allocates no
  renderer.
- **Interactions stay under 200 ms.** State is held in signals, every component is `OnPush`
  and the app is zoneless, so a selection or a filter re-renders only what reads the changed
  signal.
- **The backend answers a team of 500 quickly.** `GetPinsQueryHandler` loads the team's
  teammates in one query without tracking, and weather comes from the cache
  (`survive-source-failure`). The `Mondino API` compresses its responses. The 95th-percentile
  target is 300 ms.

**Release everything acquired (L2-047).**

- **`GlobeView`** owns one `GlobeScene` for as long as it is on the page. It registers its
  teardown with `DestroyRef`: it removes its pointer listeners, disconnects its
  `ResizeObserver` and calls `GlobeScene.dispose()`.
- **`GlobeScene.dispose()`** cancels the pending animation frame and releases the model, its
  materials and textures, the renderer and the WebGL context. After it returns, the scene
  holds nothing. `GlobeScene.stop()` and `start()` pause and resume the render loop without
  releasing anything.
- **`TeamStore`** is provided on the parent route of the four teammate screens, not in `root`.
  It holds the subscription to its pending read; its 15-minute refresh runs from the one
  clock's minute tick, so it has no timer of its own (`keep-team-fresh`). When it is
  destroyed, or when a newer read starts, it ends the subscription, which cancels the
  HTTP request. A page that starts its own request ties it to `takeUntilDestroyed`, so leaving
  a screen cancels the request.
- **Scoped state.** A screen's own state (a filter, a draft of the settings) lives in the page
  component or a service it provides, and goes when the teammate leaves the screen.

**One clock, and it rests (L2-047).**

- **`Clock`** / `CLOCK` — contract and token in `api`: `now(): Date` and the signal `minute`.
- **`BrowserClock`** — the one implementation, in `domain`'s `time/`, bound in
  `app.config.ts`. It holds one timer, aligned to the start of the next minute, and sets
  `minute` when it fires. Every local time, status, offset and overlap is a `computed` over
  `minute` and a pin's time zone; no pin and no component has a timer of its own.
- On `visibilitychange` to hidden, `BrowserClock` clears its timer. On return it sets `minute`
  at once and schedules again, so local times, statuses and the night side are correct at
  once.
- `GlobeView` listens for the same event and calls `GlobeScene.stop()` while the tab is hidden
  and `start()` when it returns. No frame is drawn while hidden.

**Bound what grows (L2-047).**

- **`TeamTable`** and **`MomentList`** render their rows through CDK virtual scrolling
  (`cdkVirtualFor`), so the number of rows in the page stays under a fixed limit for a team of
  500. The limit follows from the viewport's height and the buffer; the buffer size is
  `<TO SUPPLY>`.
- `TeamStore` replaces its pins on each refresh; it keeps no history. A team has at most 500
  teammates (`Team.MaxTeammates`).
- `PinLayer` groups close pins (`spreadPins`), so the labels drawn at once are bounded by the
  globe's size, not the team's.

**Prove it.** A heap check enters and leaves the Globe screen 20 times and compares the heap
after garbage collection with its size after the first visit; a second check runs the Globe
screen for 8 simulated hours on a fake clock. Each allows growth of 5%. Like the visual and
accessibility sweeps, the heap checks run only when a person asks.

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

`app.routes.ts` loads the Globe chunk. `GlobePage` shows its text first, then defers
`GlobeView`, which creates and disposes `GlobeScene`. `GlobeScene` reports frame times to
`DetailLevel`. `GlobePage` and `GlobeScene` read the one `BrowserClock`.

![C4 component view for staying fast and light](diagrams/c4-component.png)

### Class structure

`BrowserClock` implements `Clock`. `GlobeView` composes `GlobeScene`, which composes
`DetailLevel`; `GlobeView` uses `GlobeFallback` when WebGL is unavailable. `GlobePage` depends
on `TeamStore`, `Clock` and, through a dynamic import, `GlobeView`. `TeamTable` and
`MomentList` render windowed rows.

![Class diagram for staying fast and light](diagrams/class-structure.png)

### Behaviour — enter and leave the Globe screen

On entry, the router loads the Globe chunk, `GlobePage` shows its heading, counts and panel,
and the `@defer` block imports `@mondino/globe` and starts `GlobeScene` (L2-046). While the
screen is open, `DetailLevel` steps down when the frame rate stays under 30, one clock ticks
every local time, and both the clock and the render loop rest while the tab is hidden. On
leaving, the pending read is cancelled, `GlobeView` removes its listeners and observer, and
`GlobeScene.dispose()` releases the renderer and the WebGL context (L2-047).

![Sequence diagram for entering and leaving the Globe screen](diagrams/sequence-enter-and-leave-globe.png)
