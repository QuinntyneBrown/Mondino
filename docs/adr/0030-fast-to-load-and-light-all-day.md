# 0030: The globe is drawn first from a light model, the API compresses and caches, detail steps down after 3 seconds under 30 frames a second, and a model of the phone's connection proves the load

**Status:** Accepted (journey 29, Stay fast and light). Tightens the budget of
[ADR 0018](0018-initial-bundle-budget.md); splits the model of [ADR 0012](0012-drawing-the-globe.md)
in two and builds its `DetailLevel`.

## Context

L2-046 asks that the Globe screen be shown within 2.5 seconds and its 3D globe spun within 5 on a
mid-range phone on 4G (1.6 Mbps, 150 ms), with the heading, the counts and the panel usable before
the globe; that the initial bundle stay under 150 kB compressed without the renderer or its
assets; that the globe's assets be cached by content-hashed addresses; that the team of 500 be
read within 300 ms at the 95th percentile, compressed; and that a device whose frame rate stays
under 30 step its detail down. `stay-fast-and-light` left the detail steps and the interval, the
hosting that sets the cache header, and the Moments buffer `<TO SUPPLY>`.

Measured on journey 28's build, opening the Globe fetched 37 requests:

| What | Compressed (gzip) |
|---|---|
| The page, `main` and the styles | 88 kB |
| The teammate shell, the Globe's chunk and the chunks they import | 50 kB |
| The still picture (`GlobeFallback`), imported by the Globe's chunk though only a globe that cannot be drawn shows it | 44 kB |
| Inter and Gabarito (latin) | 82 kB |
| The renderer (three.js and the scene) | 160 kB |
| `globe.glb`: `GlobeHigh`, `GlobeLow` and `Clouds` together | 317 kB |
| `surface.png` and `clouds.png` | 195 kB |

Nothing was compressed in production: `Mondino.Api` serves the build from `wwwroot` with
`UseStaticFiles` and no compression, and sets no `Cache-Control` on the hashed files.

A browser test cannot time a phone on 4G: Chromium's throttling runs on the wall clock, the specs
run on a fake one, and CI's machines vary. The time can be worked out from what is fetched.

## Decision

- **A model of the phone's connection proves the load (L2-046 criteria 1 and 2).** The spec
  `globe-load` records every request of a first visit. Each request is placed one round trip
  after the deepest request that had arrived before it was sent (the page first, and what its
  first bytes name one trip after it). The time to a request is three round trips to open the
  connection, one per trip, and every byte of the earlier trips at 1.6 Mbps, as if no byte and
  no round trip overlapped; on the last trip, each request sent alongside the awaited ones takes
  at most as many bytes as the largest of them. Text (scripts, styles, the page, JSON, SVG and the
  model) is counted gzipped, as the API sends it; images and fonts as they are. The screen is
  shown when the team's pins have arrived and the globe drawn when its assets have; what either
  brings in after it (a font swapped in, the high model) is not waited for, since the fonts are
  `font-display: swap` and a font swapped in does not move the largest contentful paint. With
  this change the Globe is shown at 2.28 s and its globe drawn at 4.79 s (2.49 s and 5.45 s
  before it). The layout shift is read from Chromium's `layout-shift` entries, added up. The real
  phone's processor is not modelled; the performance sweep measures the largest contentful paint
  on a throttled connection when a person asks.
- **The globe is drawn first from a light model.** `build_globe.py` exports two files:
  `globe-low.glb` (`GlobeLow` and `Clouds`, 153 kB, 72 kB gzipped) and `globe-high.glb`
  (`GlobeHigh`, 369 kB, 215 kB gzipped). `ThreeGlobeScene` draws its first frame from the low
  file, fetches the high one after that frame while the step asks for it, shows it when it arrives
  and gives the fetch up when the step goes down or the scene is disposed. A high model that fails
  to arrive leaves the low one; the look is the same (L2-008 criterion 4).
- **The still picture is deferred on the Globe screen.** It is 116 kB of drawing that only a
  globe that cannot be drawn shows. The Globe screen places it in `@defer (on immediate)` and
  imports it through a second entry of the library, `@mondino/components/globe-fallback`, in an
  import of its own, so that Angular can make it a dynamic import: a deferred dependency that
  shares its import with eager ones, or comes through the library's own entry, is loaded with
  the page. `@defer` adds 6.75 kB raw (1.9 kB compressed) to the initial bundle, one of the
  features ADR 0018 paid for.
- **The initial bundle is measured compressed, and its raw budget is tightened.** The spec
  gzips the page and every script and style it names: 88 kB against the requirement's 150. The
  build's raw budget follows what it measures, 281.16 kB: a warning at 285 kB and an error at
  290 kB (they were 290 and 300). One journey remains, and it is the backend's.
- **The API compresses and caches.** `UseResponseCompression`, before everything else that
  writes a body, compresses with Brotli or gzip (`CompressionLevel.Optimal`), over HTTPS too, the
  default text types with `text/javascript`, `image/svg+xml`, `model/gltf-binary` and
  `application/problem+json`. A file whose name ends in a dash and an eight-character hash (the
  build's `main-GZTTDSGM.js`, `chunk-BD9bS9K-.js`, `media/globe-low-X5QDMBZT.glb`) is served with
  `Cache-Control: public, max-age=31536000, immutable`; every other file with `no-cache`, as
  `index.html` already is. Compression over HTTPS is safe here from BREACH: no response puts a
  secret beside text a stranger chooses and can have the browser ask for again and again; the
  pins, which carry the invite link beside teammates' names, are read once in 15 minutes by a
  teammate's own browser.
- **Detail steps down after 3 seconds under 30 frames a second (L2-046 criterion 6).**
  `DetailLevel`, in `globe`, takes each frame's time from `GlobeScene.onFrame`. Frames that
  follow one another are counted in windows of 3 seconds; a 0, the first frame after a rest, ends
  the window without a verdict. A window whose frame rate is under 30 moves to the next lower
  step (`detailSteps`: `High`, the device's pixel ratio up to 2 and `GlobeHigh`; `Low`, a pixel
  ratio of 1 and `GlobeLow`), and `GlobeView` calls `GlobeScene.setDetail`. A window at 30 or
  more is the frame rate recovered, and the level stays. It never steps back up within a visit:
  a device that could not hold 30 frames would step up and down again.
- **The Moments list's buffer** is ADR 0021's window of 60 rows, not CDK virtual scrolling.
- **The heap and the frame rate are sweeps.** A `performance` project in
  `playwright.sweeps.config.ts` (`npm run e2e:performance`) holds the heap checks (the Globe for
  8 simulated hours; 20 enters and leaves of the Globe, a team of 500, Team and Moments, each
  within 5% after garbage collection), the frame rate while a team of 100 is dragged, the
  response to an interaction and the largest contentful paint on a throttled connection. Like the
  other sweeps, it runs only when a person asks.

## Consequences

- The renderer, the low model and the masks reach a phone on 4G within the 5 seconds; the high
  model follows only while the device keeps the finer step, and a slow device never downloads it
  once it has stepped down.
- Adding 40 kB to what the Globe's first visit needs breaks the model's 5 seconds, and 45 kB
  to what its screen needs breaks the 2.5: `globe-load` is the budget for both.
- `globe.glb` is gone; specs that looked for it look for `globe-low` and `globe-high`.
- A second entry of a library is the way to defer one of its components from a screen that uses
  others; it is a path in `tsconfig.json` and a file beside `public-api.ts`.
- Whatever serves the app must compress and cache as `Mondino.Api` does; Azure App Service runs
  `Mondino.Api` itself (ADR 0004), so no setting of the host is involved.
