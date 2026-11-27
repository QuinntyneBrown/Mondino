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


## Journey 5: Create a team

**What slowed it**

- The mocks' manifest says Create Team "reads nothing before it is shown", while the design read
  the countries from a new `GET /api/countries`, which needs a loading state no mock draws. The mock
  won: the countries are bundled with the screen (ADR 0009), and the endpoint was never built.
- Create Team's lookup states, and its 429, were not drawn (open question 9, L2-045). Five mocks were
  drawn first, generated from `create-team/default` with Join's fragments, before any code.
- "Create team" pressed straight from the postal code field arrives after the blur has started the
  lookup, so the press found it `Locating` and did nothing. The store now waits for the running lookup
  and makes the team when it answers; the spec holds the lookup to prove it.
- The validation specs filled the postal code, so leaving it started a lookup no fixture answered,
  and the guard failed the spec. They answer the lookup like every other Create Team spec.
- A presentation component's output named `copy` is a DOM event name and fails angular-eslint; it is
  `copyLink`, and the design was renamed with it.
- The backend's lookup actions were written with the controller of slice 1, so slice 3's spec would
  have passed before it was written. The actions were held back, the spec run red, then restored.

**Lessons**

1. **Read the manifest's notes as part of the mock.** A `not_applicable` reason ("reads nothing
   before it is shown") is a design decision as binding as a drawn state.
2. **Keep only what the feature needs of a secret.** Sign-in is given the address it sends to, so a
   keyed fingerprint recognises a teammate and the address need never be stored.
3. **A submit can arrive mid-lookup.** When leaving a field starts a request, the button pressed next
   must wait for it rather than be ignored; hold the request in the spec to prove it.
4. **Generate a new mock from its screen's own default and a neighbour's fragments.** Five states
   were drawn in one script, with the globe and chrome exactly the screen's own, and the checker
   regenerated the index and coverage.
5. **Write a controller one action at a time when its slices are separate.** Otherwise hold the later
   actions back so their specs can be seen to fail.

**Earlier lessons applied**

- *Bring the docs in line first* (journey 1, lesson 6): the mocks, L2-053, L2-044, L2-045, ADR 0009
  and the design were one commit before any code; the design was touched again only for two names
  the code chose (`copyLink`, `selectRequest`).
- *Read the prompt against the mock too* (journey 3, lesson 1): the prompt's design had
  `GET /api/countries`; the manifest's note won.
- *Measure the initial bundle* (journey 2, lesson 1; journey 3, lesson 6): 258.72 kB before and
  258.88 kB after; `afterRenderEffect` was already in the initial chunk through `Alert`, so the
  focus and the copy field's selection cost nothing there, and no budget moved.
- *Run the spec before the page exists* (journey 1, lesson 5): all 25 Create Team specs and every
  backend test were run red first, on the missing route, endpoint or action.
- *Check the verify script's own exit code* (journey 2, lesson 6): read as `rc`; it caught three lint
  errors (a selector in a spec, an unused fixture, the `copy` output) before the commit.
- *The browser logs every refused request* (journey 2, lesson 4): the 422, 503, 429 and 500 answers
  given on purpose passed the guard; the unanswered lookup in the validation specs did not.
- *Check the shape of navigation state and storage* (journey 4, lesson 3): the membership is written
  through `TeamMembership`, and a spec reads everything the browser keeps for the postal code and
  the email.

## Journey 6: Protect team data

**What slowed it**

- The API serves the Angular build from `wwwroot`, so a strict Content-Security-Policy on every
  answer would have blocked the build's inlined critical CSS, its script and every component style
  in the deployed app. Angular copies `ngCspNonce` from `mo-root` onto all of them at build time;
  the API now serves `index.html` itself with the placeholder replaced by each answer's nonce
  (ADR 0010).
- The e2e server served the build with no headers, so nothing proved the app ran under the policy.
  It now sends the API's headers; run without the nonce, every spec failed on the browser's CSP
  errors, which the guard reads as console errors.
- The fallback authorisation policy also covers what has no endpoint, so the app's files and the
  SPA fallback would have needed a session. The static files run before routing and the fallback
  is marked open, and a test calls every endpoint the API maps without a session.
- No endpoint that changes something with a session exists yet, so the antiforgery check was
  proven on a test-only endpoint beside the existing failing one.
- The session's `Set-Cookie` was asserted with `Assert.Single`, which broke once the antiforgery
  cookies joined it. The tests now pick the session cookie by name.
- Many criteria name screens and endpoints of later journeys (Sign In, the panel, the Team table,
  the invite dialog, Leave, Profile & Settings). They stay with those journeys, and journey 6 is
  counted at the share it could prove.
- Journey 5's progress commit set journeys 6, 9, 13 and 23 to 100 in the table while the total
  counted only 1 to 5. The rows were put back.

**Lessons**

1. **Run the e2e suite under the production headers.** A security header the specs never see
   cannot break them; served by the e2e server, the CSP broke every spec until the nonce was right.
2. **Prove "closed by default" by calling every mapped endpoint.** Enumerate the endpoint data
   source, call each without a session, and keep the open ones in a named list; a new endpoint
   fails the test until it is either refused or added to the list on purpose.
3. **A fallback authorisation policy reaches files too.** Put static files before routing and
   mark the SPA fallback and the unknown-`/api` 404 open, or the app shell needs a session.
4. **Bind the antiforgery token after setting `HttpContext.User`.** Sign-in does not change the
   current request's user; set it to the new principal before issuing the token, or the token is
   bound to no one and the first change is refused.
5. **A count of `Set-Cookie` is fragile.** Assert the cookie you mean by its name.
6. **Check the progress table against its total.** A row set to 100 that the total does not count
   is a typo that later journeys would trust.

**Earlier lessons applied**

- *Bring the docs in line first* (journey 1, lesson 6): ADR 0010, the design, its diagrams, the
  deployment setting and the prompt's title were one commit before any code; "Your city"'s limit
  went into the mocks and the design system before the component.
- *Read the prompt against the mock too* (journey 3, lesson 1): the prompt said "Invite link
  needed"; the mock's "You need an invite link" won and the prompt was corrected.
- *Run the spec before the page exists* (journey 1, lesson 5): every slice's tests were run red
  first, but for four proofs that passed on first run because earlier journeys had built the
  behaviour (text interpolation, no storage of a postal code, only joining and making a team
  issuing a session, the limits); they were kept as the proof, as journey 4 kept its.
- *Write a controller one action at a time* (journey 5, lesson 5): `/me` answered without a
  postal code in slice 1 so slice 2's test of the owner's postal code could be seen to fail.
- *Measure the initial bundle* (journey 2, lesson 1; journey 3, lesson 6): 258.88 kB before,
  259.15 kB after (the guard and the four routes), inside the budget; no budget moved.
- *Check the verify script's own exit code* (journey 2, lesson 6): read as `rc` each slice; it
  caught selectors in a spec before the commit.
- *A cookie's lifetime is measured from the fake clock* (journey 4, lesson 1): the new `Sessions`
  helper sends the session's cookies by hand for the same reason.
- *Check the shape of navigation state and storage* (journey 4, lesson 3): `teammateGuard` reads
  only `TeamMembership.current()`, which already checks the stored shape.

## Journey 7: Sign in with an emailed link

**What slowed it**

- The design had the handler send the mail before answering and refuse with 503 when the Email
  source did not take it. Mail goes only to a teammate's email, so that refusal, and the seconds a
  call takes, would have told anyone which emails Mondino knows. Mail now leaves from an outbox
  after the answer (ADR 0011), and the design, the shared contracts and `survive-source-failure`
  were brought in line before any code.
- The design kept the email with the link in plain, against ADR 0009. The link keeps the email's
  fingerprint and the email sealed under a key only the token gives, which is also how "You need an
  invite link" can name it for a teammate who left after asking.
- The log test passed against a build whose analyzers had refused the sabotage meant to prove it,
  and then failed for real once every category logged at Trace: MVC writes an action's arguments to
  its Trace log, and a record's `ToString` printed the email, the token, and Create Team's name and
  postal code. Every API request record now prints only its type.
- `JsonContent.Create` writes camelCase by default; Postmark expects `From`, `To`, `TextBody`. The
  test at the HTTP boundary caught it.
- The globe-shape spec parsed the mock after the app was open, so the mock's own `style=` broke the
  app's CSP and the guard failed the spec. The mock is read before the app is opened, as the
  existing specs do.
- ADR 0009 expected an `AuthLayout` component once a second screen used the `auth` block, but its
  body's title, lead and fields would then be styled across a component boundary. The two pages
  share one Sass partial instead (ADR 0011).

**Lessons**

1. **An answer that must not depend on a secret must not wait on it either.** When only some
   inputs trigger a call to an outside source, put the call behind an outbox so neither the status
   nor the time of the answer says which.
2. **Prove a log test can fail, and check the sabotage built.** A failed build leaves the old
   binary, and the test passes against it; read the build's own result first.
3. **Capture logs with a provider-level filter.** `appsettings.json` keeps `Microsoft.AspNetCore` at
   Warning, which hides MVC's Trace lines; `AddFilter<TProvider>(null, LogLevel.Trace)` sees
   everything.
4. **A record that carries what a person typed overrides `ToString`.** The framework logs action
   arguments by their `ToString`.
5. **Read a mock's markup before the app is open.** Parsing it under the app's CSP applies its
   inline styles to nothing but still reports the violation.
6. **A token meant for one browser goes in the fragment.** No server, proxy or log sees it; the
   page sends it in a body and replaces the address before anything else.

**Earlier lessons applied**

- *Bring the docs in line first* (journey 1, lesson 6): ADR 0011, the sign-in design and its
  diagrams, the shared contracts, two neighbouring designs, L2-052 and the deployment settings were
  one commit before any code; the design was touched again only for what the code found (the
  request records' `ToString`, "Use another email" as the mock's link).
- *Read the prompt against the mock too* (journey 3, lesson 1): the mock draws "Use another email"
  as a link to `/sign-in`; it was built as a button first and changed to the mock's link.
- *Run the spec before the page exists* (journey 1, lesson 5): every slice ran red first, but for
  four proofs that passed on first run because an earlier slice had built them (the token's storage,
  "without a server token nothing is sent", the links to Sign In, and Sign In by touch and keyboard);
  they were kept as the proof.
- *Write a controller one action at a time* (journey 5, lesson 5): the redemption's rows in the open
  endpoints test were held back from slice 1's commit and restored, red, in slice 3.
- *Measure the initial bundle* (journey 2, lesson 1; journey 3, lesson 6): 259.15 kB before,
  259.24 kB after (the route's entry); Sign In is its own 7 kB chunk. No budget moved.
- *Check the verify script's own exit code* (journey 2, lesson 6): read as `rc` each slice; it caught
  a selector in a spec before the commit.
- *A cookie's lifetime is measured from the fake clock* (journey 4, lesson 1): the redemption tests
  send the session's cookies by hand.
- *Check the shape of navigation state and storage* (journey 4, lesson 3): `InviteNeededPage` reads
  the email only when it is a short string, and takes it out of history once read
  (journey 4, lesson 2).
- *Test an outside source at its HTTP boundary* (journey 3, lesson 5): Postmark's message, its
  timeout under `FakeTimeProvider`, its breaker and the missing token are proven against a fake
  `HttpMessageHandler`.
- *Remove `IHttpClientFactory`'s loggers* (journey 3, lesson 4): the Email source's client logs
  nothing.

## Journey 8: Draw the globe

**What slowed it**

- The prompt and the design put `GlobeView` behind `@defer`. Measured, the defer runtime added about
  7 kB to the initial chunk and `NgTemplateOutlet` another 2.8 kB, past the 265 kB budget, to defer
  8 kB of the globe library's own code. The renderer's dynamic import is the lazy boundary instead,
  and a failed renderer chunk is one more reason for the still picture (ADR 0012). `BrowserClock`
  moved from the root to each screen's providers for the last 0.8 kB.
- The CSP of ADR 0010 has no `blob:`, so three.js's texture loading could not be used as it comes:
  the masks are fetched and decoded with `createImageBitmap`.
- three.js declares `pc_fragColor` itself only for GLSL 1 shaders; a GLSL 3 `ShaderMaterial` names
  its own output. `GLTFLoader` also renames nodes with a dot in them, so `Globe.High` became
  `GlobeHigh`.
- Natural Earth's rings that cross the date line rasterised as stripes the width of the world until
  they were unwrapped and drawn on a grid three worlds wide, folded back with XOR.
- The release spec signed in through an emailed link and then went back: Sign In replaces its
  history entry, so "back" left the app for `about:blank` and every count read zero. The spec now
  comes from Not Found through its link, and goes back and forth three times.
- The just-joined spec waited for the new pin before the toast; with the 3D globe the pin appears
  only after the first frame, and the toast's four seconds were half gone. The toast is checked
  first, then the pin.

**Lessons**

1. **Measure a lazy boundary before choosing it.** `@defer` and structural helpers cost bytes in
   the initial chunk; a dynamic `import()` inside a lazy route's code costs nothing there. Defer the
   heavy part, not the component around it.
2. **Prove a 3D drawing by its pixels at projected places.** Replicate the camera in the spec,
   sample a 5 × 5 patch at a place's projection, and compare one place at two times rather than a
   colour against a constant; SwiftShader in headless Chromium draws WebGL 2 well enough.
3. **Count what a screen holds through the browser, not the app.** An init script that wraps
   `getContext`, the draw calls, `ResizeObserver` and `matchMedia`, with CDP's listener lists,
   proves release without a hook in the product code.
4. **Leave a screen in a spec the way a person would, inside the app.** A `goBack` after a replaced
   history entry leaves the app and proves nothing.
5. **Under a strict CSP, decode images from bytes.** `fetch` with the page's `AbortSignal` and
   `createImageBitmap` need neither `blob:` nor a looser `img-src`, and abort with the screen.

**Earlier lessons applied**

- *Bring the docs in line first* (journey 1, lesson 6): ADR 0012, the 640 px breakpoint in three
  requirements and the design system, and the draw-globe design were one commit before any code;
  the design was touched again for what the build measured (no `@defer`, the clock per screen, the
  meshes' names and sizes, `GlobeLegend`).
- *Measure the initial bundle* (journey 2, lesson 1; journey 3, lesson 6): 259.24 kB before, 259.64
  kB after, inside the 260 kB warning; no budget moved. The renderer's chunk is 629 kB (130 kB
  compressed) and loads only where WebGL 2 is had.
- *Run the spec before the page exists* (journey 1, lesson 5): every slice ran red first, by
  stashing the slice's app code or by removing the line under test (the sun's minute tick, the
  release on destroy, the stop while hidden) and building again.
- *Check the verify script's own exit code* (journey 2, lesson 6): read as `rc` each slice; it caught
  a triple-slash reference ESLint refuses and the just-joined spec's order.
- *Read a mock's markup before the app is open* (journey 7, lesson 5): the Join spec that compares
  pins with the mock still reads it first, and now runs on the still picture the mock draws.

## Journey 9: Turn the globe

**What slowed it**

- A globe that turns on its own moves everything the journey-8 specs read: the pixel specs sample
  places at the starting orientation, and the just-joined spec looked for the new pin after the
  toast's 4 seconds, by which time, under load, the real time the clock also runs had turned Milan
  to the far side. The pixel specs now emulate reduced motion, and the just-joined spec stops the
  clock before it looks at the pin.
- Playwright's clock fakes `requestAnimationFrame`, and Angular's zoneless scheduler races it with
  `setTimeout`: with the clock paused, nothing renders until `runFor`. A spec that drives a turn
  pauses the clock and polls with short `runFor` steps until what it waits for is drawn.
- `pauseAt` refuses a moment already past, and the page's clock runs on between reading it and
  pausing: `pauseAt(now + 1)` failed under load. The helper pauses 20 ms ahead and retries.
- `emulateMedia` changes `matches` at once but fires the query's `change` event only at the
  browser's next rendering, which a paused fake clock never brings; a one-pixel screenshot does.
- The Globe screen is no taller than a phone until its panel is built, so a vertical drag left to
  the page had nothing to scroll; the spec makes room, as the panel will.
- Each faked frame of the 3D globe takes about 25 ms in SwiftShader locally whatever the window's
  size, and about 150 ms on CI: the first push ran 5 seconds of turning a frame at a time, and
  three specs timed out at 30 seconds. Playwright's clock yields a real task after every fake
  timer, so frames cannot be merged. The frame's time is now uncapped (ADR 0013) and the specs
  move the clock with `fastForward`, one frame for any length of time: the turning specs went
  from 8 seconds to under 1.
- Holding at once under reduced motion changed the orientation between frames, and the frame loop
  compared the orientation before and after `advance`, so it never drew it. It compares with what
  is drawn.

**Lessons**

1. **Pause the clock before a spec measures motion, and poll with `runFor`.** Real time ticking
   under the fake clock moves an animation by however long the machine took; a paused clock and
   steps of 16 ms make every frame the spec's own.
2. **A changed media query needs a rendering to be reported.** After `emulateMedia`, bring about a
   frame (a one-pixel screenshot) before expecting the page to have heard of it.
3. **Read touch from touch events when a drag may be handed to the page.** The browser cancels a
   touch pointer as soon as it pans; a non-passive `touchmove` decides on its first move, and CDP's
   `Input.dispatchTouchEvent` drives it, scrolling and all.
4. **Compare a frame's result with what is drawn, not with what came before it.** Something may
   have moved the model between frames.
5. **When a feature makes the screen move on its own, list the specs that look at it still.** Hold
   them still on purpose (reduced motion, a paused clock), rather than relying on their speed.
6. **Measure animation in time, and let a spec jump the time.** A frame that reports the real
   time since the one before (0 after a rest) turns at the same speed on any device, and lets
   `clock.fastForward` show seconds of motion in one frame; a spec that runs a 3D animation a
   frame at a time costs its frames times the CI machine's slowness.

**Earlier lessons applied**

- *Bring the docs in line first* (journey 1, lesson 6): ADR 0013, the turn-globe design and its
  diagrams, the draw-globe inputs and the design system's globe page were one commit before any
  code; the design was touched again only for the names the code chose (`ArrowDirection`'s
  values, `requestFrame`).
- *Measure the initial bundle* (journey 2, lesson 1; journey 3, lesson 6; journey 8, lesson 1):
  259.64 kB before and after every slice; the motion, the gestures and the frame loop are in the
  pages' lazy chunks. No budget moved.
- *Run the spec before the page exists* (journey 1, lesson 5): every slice ran red first, by its
  missing code, by stashing the app code and building again (the drag), or by removing the line
  under test (the reduced motion listener). Two proofs passed on first run because they hold
  something already true (the globe still under reduced motion before it turned at all, the still
  picture taking no focus) and were kept as the proof.
- *Check the verify script's own exit code* (journey 2, lesson 6): read as `rc` each slice; it
  caught a CDP type in the page object, and the just-joined spec the turning globe broke, which
  one commit had been made over before the code was read and was fixed in the next.
- *Count what a screen holds through the browser* (journey 8, lesson 3): the release spec still
  counts the media query listeners, now with the reduced motion one, and every pointer, touch and
  key listener is registered with the screen's `AbortSignal`.
- *Leave a screen in a spec the way a person would* (journey 8, lesson 4): the turning specs come to
  the Globe by joining, the one way the Globe draws a pin before journey 10.

