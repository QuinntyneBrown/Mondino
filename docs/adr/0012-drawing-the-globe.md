# 0012: The globe is drawn by three.js from a Blender-built glTF model and mask textures

**Status:** Accepted (journey 8, Draw the globe). Builds on
[ADR 0001](0001-frontend-workspace.md) and [ADR 0010](0010-protecting-team-data.md).

## Context

`AGENTS.md` asks that, before the Globe is built, an ADR decides which renderer draws the globe,
the format its Blender-built assets are exported to, and how they are scaled back for a
low-power device. `globe/draw-globe` marks them `<TO SUPPLY>`, with the materials' colours, the
detail steps, the still picture's orientation and its night side.

The constraints are the requirements' and the instructions':

- L2-008: a lit, shaded 3D model with perspective, recognisable continents, raised land, a
  bright ocean with a deeper rim, sand, forest, ice, cloud, an ink outline, a dusk night side;
  served from the app's own origin; a still picture without WebGL; a lower level of detail on a
  low-power device with the same look; no layout shift when it appears.
- L2-010: the night side from the sun's real position, moving as time passes.
- Lazy loading and memory come first: the renderer and the assets never in the initial chunk
  (259.24 kB of a 260 kB warning), everything released when the Globe is left, nothing drawn
  while the tab is hidden.
- The browser asks no other origin for anything, under the CSP of ADR 0010
  (`img-src 'self'; connect-src 'self'`, no `blob:`).
- The globe's colours are the `--color-globe-*` tokens, in light and dark; no colour is written
  in the `globe` library.

## Decision

- **three.js draws the globe** (`three`, MIT, pinned to 0.187), with `WebGLRenderer` on a WebGL 2
  context and one `ShaderMaterial` of Mondino's own. It is the established renderer for the web,
  it has a glTF loader, and it frees what it holds (`dispose`, `forceContextLoss`). It is
  imported dynamically by `GlobeScene.create` after a WebGL 2 context has been obtained, so a
  browser without WebGL never downloads it. A smaller library (OGL, regl) or raw WebGL would save
  bytes in a chunk that is already lazy, at the cost of a loader and lifecycle of our own.
- **The model is glTF binary (`globe.glb`)**, exported by Blender's own exporter from
  `frontend/projects/globe/blender/build_globe.py`, run headless
  (`blender --background --factory-startup --python projects/globe/blender/build_globe.py` from
  `frontend/`). The script reads Natural Earth's 1:50m land from `world-atlas` (a dev
  dependency), models the globe, saves `globe.blend` beside itself and writes the three assets.
  All three are committed, so a build needs no Blender. The model holds three meshes, with
  positions and normals only: `GlobeHigh` (144 × 72 segments) and `GlobeLow` (72 × 36), the
  sphere with the land raised 1.2% of the radius from the sea and rounded, and `Clouds`, a smooth
  shell at 1.02 the clouds are drawn on.
- **The surface is two mask textures, not colours**: `surface.png` (2048 × 1024,
  equirectangular, north at the top: land in red, forest in green, sand in blue, ice in alpha)
  and `clouds.png` (1024 × 512, cloud in red). The shader looks each point up from its direction
  (`atan2`, `asin`), so the model needs no texture coordinates and has no seam, and mixes the
  palette by the masks: ocean, land, then forest, sand and ice over it, the ocean's deeper colour
  toward the rim, a soft key light from the top left with a glossy shine, and the night colour
  over the half facing away from the sun with a short dusk band. `GlobeView` reads the
  `--color-globe-*` tokens from its host (`getComputedStyle`) into a `GlobePalette` and passes it
  to `GlobeScene.setPalette`, again when the colour scheme changes; the scene holds no colour.
  The values are used as written, without a colour-space conversion, so the 3D globe has the
  mocks' colours.
- **The outline and the drop shadow are SVG circles around the canvas**, the mocks'
  `globe__outline` and `globe__shadow`, styled by `--color-globe-outline` and
  `--color-globe-shadow`. The camera's field of view is set so the sphere fills 88% of the box,
  as the mocks' circle of radius 264 in 600 does. They stay crisp at any size and follow the
  theme with no script.
- **Bundled with content-hashed names.** The application builder's `file` loader is set for
  `.glb` and `.png` (`angular.json`); `GlobeScene` imports the three files, so the build emits
  them as `media/globe-<hash>.glb`, `media/surface-<hash>.png` and `media/clouds-<hash>.png` and
  only the lazy chunk knows their addresses. They are fetched from the app's own origin with the
  page's `AbortSignal`; the images are decoded with `createImageBitmap` from the fetched bytes,
  so no `blob:` address is made and the CSP is unchanged. The API serves `.glb` as
  `model/gltf-binary` (ASP.NET Core does not know the extension and would otherwise answer with
  the app shell).
- **Sizes.** `globe.glb` 521 kB, `surface.png` 171 kB, `clouds.png` 30 kB, the scene's chunk
  with three.js 629 kB (130 kB compressed); the `globe` library's own code is about 8 kB in the
  page's chunk. All are cached by their hashed names after the first visit
  (L2-046).
- **Two detail steps.** `High`: the canvas at the device's pixel ratio up to 2, and
  `GlobeHigh`. `Low`: the canvas at a pixel ratio of 1, and `GlobeLow`. A step changes only
  resolution and mesh: lighting, colours, the outline and the pins are the same at both
  (L2-008 criterion 4). Stepping down happens after 3 seconds under 30 frames a second; the
  frame timing and `DetailLevel` are journey 29's (L2-046).
- **The lazy boundary is the renderer, not the component.** `GlobePage` (and `JoinPage`)
  import `GlobeView` directly, so the `globe` library's own code (the component, the scene's
  contract and the sun's position, about 8 kB) is in the page's lazy chunk, and the renderer with
  the scene (`three-globe-scene`, about 630 kB, 130 kB compressed) is the one dynamic import.
  Measured, an `@defer` block around `GlobeView` puts Angular's defer runtime (about 7 kB) into
  the initial chunk, and `NgTemplateOutlet` another 2.8 kB, past the budget, while deferring
  only those 8 kB. A renderer chunk that fails to load is `AssetsFailed`, and the still picture
  shows, which is what `@error` would have done.
- **Drawn on demand.** The scene draws a frame only when something has changed (the sun, the
  size, the palette, the detail, later the orientation) and never while stopped; `GlobeView`
  stops it while the tab is hidden. The minute tick of the screen's clock (`BrowserClock` in
  `domain`) moves the sun once a minute and rests while the tab is hidden. Each screen that reads
  the time binds `CLOCK` to its own `BrowserClock` in its component's providers, so its timer
  and listener go with the screen and its code stays out of the initial chunk; Join and Create
  Team bind it the same way. (Since ADR 0025, `TeamShell` binds one for Globe, Team, Moments and
  Profile & Settings, which the team's refresh also reads.)
- **Released on destroy.** `GlobeScene.dispose` cancels the pending frame, removes the canvas's
  context-loss listener, disposes of every geometry, material and texture, closes the decoded
  images, and calls `renderer.dispose()` and `renderer.forceContextLoss()`. `GlobeView` aborts
  pending loads and disconnects its `ResizeObserver`, colour scheme and visibility listeners.
- **The still picture** is `GlobeFallback`'s bundled SVG, drawn at the one orientation it has
  (`STILL_ORIENTATION`, 10.1° E, 17.4° N, Europe and Africa) and with its night side at one fixed
  hour, the mocks' "now". It shows where `getContext('webgl2')` gives nothing, the assets fail
  to load, the context is lost, or the renderer's chunk fails to load. The 3D globe faces
  the same point when it starts, so the two show the same half of the world.

## Consequences

- The initial bundle grows by about 0.4 kB (Angular's runtime for what `GlobeView` uses): from
  259.24 kB to 259.64 kB, inside the budget.
- A device without WebGL 2 (about 3% of browsers) sees the still picture with its pins working.
- Changing the globe's look means changing the script and running Blender again; the three
  assets are its output and are not edited by hand.
- The e2e specs draw the 3D globe in Chromium's software WebGL (SwiftShader); a spec of the
  still picture turns WebGL off with the fixture's `webgl: false`.
