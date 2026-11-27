# Lessons learned

One entry per journey of [`journeys.md`](journeys.md), added when it finishes: what slowed it,
new lessons, and how each earlier lesson it applied worked. Read it before the next journey and
apply the lessons that fit.

## Journey 1: Scaffold the workspace

**What slowed it**

- The docs were behind the mocks. The mocks' second transcription cited L2-052 to L2-056, which
  were not written, and the prompts still said sign-in and making a team were not designed. The
  journeys, prompts and requirements were brought in line before any code. A second branch wrote
  the same requirements and their designs at the same time; its wording was kept when the two
  merged, and the journeys and prompts were renumbered to match.
- `ng add angular-eslint` installs the packages and writes no configuration in a workspace made
  with `--create-application=false`. The configuration was written by hand.
- A library's public API pulled every component into the initial bundle (+55 kB) until each
  library had a `package.json` with `"sideEffects": false`.
- Angular's unit-test builder needs a build target, and a library read from source has none. A
  library's test target borrows the application's (`buildTarget`).
- `@axe-core/playwright` brought a second `playwright-core`, whose types did not match
  `@playwright/test`'s. An `overrides` entry keeps one version.
- The Angular router rewrites an address it can parse differently (`=` and parentheses in a
  path), so a spec that asserts the address shown must use one the router leaves alone.

**Lessons**

1. **Check the bundle after adding a component to a library.** Build and read the chunk table:
   a component only a lazy route uses must be in that route's chunk, not in the initial bundle.
2. **A link's `href="#main"` navigates to the root in an Angular app** (the base is `/`). "Skip
   to content" moves focus itself and leaves the address alone; each screen's `main` has
   `id="main"` and `tabindex="-1"`.
3. **A presentation component cannot style what a screen projects into it.** Give it inputs for
   the text it styles (`NoticePage` takes `lead`, `emphasis` and `rest`) and keep slots for
   whole elements, such as the actions.
4. **Put ids inside an inline SVG in the component's own name.** The still globe's clip paths
   are `mo-globe-fallback-*`, so two pictures on one page do not collide.
5. **Run the spec before the page exists.** The harness's guard reported the router's own error
   for an unknown address, which proved the guard as well as the missing page.
6. **Bring the docs in line first.** When a mock cites a requirement that is not written, write
   the requirement before the prompt and the prompt before the code.
7. **Keep MediatR on 12.** A newer version needs a commercial licence (ADR 0003).
8. **In this cloud container .NET 10 comes from `apt` (`dotnet-sdk-10.0`)**; Microsoft's
   download hosts are not reachable, and NuGet is.
9. **A picture transcribed from a mock goes stale when the mock is redrawn.** The still globe was
   transcribed (and simplified) before the mock's globe was redrawn, so Not Found drew the old
   picture while every spec passed. Its acceptance test now reads the mock's markup and compares
   the globe shape for shape; transcribe such a picture exactly, never simplified, so the
   comparison holds.

**Earlier lessons applied:** none; this is the first journey.

## Journey 2: Open an invite link

**What slowed it**

- The Join mocks drew each bare pin in its teammate's colour, the same colour as the initials
  beside the team's name, which tied a set of initials to a city against L2-001. The mocks, the
  design system and the requirement were brought in line (bare pins in the pin colour) before
  any code.
- `HttpClient`, bound only at Join's lazy route, still landed in the initial bundle (+35 kB):
  `@angular/platform-browser` imports `@angular/common/http`, so that module is in the initial
  chunk and whatever any screen uses of it stays there. The clients call `fetch` instead
  (ADR 0005).
- Angular's runtime for `@for`, `@switch` and `effect` joins the initial chunk the first time any
  lazy screen uses them (+15 kB), so the budget was raised once, with the reason in ADR 0005.
- The still globe's pins had to land where the mock draws them. The projection's centre was
  fitted from the mock's own pin positions (10.1° E, 17.4° N), and a spec compares every pin
  with the mock's markup.
- `dotnet ef` writes migrations the analyzers reject (block namespaces, constant arrays). The
  migrations folder has an `.editorconfig` that marks them as generated code.
- `node tools/verify/verify.mjs | tail` hides the script's exit code behind `tail`'s: a failing
  unit test passed unnoticed into a commit, and was folded back into it before pushing.

**Lessons**

1. **Measure the initial bundle before choosing a platform service.** A module the root already
   imports keeps everything a lazy screen uses of it in the initial chunk; build and read the
   chunk table before and after.
2. **Read a mock for what it leaks, not only for what it draws.** A colour, an order or a count
   can tie an anonymous thing to a person; where the mock does, the requirement wins and the
   mock records the departure.
3. **Fit a still picture's projection from the mock, then test against the mock's markup.** The
   pins spec parses `pages/join/default.html` and compares every pin within half a percent.
4. **The browser logs every refused request as a console error.** The e2e guard ignores "Failed
   to load resource"; unanswered requests are still caught by the API fixture.
5. **A spec that presses a key waits for the screen first.** "Skip to content" failed once when
   Tab was pressed before the page had rendered.
6. **Check the verify script's own exit code** (`node tools/verify/verify.mjs; echo $?`), never
   through a pipe.

**Earlier lessons applied**

- *Check the bundle after adding a component to a library* (journey 1, lesson 1): it caught
  `HttpClient` in the initial bundle before the first commit of the frontend slice.
- *Bring the docs in line first* (lesson 6): the bare pins' colour was changed in the mocks, the
  design system, L2-001 and the design before any code; it cost one commit and no rework.
- *Run the spec before the page exists* (lesson 5): every frontend slice's spec failed first on
  the missing screen or state, and the already-joined spec passed early, which showed that slice 3
  had built it.
- *A picture transcribed from a mock goes stale* (lesson 9): the pins spec compares with the mock's
  markup rather than with numbers copied from it.
- *Keep MediatR on 12* (lesson 7): held; `GetInviteQuery` is the first handler.
