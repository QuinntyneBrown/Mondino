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

## Journey 3: Place a pin from a postal code

**What slowed it**

- The prompt said a lookup that is down "says the postal code could not be checked", with "Try
  again"; the mock, L2-004 and the design say "Your city" takes the postal code's place. The mock
  won, and the prompt was brought in line. "Your city"'s list was drawn only closed, so
  `pages/join/choosing-city` and the design system's listbox were drawn before any code.
- No postal code source answers a city, a region, the city's own position and a time zone for
  the thirteen countries, and none covers Ghana or the UAE (ADR 0006). Mondino holds GeoNames'
  cities itself and resolves the source's place to one of them, which is also what keeps a pin
  off the postal code's own position.
- GeoNames' `cities15000` lists sections of a city as places of their own (Milan's Brera), so a
  point in Milan resolved to Brera until sections (`PPLX`) were left out of the directory.
- The API runs in invariant globalization mode, where `string.Normalize` separates no accents, so
  "São Paulo" never folded to "sao paulo"; accents are folded from a table.
- The form's components put Angular's runtime for `output()`, `viewChild` and render effects in
  the initial chunk. `viewChild` alone was 7.4 kB; the error summary focuses itself instead, and
  the warning budget moved by 5 kB with its reason (ADR 0007).
- A `<select>`'s option written over three lines kept its spaces, and the countries spec that
  reads the options' text failed; the option's text is bound with `[textContent]`.
- `press('Backspace')` on a field Playwright had focused deleted nothing: focus put the caret at
  the start. A spec changes a field with `fill`.

**Lessons**

1. **Read the prompt against the mock too.** A prompt is written from the docs of its day; where it
   and a mock disagree, the mock wins and the prompt is corrected in the same change.
2. **An outside source's coordinates choose; they are never kept.** Resolve the source's answer to
   something Mondino holds (a city of the directory) so the source's precision never reaches a pin.
3. **Give the source only what the answer needs.** Canada's forward sortation area and Ireland's
   routing key name the area a city needs; the rest of the code is never sent.
4. **Remove `IHttpClientFactory`'s loggers from a client whose address carries a teammate's data.**
   They log every request URL at Information.
5. **Test an outside source at its HTTP boundary as well as behind its interface.** A fake
   `HttpMessageHandler` proved what is sent, the timeout (with `FakeTimeProvider`), the cache and
   the breaker through the API.
6. **Measure each new Angular feature's cost in the initial chunk.** Build with and without it;
   a query or an effect can cost more than the component that uses it.
7. **In a combobox, the options take no focus.** The input keeps it, Up and Down move
   `aria-activedescendant`, and the options' click handlers need the template lint rules turned off
   with the reason beside them.

**Earlier lessons applied**

- *Bring the docs in line first* (journey 1, lesson 6): the mock, the design system, L2-006, the
  design, ADR 0006 and the prompt were one commit before any code; nothing was reworked after.
- *Run the spec before the page exists* (journey 1, lesson 5): every backend and frontend slice's
  tests were run first and failed on the missing endpoint, state or registration.
- *Measure the initial bundle before choosing a platform service* (journey 2, lesson 1): the chunk
  table caught the form's runtime before the first frontend commit, and a build with and without
  each feature found `viewChild`'s 7.4 kB.
- *Read a mock for what it leaks* (journey 2, lesson 2): the found mock names the teammate's own
  city only; the postal code is kept in no URL, storage or log, and a spec reads everything the
  browser keeps.
- *Check the verify script's own exit code* (journey 2, lesson 6): every slice ran
  `node tools/verify/verify.mjs; echo $?` before its commit.
- *The browser logs every refused request* (journey 2, lesson 4): the 422, 503 and 429 answers the
  specs give on purpose passed the guard, and an unanswered city search would still fail it.

## Journey 4: Join the team

**What slowed it**

- The parent branch was rebased onto `main` and force-pushed mid-journey. The branch was moved
  with `git rebase --onto`, and `docs/adr/README.md` met `main`'s own row 0004 (Azure hosting);
  both rows were kept.
- The session cookie's acceptance test failed although the session worked: the cookie expires a
  year after the mocks' "now" (2025), which `FakeTimeProvider` gives the cookie handler, and the
  test machine's clock is past that, so the test client's cookie container dropped it as expired.
  The test sends the cookie by hand and says why.
- `MondinoApi` replaced `ICurrentTeammate` with a fake, so a real session could not be read in a
  test. The fake now stands in only while a test has signed a teammate in, and the real one reads
  the cookie otherwise.
- After a reload the Router's first navigation carries the history entry's state, so the
  "You’re on the map." toast came back. `GlobePage` replaces the entry's state once it has read it.
- The mock draws a join refused with 429 as the lookup's own rate-limited state (the found city
  gone, "Place my pin"); the design said the found city stayed. The mock won, and the store
  reuses the lookup's countdown, which also gave the slice for free.
- Some refusals passed before their slice: the double-click and the full team were built by the
  handler the design describes in slice 1, and the join's 429 by the store in slice 3. Their
  specs were still written first and run; they were kept as the proof.

**Lessons**

1. **A cookie's lifetime is measured from the fake clock.** An acceptance test that follows a
   cookie with a real client fails once the real date passes the fake "now" plus the lifetime;
   send the cookie by hand, or give the client the same clock.
2. **Read navigation state once, then take it out of history.** `Router.currentNavigation()`
   restores the entry's state on a reload; a one-time greeting replaces it after reading.
3. **Check the shape of navigation state and storage.** Both are data a person can change; a
   membership or a `JustJoined` that is not the expected shape is treated as none.
4. **Refuse cross-site pre-session requests by `Sec-Fetch-Site`, then `Origin`** (ADR 0008):
   there is no session to bind an antiforgery token to, and a JSON-only body with no CORS
   already stops a plain form.
5. **Serialise one team's joins in the process as well as by a unique index.** EF Core InMemory
   enforces no unique index, so the double-click test proves the in-process gate, and the index
   holds across instances on PostgreSQL.

**Earlier lessons applied**

- *Bring the docs in line first* (journey 1, lesson 6): ADR 0008 and the design's changes were
  one commit before any code; the design was touched again only to record what the code chose
  (the membership's contract, the state's union).
- *Read the prompt against the mock too* (journey 3, lesson 1): the rate-limited join follows the
  mock, not the design's words; the prompt itself agreed with the mock.
- *Measure the initial bundle* (journey 2, lesson 1; journey 3, lesson 6): the membership bound
  at the root cost 0.8 kB and the Globe route 0.4 kB (257.5 to 258.7 kB), inside the budget, so
  no budget moved.
- *Run the spec before the page exists* (journey 1, lesson 5): every slice's tests were run first
  and failed on the missing endpoint, state or screen, but for the three noted above.
- *Check the verify script's own exit code* (journey 2, lesson 6): each slice ran
  `node tools/verify/verify.mjs`, read `$?`, and the lint failures it caught (a selector in a
  spec, an unused fixture) were fixed before the commit.
- *The browser logs every refused request* (journey 2, lesson 4): the 409, 429 and 500 answers
  given on purpose passed the guard.

