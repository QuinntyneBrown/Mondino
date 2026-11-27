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


## Journey 10: Show pins

**What slowed it**

- The initial chunk went from 259.64 kB to 260.40 kB, past its warning, with nothing new in it. Bisecting
  the templates found two instructions the Angular compiler shares through the initial chunk once any
  template uses them: `@let` (0.35 kB) and a text with two interpolations, `{{ a }} · {{ b }}`
  (`ɵɵtextInterpolate2`, 0.41 kB). One computed string and no `@let` brought it back to 259.64 kB.
- `PinLayer`'s stylesheet passed the 4 kB component style budget with the labels in it; the labels became
  `PinLabel`, a component of their own, as the design system draws them.
- `GlobeGestures` captured the pointer on `pointerdown`, so a click on a pin was delivered to the globe and
  never reached the button. Capture now waits until the pointer has moved far enough to be a drag.
- Every spec that reached the Globe broke at once (36 of them): its pins request was unanswered, which the
  guard fails, and the turning specs read the just-joined pin, which is now selected and holds the globe.
  The turning specs open the Globe from a remembered team with Sofia alone, and the rest answer the pins.
- Selecting a pin turns the globe, so the pins facing the viewer, and the order Tab takes, change under the
  spec: the Tab spec waits for the turn to finish before it presses Tab again, and names the pin it expects.
- A pin layer drawn from the frame loop is rendered by the zoneless scheduler after the frame: the hidden
  tab spec read Sofia's pin one render before the frame it measured, one run in five. It lets 32 ms pass
  before reading.
- `locator.filter({ has })` with a locator rooted at another locator matched nothing; `has` takes a
  locator rooted at the page, resolved inside each candidate.

**Lessons**

1. **Measure the initial chunk after each template change, and bisect a rise by template feature.** A
   control flow or interpolation shape used for the first time can bring the compiler's instruction for it
   into the shared chunk, whichever lazy chunk the template is in.
2. **Capture the pointer only once a gesture has started.** A container that captures on `pointerdown`
   takes every click from the controls inside it.
3. **When a screen starts a request, list every spec that reaches the screen.** They all need the answer,
   and a new default state (a selected pin) changes what they see.
4. **When an action moves what the keyboard reaches, wait for the move before the next key.** Assert the
   settled state (the pin that has gone from view) before pressing on.
5. **Read what a frame drew after the render that follows it.** A signal set in the frame loop is drawn by
   the next render, not by the frame itself.

**Earlier lessons applied**

- *Bring the docs in line first* (journey 1, lesson 6): ADR 0014, the show-pins design and its diagrams,
  L2-013's 500 px and the design system's pin pages were one commit before any code; they were touched
  again for the names the code chose (`selectPin`, `PinLabel`, `widthChange`).
- *Measure the initial bundle* (journey 2, lesson 1; journey 8, lesson 1): it caught the 0.76 kB rise
  above; 259.64 kB before and after the journey, and no budget moved.
- *Run the spec before the page exists* (journey 1, lesson 5): every new spec ran red first, by its
  missing code or by breaking the line under test (lifting, selecting, the blank tap, the grouping radius,
  the compact rule, the label placer) and restoring it.
- *Check the verify script's own exit code* (journey 2, lesson 6): read as `rc` each slice; it caught a
  selector in a spec and the Tab order flake before commit.
- *Pause the clock before a spec measures motion* (journey 9, lesson 1) and *let a spec jump the time*
  (lesson 6): the turn to a selected pin is proven within a second and held for ten in under a second of
  the spec's own time.
- *List the specs that look at the screen still* (journey 9, lesson 5): the pin specs run under reduced
  motion, and those that measure the turn opt back in.

## Journey 11: Show local time and status

**What slowed it**

- Much of the journey was already built: journey 8 made the one clock that ticks on the minute and rests
  while the tab is hidden, and journey 10 a 24-hour local time on every pin. The design still described a
  `Date`-based clock bound once in `app.config.ts`; it was brought in line with the clock built (numbers,
  bound per screen) before any code, and the minute-tick spec passed on its first run and was kept as the
  proof.
- The Globe's first screen holds Mexico City and Austin on the far side, so L2-014's own example ("08:05"
  in Mexico City) cannot be read off the screen without turning it. The specs read the teammates the
  still picture shows, and find a boundary that one of them crosses: Ahmed's 08:59 to 09:00 in Dubai,
  fifteen hours on, in one jump of the page's clock. Mexico City is proven by a direct unit test.
- `page.clock.pauseAt` moved the clock to the next minute and fired the clock's timer, but nothing was drawn:
  with the page's clock paused, Angular's zoneless scheduler renders nothing until the clock runs. A second
  of `runFor` after the pause draws it, and also proves the tick lands within a second of the minute.
- The verify script failed once on the just-joined spec under load: its toast's 4 seconds were counted after
  steps that spend the paused clock in 16 ms frames. The toast is now proven as soon as it is seen. A commit
  had been made with `;` after a failing verify; it was followed by the fix before any push.
- The prototype has no status visible on the Globe outside the panel; the status there is given in words in
  each pin's accessible name. The `status` badge waits for the panel (journey 14), the first screen that
  draws it.

**Lessons**

1. **After `pauseAt`, let the clock run before reading the page.** A paused fake clock fires the timers that
   are due but renders nothing; `runFor(1_000)` renders and bounds how late the change may be.
2. **Pick a teammate the screen shows for a time boundary, and jump to it.** Any visible zone reaches every
   hour within a day; `pauseAt` hours ahead costs one frame, not the hours.
3. **Prove a timed message as soon as it is seen.** A spec that spends a paused clock in frames before it
   measures a lifetime counts its own frames against it.
4. **Never chain a commit after the verify script with `;`.** Read `rc` and commit only on 0.

**Earlier lessons applied**

- *Bring the docs in line first* (journey 1, lesson 6): the design's clock, `localTime`, `defaultClockFormat`,
  the backend's `SharesStatus` and where the status badge is built were one commit before any code; the
  show-pins design's `describePin` was aligned in the same commit.
- *Measure the initial chunk after each template change* (journey 10, lesson 1): no template changed; the
  initial total stayed 259.64 kB after each slice, and the Globe page's chunk took the time functions.
- *Run the spec before the page exists* (journey 1, lesson 5): the status specs ran red on the missing status,
  the 12-hour spec by building the Globe with the 24-hour clock in place of the viewer's default, and the
  backend's by the missing `SharesStatus`; the minute tick passed first, as journey 8 had built it.
- *Check the verify script's own exit code* (journey 2, lesson 6): read each slice; it caught the just-joined
  flake, though only after a commit chained with `;` (lesson 4 above).
- *Pause the clock before a spec measures motion* (journey 9, lesson 1) and *let a spec jump the time*
  (lesson 6): every time spec runs on the still picture under the page's clock, four specs in under a second.
- *When a screen starts a request, list every spec that reaches the screen* (journey 10, lesson 3): the pins'
  new `sharesStatus` went into the shared fixture, and the three specs that read a pin's name were brought in
  line with the mock's names.

## Journey 12: Show offset and overlap

**What slowed it**

- No screen built so far shows an offset or an overlap: the panel is journey 14's and the Team table
  journey 17's. Every criterion of L2-016 and L2-017 is read off one of them, so the journey built the rules,
  the bar and the one function pages call, proved them by direct tests against the cast, and stands at 0
  until those screens' Playwright specs prove them. Prompts 14 and 17 now say which criteria they raise.
- The prompt wrote the offset as "7 h behind" and "4 h 30 min ahead"; the mocks, L2-016 and the design say
  "7h behind" and "4h 30m ahead". The mock won and the prompt was corrected.
- The design put `Offset`, `DaySpan`, `Overlap` and `OverlapText` in `domain`, but `OverlapBar` in
  `components` takes them and `components` may read only `api`'s types. They, and `WorkingDay`, were moved
  to `api`, so the status, the overlap and the bar read one working day rather than three copies.
- The design still gave the clock as `Date`s; it was brought in line with the numbers journey 11 built.
- `formatTime`'s 12-hour form keeps ":00" ("4:00 pm") for a local time, while the overlap drops it ("4 pm").
  The overlap has its own `formatMinuteOfDay` rather than a flag on `formatTime`.

**Lessons**

1. **Before planning a journey, find the screen each criterion is read off.** When none exists yet, build
   and unit-test the rules, record in the later journeys' prompts which criteria they will prove, and
   count none as proven.
2. **Put a type where its lowest reader can import it.** A presentation component that draws a domain
   value needs that value's type, and any constant it draws by, in `api`.
3. **Prove a drawing by the mock's own numbers.** The bar's parts are compared with the `--from` and
   `--span` the mock writes (66.67%, 4.17%, 62.85%), rounded as it rounds them.
4. **Give the one rule of who gets what a function of its own.** `compareWithViewer` decides the
   viewer's own pin and a teammate who does not share their status once, for the panel and the Team row.

**Earlier lessons applied**

- *Read the prompt against the mock too* (journey 3, lesson 1): caught "7 h behind"; one line of the prompt
  changed, before any code.
- *Bring the docs in line first* (journey 1, lesson 6): the design's clock, the types' library and the
  overlap's 12-hour form were one commit before any code; the design was touched again for `WorkingDay`'s
  move and `compareWithViewer`, as the code chose them.
- *Run the spec before the page exists* (journey 1, lesson 5): each slice's tests ran red first on the
  missing module, then green.
- *Measure the initial chunk after each template change* (journey 10, lesson 1): `OverlapBar` is used by
  no route yet; the initial total stayed 259.64 kB.
- *Never chain a commit after the verify script with `;`* (journey 11, lesson 4): every commit was chained
  with `&&` on the verify script's `rc`.

## Journey 13: Show weather

**What slowed it**

- The design said a resting pin label shows the degrees and only a lifted one the icon; the mocks draw
  the icon and the degrees at rest and add the word when lifted. The mock won before any code. The design
  also kept a stored unit and `TeammateSettings` that no journey has built; as journey 11 did for the clock,
  the unit starts from the country in the browser and "Share my local weather" is `Teammate.SharesWeather`
  until journey 23 (ADR 0015).
- A type named `Weather` in a namespace `…Weather` is the namespace, not the type, from anywhere under it.
  The types went into `Mondino.Domain.Teams` and `Mondino.Application.Teams`, beside the pins, and the
  adapter into `Mondino.Infrastructure.WeatherSource`.
- The cache first stored the read's task after starting it; a source that answered at once ran the
  "drop a failure" step before the entry existed, so the failure was kept. The entry is now a
  `TaskCompletionSource` stored first and completed by the read; the failure test caught it.
- Giving every cast pin its weather changed 15 Globe and Create Team specs at once: names gained
  "Cloudy 8°", labels "15:058°". Journeys 10 and 11 had trimmed names to "up to the status"; the specs now
  read the mocks' full names, and labels are read by their parts (`labelTimeOf`, `labelDegreesOf`).
- Labels with weather are 86 to 93 px, against the 48 px the placer assumed; it passed by luck. Each label
  now carries its width.
- `npm test` dropped a whole library's suite from its summary when a spec fixture no longer compiled (a
  `Pin` without `weather`); only the missing line showed it. The exit code was 1, so the verify script
  would have caught it, but a quick read of the summary would not.
- Only 4 of the 9 criteria can be read off a screen that exists: the panel, the Team row and Profile &
  Settings carry the rest, and prompts 14, 17 and 23 now name them.

**Lessons**

1. **Compare an icon with the mock's by its shapes.** Read each shape's tag and sorted attributes from the
   mock's label and from the page; it proves the night form without a class the mock does not draw.
2. **Store a shared read before starting it.** A cache entry that a fast answer may remove must exist
   before the call can complete; a `TaskCompletionSource` stored first, completed by the read, does it.
3. **When a fixture gains data every screen draws, run the whole suite before the slice's spec.** The cast's
   weather reached every Globe and found-line spec; list them and read the mock's full words in each.
4. **Read the unit-test summary per library, not just its total.** A library whose specs fail to compile
   vanishes from the summary; count the suites, or trust only the exit code.
5. **Give a presentation component the parts the mock styles separately.** The found line's degrees are in
   tabular figures and the words are not, so `FoundWeather` carries both, and no two-interpolation text
   enters the template (journey 10, lesson 1).

**Earlier lessons applied**

- *Bring the docs in line first* (journey 1, lesson 6): ADR 0015, the design's label, unit and sharing, the
  class diagram, the shared contracts and the deployment settings were one commit before any code; the
  design was touched again only for names the code chose (`FoundWeather`, `size`, `WeatherLabelWidthPx`).
- *Read the prompt against the mock too* (journey 3, lesson 1): the prompt's "panel line" has no screen
  yet; `weatherLabel` is built and unit-tested and the panel left to journey 14.
- *Give the source only what the answer needs* (journey 3, lesson 3) and *remove `IHttpClientFactory`'s
  loggers* (journey 3, lesson 4): Open-Meteo is sent a rounded position, the test reads every address it
  was sent, and its client logs nothing.
- *Test an outside source at its HTTP boundary* (journey 3, lesson 5): `FakeOpenMeteo` proved the address,
  the 15-minute cache, the 5-second timeout under `FakeTimeProvider`, a failure not kept and the mapping.
- *Run the spec before the page exists* (journey 1, lesson 5): each slice ran red first, on missing types,
  the missing found-line weather or pin weather; the cache and "no weather" specs were also run against a
  sabotaged line (a zero freshness, weather shown whatever its state) and failed.
- *Measure the initial chunk after each template change* (journey 10, lesson 1): 259.64 kB before and after
  every slice; `WeatherIcon` and the label's `@if` are in the lazy chunks.
- *Pick a teammate the screen shows for a time boundary, and jump to it* (journey 11, lesson 2): the night
  icon is proven on Ahmed, five hours on, in one `pauseAt`.
- *Never chain a commit after the verify script with `;`* (journey 11, lesson 4): every commit was chained
  with `&&`.
- *Put a type where its lowest reader can import it* (journey 12, lesson 2): `PinWeather`, `FoundWeather`
  and `WeatherCondition` are in `api`, so `PinLabel`, `LookupMessage` and `WeatherIcon` read them.

## Change: Remove the limit on making a team

Not a journey of its own: the product owner asked for the `create-team` limit (5 teams an hour for
one client) to be removed from `POST /api/teams` (ADR 0016). No criterion was added or removed, and
no journey's % complete moved.

**What slowed it**

- The prompt named ADR 0015 as the next free record, but 0015 was already the weather source; the
  record is 0016.
- Besides the test the plan named, `OpenEndpointsTests` had a theory row for `POST /api/teams` that
  proved the old limit. Only the whole backend suite found it.
- The container had neither .NET nor PlantUML. .NET came from `apt` (journey 1, lesson 8); the
  PlantUML jar from `repo1.maven.org` (`repo.maven.apache.org` answered 429) and Graphviz from `apt`.

**Lessons**

1. **When a behaviour is removed, search the tests for its endpoint, not only its test's name.** A
   table of cases elsewhere may hold a row for it.
2. **Check the next free number in `docs/adr/` before writing it into the mocks and the specs.**
3. **A departure from a rule names the rule and stays narrow.** ADR 0016, `AGENTS.md`, L1-014 and
   L2-045 name making a team as the one exception, so no other open endpoint can cite it.

**Earlier lessons applied**

- *Bring the docs in line first* (journey 1, lesson 6): the mocks, L1 and L2, ADR 0016, `AGENTS.md`
  and both designs, with their diagrams rendered again, were one commit before any code.
- *Run the spec before the page exists* (journey 1, lesson 5): the backend test failed first on the
  sixth request's 429, and the e2e spec on the countdown shown in place of the failure.
- *Never chain a commit after the verify script with `;`* (journey 11, lesson 4): each commit was made
  only after reading the exit code.
## Journey 14: View a teammate's panel

**What slowed it**

- The design was written before the Globe was: it put `TeamStore` in `domain`, the selection's events on
  `GlobeView`, `focusPin` on the globe, a component input for the query parameter and `SettingsCache`, none of
  which exist. It was brought in line with what journeys 10 to 13 built (the store in the app, `PinLayer`'s
  events, the page focusing its own pins, `queryParamMap`, the viewer's country's defaults) before any code.
- The panel's content types had to be in `api`, not `domain`'s `pins/`, for `TeammatePanel` and `GroupPanel` to
  read them; `OverlapView` moved there from `compareWithViewer` (journey 12, lesson 2 again).
- The address first selected the newly joined teammate too, which broke journey 4's spec that a reload greets
  and selects no one. The new pin is the one selection kept out of the address.
- Journey 10's Tab spec expected focus to stay on a pin after Enter; L2-023 moves it to the panel's heading.
  The spec was brought in line with the later requirement, moving to the next pin by focusing it.
- Angular scopes `@keyframes` names per component, so the fade's name reads `_ngcontent-…_fade-in`; and a panel
  that only changes its inputs never replays its fade. The page draws the panel in a `@for` over a list of one,
  tracked by teammate, and the spec proves the new teammate's panel is a new element.
- `@for (x of [panel])` put the compiler's pure-function instruction in the initial chunk (+0.19 kB); a computed
  list of one costs nothing there. The document's Escape listener costs 0.06 kB (259.64 to 259.70 kB).
- Most of what the panel shows waits for other screens: its moments for journey 19, the week's view it closes to
  for journey 15, and the Team row half of L2-016 criteria 1 to 4 and L2-019 criterion 1 for journey 17. Counted
  strictly, the journey stands at 60 and raised journeys 11, 12 and 13 by what the panel proves.

**Lessons**

1. **Read a design against the code built since it was written, not only against the mock.** Names of
   components, where a store lives and which events exist drift as earlier journeys build them.
2. **Prove a fade by the element being new, not by its animation.** A CSS animation is set on the element
   whether or not it replays; mark the element, change the selection and check the mark is gone.
3. **Tell a keyboard choice by `:focus-visible` on what was chosen.** The clicked control keeps focus either
   way; only the keyboard's makes it match, so the page moves focus to the panel only then.
4. **Compare a panel with the mock part by part from its markup.** A helper that reads each class's text, the
   icon's shapes and the bar's parts from the mock lets one assertion cover five mocks.
5. **Keep a one-visit selection out of the address.** What the address holds comes back on every reload.

**Earlier lessons applied**

- *Bring the docs in line first* (journey 1, lesson 6): the design, its four diagrams and the panel types' home
  were one commit before any code; it was touched again for the newly joined pin and the types as built.
- *Measure the initial chunk after each template change, and bisect a rise by template feature* (journey 10,
  lesson 1): it caught the 0.25 kB rise in slice 3 and found the array literal and the document listener.
- *Run the spec before the page exists* (journey 1, lesson 5): each slice's spec ran red on the missing
  address, panel, focus or group; the close button and the 3D selection passed first, built by the slice before,
  and were kept as the proof.
- *Put a type where its lowest reader can import it* (journey 12, lesson 2): the panel's content, the group's
  and `OverlapView` are in `api`.
- *Prove a drawing by the mock's own numbers* (journey 12, lesson 3) and *compare an icon with the mock's by its
  shapes* (journey 13, lesson 1): the overlap bar's parts and the weather icon are read from the five mocks.
- *After `pauseAt`, let the clock run before reading the page* (journey 11, lesson 1) and *pick a boundary and
  jump to it* (lesson 2): the daylight-saving offset change is one `pauseAt` and one second of `runFor`.
- *Never chain a commit after the verify script with `;`* (journey 11, lesson 4): every commit was chained on
  `rc` with `&&`.

## Journey 15: View the week around the world

**What slowed it**

- The prompt asked for the first 8 moments and "7 working"; the mocks, L2-024 and the design say six and
  "8 working". The mock won and the prompt was corrected. No mock drew the week with no moment, which is
  what the panel shows until journey 19 finds them, so `pages/globe/no-moments` and L2-024 criterion 11
  were drawn and written first.
- The design was again written before the code it names: `TeamStore` in `domain`, the CDK `Clipboard`
  (ADR 0009 chose `navigator.clipboard`), `weekMoments` over moments that do not exist yet, and no
  `TeamShell`, which journey 16's prompt expected this journey to build. The design was brought in line
  with the code and the shell built here.
- `RouterLinkActive` for the header's `aria-current` cost the initial chunk 9.8 kB (259.81 to 269.65 kB,
  past the error budget): it lives in `@angular/router`'s one module, which is in the main chunk, so any
  lazy use of it lands there. The shell marks the current screen from `NavigationEnd` itself; the nested
  route's own config costs 0.10 kB (259.71 to 259.81 kB).
- Drawn in the shell's outlet, the Globe is created after its navigation has ended, so
  `Router.currentNavigation()` was null and the just-joined greeting was lost (six specs). It reads
  `lastSuccessfulNavigation()` as well.
- The team of 500 fixture did not count as `pages/globe/hundreds` does (36 time zones, 322 working, 72
  asleep). It now places a stated number in each of 40 cities, chosen so the counts are the mock's.
- A spec that paused the page's clock before the pins had answered found an empty screen; it waits for the
  heading before jumping the time.
- With the panel always beside the globe, the globe is narrower, and the heading over its top-left corner
  covered the pixel a draw spec sampled as "nothing drawn"; it samples the bottom-right corner.

**Lessons**

1. **Measure the initial chunk after importing anything new from a package already in it.** A directive
   used only by a lazy component still lands in the main chunk when its package's module is there; check
   the chunk table before and after, and write the few lines yourself when it costs kilobytes.
2. **A component drawn in a child outlet misses its navigation.** Read navigation state from
   `lastSuccessfulNavigation()` as well as `currentNavigation()`.
3. **Make a shared fixture count as the mock does before a spec reads its counts.** A large generated team
   is easier to fix by stating each city's number than by tuning a formula.
4. **Wait for the screen's data before pausing the page's clock.** A jump taken before the answer is drawn
   leaves the screen without it.
5. **When a requirement's state has no mock, draw it first, even an empty one.** The week with no moment is
   what every teammate sees until journey 19.

**Earlier lessons applied**

- *Bring the docs in line first* (journey 1, lesson 6) and *read a design against the code built since*
  (journey 14, lesson 1): the mock, L2-024 criterion 11, the design and its four diagrams and the prompt were
  one commit before any code; the design was touched once more for `copyLink`, a name the lint chose.
- *Read the prompt against the mock too* (journey 3, lesson 1): caught the eight moments and "7 working".
- *Measure the initial chunk after each template change, and bisect a rise* (journey 10, lesson 1): caught
  `RouterLinkActive` at once; 259.71 kB before the journey, 259.81 kB after, under the 260 kB warning.
- *Run the spec before the page exists* (journey 1, lesson 5): each slice's spec ran red on the missing
  heading, panel, header or card; the closing specs of journey 14 were proven by the week's view coming back.
- *When a screen starts a request, list every spec that reaches the screen* (journey 10, lesson 3): the
  shell moved the pins' request and the toast, and the just-joined, keys and draw specs were run and brought
  in line with the mocks' words ("with your pin").
- *After `pauseAt`, let the clock run* and *jump to a boundary* (journey 11, lessons 1 and 2): the counts
  change at 15:00 UTC, when Tomás starts work, and the quiet team is read at 23:30 in Milan, each in one jump.
- *Prove a timed message as soon as it is seen* (journey 11, lesson 3): the copy toast's 4 seconds are
  counted from a clock paused once it is seen.
- *Put a type where its lowest reader can import it* (journey 12, lesson 2): `TeamCounts`, `WorkingNow` and
  `WorkingTeammate` are in `api`, so `WeekPanel` reads them.
- *Never chain a commit after the verify script with `;`* (journey 11, lesson 4): every commit followed a
  verify read as `rc=0`.
## Change: Keep team data in Azure PostgreSQL

Not a journey of its own: the deployed Mondino ran on `InMemory` and lost every team at each
restart. L2-057 and ADR 0017 put it on an Azure Database for PostgreSQL Flexible Server, reached
with Microsoft Entra tokens and no password, migrated by the deployment before it publishes and
proven by `/health/ready`. Journey 30 moved from 0 to 20: the health endpoints prove L2-051
criterion 4.

**What slowed it**

- `main` moved twice during the run and took ADR 0016 for another decision; the record became
  0017 in the rebase, in the files and in a commit message. A blanket replace of "ADR 0016" also
  rewrote `main`'s own reference in `docs/detailed-designs/README.md`, which was put back.
- Rendering the whole tree of diagrams rewrote every PNG, changed or not. Only the PNGs whose
  `.puml` had changed were kept.
- The first sabotage of the readiness log test did not compile, so the test "passed" against the
  old binary (journey 7, lesson 2, again). The build's own result was read the second time.
- On this Windows checkout `dotnet format --verify-no-changes` fails on every file (`autocrlf`
  gives CRLF, the `.editorconfig` asks for LF), and `DOTNET_ROOT` pointed at a .NET without the
  runtime the formatter needs. The verify script was run in a second worktree checked out with
  LF, where it passed.
- The server's firewall rules are written one at a time by the template, about a minute each:
  31 addresses took half an hour.
- The first check of a team's survival ran the API over plain HTTP on a laptop, where making a
  team answers 500 after storing it: the antiforgery cookie needs HTTPS. The team was found in
  the database by its name instead.
- The removal of the verification team first named a column `SignInLinks` does not have; the
  transaction rolled back and nothing was removed, after the invite token's file had already
  been deleted. The token was read again from the database before the second, correct removal.
- The deployment's first run could not be watched: the app lacked `PostalCodeSource__Username`,
  which only the product owner holds, so the deployment stops before its migration step.

**Lessons**

1. **Check an ADR's number again after every rebase, and replace it by its file name.**
   "ADR 0016" is also someone else's record; `0016-azure-postgresql` is only this one.
2. **Create a database role yourself when you must act as it later.** `CREATE ROLE` with the
   `pgaadauth` security label gives the administrator the right to grant itself the role, so an
   operator migrates as the role that owns the tables (`Options=-c role=mondino_migrator`) and
   proves what the app's role may not do, without that identity's token.
3. **Prove a role's limits by trying them.** Acting as `mondino_app`, `CREATE TABLE`, `ALTER`,
   `DROP` and `TRUNCATE` were each refused, and a read of `__EFMigrationsHistory` too.
4. **Run the real migrations on the real engine before the release needs them.** Six migrations
   that had only ever met EF Core InMemory applied cleanly to PostgreSQL 18; had one failed, the
   first deployment would have found it.
5. **Check a deployment's readiness by its answer, not its status.** The version before had no
   `/health/ready`, and its fallback answers any path with the app's page and 200. The
   deployment compares the body with "Healthy".
6. **Keep a token you will need until the step that needs it is done.** Delete the working files
   last, after the removal is seen to have worked.
7. **Take a federated sign-in's second token at once.** The OpenID Connect assertion lasts
   minutes; the workflow asks for the database token right after `azure/login`, and the Azure
   CLI keeps it for the migration.

**Earlier lessons applied**

- *Bring the docs in line first* (journey 1, lesson 6): L2-057, ADR 0017, the `keep-team-data`
  design and its diagrams were one commit before any code; the design was touched again for the
  names the code chose (`Read`, `CreateDataSource`).
- *Run the spec before the page exists* (journey 1, lesson 5): the readiness tests failed first on
  404, and the settings tests on a start that should have been refused.
- *Prove a log test can fail, and check the sabotage built* (journey 7, lesson 2): the readiness
  check was made to report its error; the test failed, once the sabotage compiled.
- *Prove "closed by default" by calling every mapped endpoint* (journey 6, lesson 2):
  `/health/ready` failed that test until it was added to the open list on purpose.
- *A record that carries what a person typed overrides `ToString`* (journey 7, lesson 4), in its
  spirit: a refusal of a database setting names the setting and never its value, and a test
  searches the refusal for the password and the host.
- *Check the verify script's own exit code* (journey 2, lesson 6) and *never chain a commit after
  it with `;`* (journey 11, lesson 4): `rc` was read as 0 before the pull request.

## Bundle headroom pass

**What slowed it**

- The initial bundle stood at 259.81 kB against a 260 kB warning, and journeys 3, 8, 10 and 15 had each
  written around a platform feature (`viewChild`, `@defer`, `NgTemplateOutlet`, `@let`,
  `RouterLinkActive`) to stay under it. The pass looked for code to move to lazy chunks and found
  3.54 kB of Mondino's own in `main`, all of it needed before the first screen.
- esbuild's metafile showed why: `@angular/core`, `@angular/router` and the `rxjs` barrel are reached from
  `main`, so whatever any lazy screen uses of them is kept in the main chunk. The same app with an empty
  route table is 221.26 kB; the 38.6 kB above it is Angular's runtime for features lazy screens use.
- A build that fails its error budget writes no `browser-stats.json`; probes past the budget raised the
  error limit in a scratch copy of `angular.json` to read the metafile.

**Lessons**

1. **Measure the floor before cutting code to fit a budget.** Build with an empty route table, then probe
   each feature from one throwaway lazy route; the difference is what the budget must hold, and no code
   of ours can move it. ADR 0018 records the table.
2. **Diff two metafiles by input to see what a feature costs.** `ng build --stats-json` writes
   `dist/mondino/browser-stats.json`; subtracting `outputs[main].inputs[*].bytesInOutput` of two builds
   names the modules that grew.

**Earlier lessons applied**

- *Measure the initial bundle before choosing a platform service* (journey 2, lesson 1) and *measure the
  initial chunk after importing anything new from a package already in it* (journey 15, lesson 1): turned
  from a reason to avoid a feature into a table of what each costs, so the budget is set from measurement.
- *Never chain a commit after the verify script with `;`* (journey 11, lesson 4): the commit followed
  `node tools/verify/verify.mjs &&`.

## Journey 16: Invite teammates

**What slowed it**

- The design was again behind the code: it named the CDK `Clipboard`, a `CopyResult`, `CopyField.select()`
  and a `TeamStore` in `domain`, none of which journey 15 built. It was brought in line, with its three
  changed diagrams, before any code.
- The mock's note and L2-037 put the sheet under 576 px; the design system's CSS, which the mocks render
  through, made it one under 640 px. The note won and the CSS was brought to 36rem. `CopyField` had also
  drifted from both mocks to a copy icon; it takes their link icon again.
- CDK 22 draws an overlay in the browser's top layer (`popover`) by default, and an open CDK Dialog marks
  every sibling of its container `aria-hidden` except live regions and popovers. The shell's toast regions,
  inside `mo-root`, were hidden from assistive technology and painted under the dialog's scrim. The spec
  that read the toast by its class passed; a screenshot showed it. The regions now move to the body, and the
  dialog is drawn in the page's layers (`usePopover: false`), so `--z-toast` is over it as `copy-failed`
  draws it.
- `import('@angular/cdk/overlay')` for that one token cost the initial chunk 12.9 kB more (273.56 to
  286.50 kB): a dynamic import keeps every export of the entry, and with them the core and `rxjs` they use.
  Importing `Dialog` and `OVERLAY_DEFAULT_CONFIG` by name from a two-line local module brought it to
  272.73 kB, the CDK Dialog line of ADR 0018 (259.81 kB before the journey, +12.92 kB).
- Four of the slices passed on their first run, because the CDK's focus trap, restored focus and the sheet's
  CSS came with the first. Each was proven able to fail by breaking the one setting it reads.
- Team, Moments and Profile & Settings do not exist yet, so L2-054 criteria 1 and 6 and L2-025 criterion 7
  cannot be counted, and L2-055 waits for the reset's design: 7 of 15 criteria, 50.

**Lessons**

1. **Read a toast by its role when a dialog is open.** `getByRole('alert')` leaves out what is hidden from
   assistive technology; a class locator does not, and passes over a silenced alert.
2. **Take what a lazy feature needs from a package by name, through a small module of re-exports.** A
   dynamic import of a package entry keeps all its exports in the build.
3. **Look at an overlay once, with reduced motion, before calling its slice done.** Stacking and the top
   layer are invisible to a spec that reads text; a screenshot found the toast under the scrim.
4. **A CDK 22 overlay is in the top layer unless told otherwise.** Anything that must sit over a dialog
   (a toast) needs the dialog out of the top layer (`OVERLAY_DEFAULT_CONFIG`) or to be in it itself, and
   must be a live region beside the overlay container to be announced.
5. **When a slice is green before its code, break the setting it reads.** Turning off `restoreFocus`,
   the select request or the breakpoint made each spec fail where expected.

**Earlier lessons applied**

- *Bring the docs in line first* (journey 1, lesson 6) and *read a design against the code built since*
  (journey 14, lesson 1): the design, three diagrams, the breakpoint and the mocks' note were one commit
  before any code.
- *Run the spec before the page exists* (journey 1, lesson 5): the first spec failed on the missing dialog,
  the hold on a toast that went, the alert on its role.
- *Prove a log test can fail, and check the sabotage built* (journey 7, lesson 2), in its spirit: each
  green-on-arrival slice and the backend's invite link test were broken once and seen to fail.
- *Measure the initial chunk after importing anything new from a package already in it* (journey 15,
  lesson 1) and *diff two metafiles by input* (bundle pass, lesson 2): the jump was read from the chunk
  table at once, and the metafile diff named `@angular/core` and `rxjs`'s schedulers.
- *Prove a timed message as soon as it is seen* (journey 11, lesson 3): the toast's hold is counted from a
  clock paused once it shows.
- *Never chain a commit after the verify script with `;`* (journey 11, lesson 4): every commit followed
  `node tools/verify/verify.mjs &&`.

## Journey 17: View the team through the day

**What slowed it**

- Two Team states had no mock: Working now with no one in working hours (L2-028 criterion 3) and a
  teammate who shares neither status nor weather. `team/quiet` and `team/sharing-off` were drawn, and
  `team/asleep`, which had lost Luca's marker, was mended, before any code.
- The mocks placed the four Milan, Berlin and Stockholm markers at 15:05 in rows that no single rule gives.
  The rule (by local minute, then west to east, the viewer first in their city, each in the lowest row free
  for three hours) was written down, and the mocks' rows for Luca, Lena and Mara were brought to it; the
  unit test then caught that the viewer's city was told apart by name rather than by position.
- An encapsulated `td { display: block }` outweighed `.team-table__moment:has(.team-table__none)`, so the
  phone's empty "Coming up" showed. The phone spec found it; the rule now names the row too.
- The arrow-key tabs first used `viewChildren`: the signal-query runtime is `@angular/core`'s, and core
  lives in the initial chunk, so a lazy screen's use of it grew `main` by 0.85 kB. The tabs are found
  through the DOM instead and `main` went back to 272.84 kB.
- Reading names straight after a click raced the list's redraw; each read now waits for the row count first.

**Lessons**

1. **Write down the rule a mock's layout follows before coding it, and fix the mock where it has none.**
   A placement read off pixels gives no tie-breaks; one written rule gave the code, the unit test and the
   mocks the same rows.
2. **An Angular API new to the app costs the initial chunk even from a lazy route.** `@angular/core` is
   shared with `main`, so whatever of it a lazy chunk uses is kept there. Read the chunk table after each
   slice, not only at the end.
3. **In a spec, wait for the count before reading a list's text.** `allInnerTexts` does not retry;
   `toHaveCount` does.
4. **A `:has()` rule in an encapsulated stylesheet still loses to a later, equally specific one.** Give
   the rule that hides something the row's class as well, and prove it at the width where it applies.

**Earlier lessons applied**

- *Bring the docs in line first* (journey 1, lesson 6) and *read a design against the code built since*
  (journey 14, lesson 1): the two new mocks, three L2 changes, the design's signatures and four diagrams
  were one commit before any code. It worked: no slice met a design question.
- *Run the spec before the page exists* (journey 1, lesson 5): every slice's spec failed first on the
  missing rows, ribbon, tabs and states.
- *Measure the initial chunk after importing anything new from a package already in it* (journey 15,
  lesson 1): it caught the `viewChildren` growth at the slice that made it.
- *Prove a timed message as soon as it is seen* (journey 11, lesson 3), in its spirit: the hour that moves
  Tomás into working hours is set with the page's paused clock, with no wait.
- *Never chain a commit after the verify script with `;`* (journey 11, lesson 4): every commit followed
  `node tools/verify/verify.mjs &&`.

## Change: Apply the prototype's indigo and violet palette

Not a journey of its own: the Mondino App and Mondino Brand prototypes moved from navy ink, an
orange-red pin and a green leaf to deep indigo ink, a violet pin, a teal leaf and a lavender paper,
in light and in dark. A colour change only: no criterion was added or removed, and no journey's
% complete moved.

**What slowed it**

- Two colours were written outside the tokens. `assets/components.css` gave the centred dialog a
  raw `rgb(0 0 0 / .3)` shadow in journey 16, which `check_design_system.py` reported as an error
  from then on, and the app's invite dialog copied it. Both read the new token `--shadow-5` now.
- A role pointed at a light-theme primitive in dark: `--color-danger-border` was the light pin in
  both themes. The old orange passed 3:1 on the dark surface by chance; the new violet is 2.6:1. The
  contrast check found it, and the role now points at the brighter dark pin.
- The prototype draws its danger button in its pin-ink and darkens it on hover, the opposite of how
  the two danger roles pointed. The roles were turned round; no token was renamed.
- The mocks' backdrop (`.backdrop`, the night at 45% in both themes) and the app's
  (`--color-bg-backdrop`, 55% in light, black at 65% in dark) already differ. Found and left: the
  palette keeps every alpha, and the drift is recorded in the design system's README.

**Lessons**

1. **Change a palette in the primitives, then grep for what cannot read a token.** The logo files,
   the favicon and the brand sheet's printed values hold colours of their own; everything else
   followed `tokens.css`.
2. **A palette change can break a contrast pair through a role that points at the wrong theme.**
   Run `check_contrast.py` before looking at a single screen, and fix the role, not the component.
3. **Rebuild every `rgb()` literal made from an old primitive.** A shadow, a backdrop or a band
   written as numbers does not follow the primitive it was made from.
4. **Keep `check_design_system.py` at 0 errors in every change that touches `components.css`.** The
   raw shadow sat as an error for a journey because nothing that ran in CI read it.

**Earlier lessons applied**

- *Bring the docs in line first* (journey 1, lesson 6): the tokens, mocks, design system and
  instructions were committed before the app's two changes.
- *Look at an overlay once before calling its slice done* (journey 16, lesson 3): the invite dialog,
  "Leave Northwind?" and the failure toast were looked at in light and dark, in the mocks and the app.
- *Never chain a commit after the verify script with `;`* (journey 11, lesson 4): the exit code was
  read before committing.

## Journey 18: Find a teammate in a large team

**What slowed it**

- `team/hundreds` broke the rules the screen is built on: London before Accra, though Accra is west of
  it; a city's teammates in the seed's order, not by name; and four teammates of one city with four
  different weathers. The mock was brought to the rules and the departures recorded before any code.
- The team of 500 fixture counted as the mocks do but lived in other cities (Los Angeles, Lima, Shanghai)
  with no country and no weather, which would have shown the weather warning on Team. It was rebuilt as the
  mock's 40 cities, with the eight teammates it names, before any spec read it.
- No mock drew a city of more than 50 (L2-056's undesigned words). `team/hundreds-crowded-city` was
  generated by a script; its first run's regex matched from San Francisco's button to London's, opening
  the wrong city. The spec that compared the screen with the mock found it.
- A three-value interpolation in `CitySection` ("14 more teammates in London.") grew the initial chunk by
  0.41 kB: `ɵɵtextInterpolate3` was new to the app and core lives in `main`. One computed string brought it
  back to 272.87 kB. The metafile diff named `@angular/core`; bisecting the templates named the line.
- `node tools/verify/verify.mjs 2>&1 | tail -3 && git commit` committed after a failed lint: a pipe's exit
  status is its last command's. The commit was undone and verify since writes to a log file.
- The sections slice carried the code of the next three (the limit, the search and the note), so their
  specs were green on arrival; each was proven able to fail by breaking the limit, the accent folding,
  "Show everyone" or the closed section's empty table.

**Lessons**

1. **Never pipe the verify script before `&&`.** Redirect it to a file (`> verify.log 2>&1 &&`) so its own
   exit code guards the commit.
2. **One value per text interpolation in a lazy component.** `{{ a }} more {{ b }} in {{ c }}` calls an
   instruction of its own, which lands in the initial chunk; a computed string costs nothing there.
3. **A script that edits a mock must not match across blocks.** Anchor each pattern to one line or one
   element, and compare the result with the helper the spec uses before calling the mock drawn.
4. **When a mock breaks a rule the code already follows, fix the mock, not the rule.** Order, grouping and
   weather were all rules with their own tests; the mock was the only thing out of line.
5. **Make a large fixture the mock's, city for city, before the first spec of the screen that lists it.**
   Counts alone are not enough once a screen names the cities.

**Earlier lessons applied**

- *Bring the docs in line first* (journey 1, lesson 6): the mocks, the new state, L2-056, the design and
  its diagrams were one commit before any code; the design was touched once more for `toggled`, the name
  the lint chose.
- *When a slice is green before its code, break the setting it reads* (journey 16, lesson 5): four
  slices, each broken and seen to fail.
- *An Angular API new to the app costs the initial chunk even from a lazy route* (journey 17, lesson 2)
  and *diff two metafiles by input* (bundle pass, lesson 2): caught the 0.41 kB at the slice that made it.
- *In a spec, wait for the count before reading a list's text* (journey 17, lesson 3): the Asleep sections
  were read before they were drawn until the spec waited for six buttons.
- *Make a shared fixture count as the mock does* (journey 15, lesson 3): extended to its cities and names.
- *Look at an overlay once before calling its slice done* (journey 16, lesson 3), in its spirit: one
  screenshot at 1280 and 375 px of the bar chart and the sections.

## Journey 19: Find moments

**What slowed it**

- No public calendar Mondino may use covers Formula 1, local events or sport, nor the holidays of six of
  its thirteen countries: Nager.Date asks commercial users for sponsorship, Jolpica-F1 is non-commercial
  and event APIs need contracts. Reading each source's terms before choosing settled it: OpenHolidays
  (ODbL) for the holidays it has, and Mondino's own calendar, embedded and changed by pull request, for
  the rest (ADR 0019).
- Two sources name one region differently ("State of Berlin" and "Berlin"), and GeoNames' first-level
  names differ again. A region is matched by its name with case, accents and "State of" folded away,
  tested a case per row.
- The mocks gave Sofia "Monza tickets on sale" but Luca, in the same Milan, nothing: against L2-020's
  rule that a moment belongs to everyone where it happens. The mocks were brought to the rule first.
- The analyzers refused `from`/`to` as parameter names (CA1716) and a test's Arrange through a fake whose
  session had no cookie got 401, not 404; the "another team" case moved to the theory that uses real
  sessions.
- The calendar adapters were written before their tests in one slice; each test was then proven able to
  fail by breaking the dedupe, the cache, the breaker and the region match.
- Adding the "Coming up" pill to `TeamTable`'s stylesheet passed its 4 kB warning budget. The pill was a
  design-system block of its own, and as `MomentPill` it took its styles with it.
- The e2e server serves `dist/`: a spec run without `npm run build` tests the last build.

**Lessons**

1. **Read a source's terms before its documentation.** A licence that forbids commercial use ends the
   choice; check it first and record it in the ADR with the date it was read.
2. **When a mock gives one teammate a moment and not another in the same place, the mock is wrong.**
   Check a cast's moments against the rule of each kind before building on them.
3. **Default an e2e fixture to the state earlier specs assumed.** Answering the new endpoint with nothing
   in the shared fixture kept every earlier spec as it was; only the specs about moments answer the cast.
4. **A design-system block gets its own component as soon as a second stylesheet would hold it.** It
   keeps each component's budget and the rule that no component styles another's block.
5. **Build before a Playwright run.** The specs run against `dist/`, so a red that does not move after a
   change is the old build.

**Earlier lessons applied**

- *Never pipe the verify script* (journey 18, lesson 1): every commit was guarded by verify's own exit
  code, writing to a log file; one lint failure stopped a commit as it should.
- *One value per text interpolation in a lazy component* (journey 18, lesson 2): every moment line is one
  string ("Holiday · In 5 days", "· 9 Nov"); the initial chunk stayed at 273.05 kB through all four
  frontend slices.
- *When a slice is green before its code, break the setting it reads* (journey 16, lesson 5): the backend
  calendar tests, and the week's markup and refused-moments specs, were each broken and seen to fail.
- *Make a shared fixture count as the mock does* (journey 15, lesson 3): `CAST_MOMENTS` is the backend
  test's cast, moment for moment, and the specs compare the screens with the mocks' markup.
- *Fix the mock, not the rule* (journey 18, lesson 4): Luca's Monza moment.

## Journey 20: Mark pins with moments

**What slowed it**

- The design drew the markers through a `GlobeView` input and an `emblemFor` over held emblems, but
  `GlobePage` projects `PinLayer` itself, over the 3D globe and the still picture, and ADR 0019 holds no
  emblem. The marker became part of `PinView`, worked out in `pinViews`' one pass a minute, and the design
  and its four diagrams were redrawn before any code. Its `<TO SUPPLY>` (two moments on one day) is by title.
- The prompt deferred the count on a marker as undrawn; `pages/globe/default` draws Tomás's "2" and the
  mocks' decision 8 settles it, so it was built.
- Nothing held the viewer's chosen kinds: the switches are journey 23's. `SETTINGS_STORE`, read from the
  browser by `SettingsCache` for the teammate the membership names (ADR 0020), lets the Globe follow them
  now and the specs set what a save would leave.
- The still picture leaves Tomás and Jordan on the far side, where the mock draws them faint by the rim, so
  the mock comparison found no "2". The still picture is compared for the pins it draws, and Tomás's count
  on the 3D globe through his address, as `pages/globe/selected` draws it.
- The narrow-globe spec read a lifted pin mid-transition (18 px of its 34) and found the marker over the
  initials; under reduced motion it measured the settled pin and passed.

**Lessons**

1. **Check which of a mock's elements the screen draws before comparing them.** A mock and the screen can
   agree on every element they share and still differ in which they show; filter the mock by what is drawn,
   then name the ones you expect.
2. **Measure a pin's size under reduced motion.** Lifting animates its width; a box read straight after
   the class changes is a frame of the transition.
3. **A setting whose switch comes later is read through its token now.** Bind the contract, keep it in the
   browser for its owner, and let the spec set what a save leaves; the later journey only writes it.
4. **A criterion with a clause nothing can reach yet is not proven by its other clauses.** L2-021
   criterion 4 waits for an emblem Mondino holds; say so in the count rather than call it done.

**Earlier lessons applied**

- *Bring the docs in line first* (journey 1, lesson 6) and *read a design against the code built since*
  (journey 14, lesson 1): the design, its diagrams, ADR 0020 and the prompt were one commit before any code.
- *Measure the initial bundle* (journey 2, lesson 1; journey 10, lesson 1): 273.05 kB before and after
  every slice; the settings token is bound in `TeamShell`, not `app.config.ts`.
- *One value per text interpolation in a lazy component* (journey 18, lesson 2): the label's moment line
  is one computed string.
- *A design-system block gets its own component* (journey 19, lesson 4): `MomentMarker` holds the
  `moment-marker` block, so `PinLayer`'s stylesheet stays under its budget.
- *Default an e2e fixture to the state earlier specs assumed* (journey 19, lesson 3): only specs that
  answer the cast's moments see markers, and no earlier spec changed.
- *When a slice is green before its code, break the setting it reads* (journey 16, lesson 5): the Luca case
  passed before the cache existed; dropping its teammate check failed it. The narrow-globe spec failed
  with the marker moved inward.
- *Never pipe the verify script* (journey 18, lesson 1): every commit followed verify's own exit code;
  two lint failures (a `type`, selectors in a spec) stopped commits as they should.
- *Look at an overlay once* (journey 16, lesson 3): one screenshot at 1280 and 375 px of Tomás's count and
  the lifted label.

**Progress:** 10 of 13 criteria proven (80%). Not proven: L2-021 criterion 4's held emblem (Mondino holds
none, ADR 0019); L2-022 criterion 3 (the Moments screen, journey 21) and criterion 4's "Choose moments"
arriving on Profile & Settings (journey 22), each added to that journey's prompt. Built here for journey
23: the week's note and the legend with every kind off.

## Journey 21: List moments

**What slowed it**

- The design had `MomentsPage` ask `TEAM_API` for the moments again, though `TeamStore` already reads
  them for the teammate screens and swallows a failure. The store now says whether they answered
  (`momentsState`) and reads them again on "Try again"; the page sends no request of its own.
- The mock writes "Formula 1 · In 13 days" past a week, where `whenLabel` gives "9 Nov"; Moments has the
  date beside it, so it took a label of its own, `daysAheadLabel`. The mock also labelled one kind icon
  "Sport" beside the word "Sport"; it was made decorative as every other row's.
- L2-007 criterion 2 asked a moment to give its city and country; the mock gives the city alone. The
  requirement was brought to the mock.
- The window for a team of 500 was first an `IntersectionObserver` on two edges of the rows. A jump of
  the scroll bar to the bottom lands in the padding kept for the rows out of the window, where neither
  edge is near, so the window never moved: the spec scrolled 200 times and found the first 60. It now
  follows the scroll position once a frame (`followWindow`), and ADR 0021 says why.
- The filter and states specs were green on arrival, because the list slice built the page whole; each
  was broken (the filter ignored, the moments' failure ignored, the empty state hidden) and seen to fail.
- A backend test of the postal code breaker (`After_five_failures_in_a_row…`) failed once and passed on
  three reruns, with no backend change in this journey; it is left for the journey that owns it.

**Lessons**

1. **A window over a list must follow the scroll position, not only its edges.** A scroll bar jumps into
   the space kept for what is out of the window; work out what the viewport shows from the position and
   a measured row height.
2. **Read what a store already loads before a page loads it again.** The shell's store held the moments;
   giving it a state and a retry was smaller than a second request and a second place to cancel it.
3. **A label that reads differently on two screens is two functions.** "In 13 days" beside a date and
   "9 Nov" without one are each right where they are; one function with a flag hides which screen asks.
4. **Read a list's text only after waiting for the state that changes it.** A filter's `aria-pressed`
   read straight after the click was the old one; wait for the attribute, then compare.

**Earlier lessons applied**

- *Bring the docs in line first* (journey 1, lesson 6): the mock, the design and its diagrams, ADR 0021
  and the mocks' open question were one commit before any code; the design and ADR were touched once more
  when the window changed how it moves.
- *Never pipe the verify script* (journey 18, lesson 1): every commit followed verify's own exit code,
  written to a log; the backend flake stopped one commit as it should.
- *One value per text interpolation in a lazy component* (journey 18, lesson 2): the kicker, the kind
  line and the detail are each one computed string. The initial chunk went from 273.05 kB to 273.16 kB,
  the route's own entry, and stayed there through every slice.
- *A design-system block gets its own component* (journey 19, lesson 4): `today-moment`, `moment-row`,
  the groups and the chips are four components, each with its block's styles.
- *Default an e2e fixture to the state earlier specs assumed* (journey 19, lesson 3): Northwind still has
  no moment unless a spec says so; `momentsOf500` is new and only the large spec reads it.
- *When a slice is green before its code, break the setting it reads* (journey 16, lesson 5): three
  slices, each broken and seen to fail.
- *Look at an overlay once* (journey 16, lesson 3), in its spirit: one screenshot at 1280 and 375 px.

**Progress:** 16 of 16 criteria proven (100%). Proven here for earlier journeys: L2-024 criterion 5's
"All moments" reaching Moments (journey 15, 20 of 21: 95%, rounded to 100; L2-025 criterion 7 still
waits for Profile & Settings, journey 22), L2-007 criterion 2's Moments part (journey 6, 35 of 40, still
90), L2-022 criterion 3 (journey 20, 11 of 13, still 80), the Moments part of L2-054 criterion 1 and
L2-025 criterion 7 (journey 16 stays at 50 until Profile & Settings proves the fourth screen), and
Moments' part of L2-047 criterion 5, which with Team's completes it (journey 29, 1 of 14: 10).

## Journey 22: Change location

**What slowed it**

- The design drew a `PostalCodeField` with a `mode`, but Join and Create Team build the field from
  `TextField` with `LookupMessage` under it. `LookupMessage` took the `mode` (`Move`, with the city the pin
  stays in), the page shows the two warnings as `Alert`s (which gained projected actions and an hourglass),
  and the design, its diagrams and the shared contracts were brought to that before any code.
- The rate limiter ran before authentication, so no policy could count a teammate's own lookups for the
  teammate. ADR 0022 sets 10 a minute per teammate and moves `UseRateLimiter` after `UseAuthentication`;
  the open endpoints still count by address.
- Journey 6's scope test listed `PUT /me` among the requests that must be refused, because it did not
  exist. Once it moved the asker's own pin, the test failed on a 422. The attempt left that list; the new
  test sends Marco's id in the body of `PUT /me` and proves only Sofia moves.
- The first slice the prompt suggests (`GET /me` with the teammate's own postal code) was built by journey
  6; its tests stood as the proof.
- The small globe turns to face the pin. Under the whole suite's load the spec read the pin mid-turn
  (49.94%) and compared it with the settled place; it now waits for the exact facing (50%, 50%) first.
- The page slice built the Location section with it, so the lookup and save specs were green on arrival;
  each was broken (the `Move` mode dropped, the team's re-read dropped, the globe made interactive) and
  seen to fail.
- The mocks draw Display, Moments on the globe, What teammates see and "Leave Northwind" on this screen;
  they are journeys 23 and 24, and a line was added to each prompt.

**Lessons**

1. **A limit counted per user needs the limiter after authentication.** Before it, the user is nobody and
   every partition falls back to the address; authentication refuses nothing, so moving it costs the open
   endpoints nothing.
2. **A test of an endpoint's absence breaks when the endpoint arrives.** Assert what must never happen
   (another teammate's pin changed), not the status an unmapped route happens to give.
3. **Wait for a turning globe to settle on the exact place.** "Within 1%" is still a frame of the turn.
4. **A time zone's name beside a clock is `longGeneric`.** `long` names the season ("Central European
   Standard Time"); the generic name is the mock's, and a zone with no generic name keeps its standard one.

**Earlier lessons applied**

- *Bring the docs in line first* (journey 1, lesson 6) and *read a design against the code built since*
  (journey 14, lesson 1): the design, its seven diagrams, the shared contracts, L2-032 and ADR 0022 were
  one commit before any code.
- *Never pipe the verify script* (journey 18, lesson 1): every commit followed verify's own exit code,
  written to a log; it stopped three commits (the scope test, a selector in a spec, the mid-turn read).
- *Measure the initial bundle* (journey 2, lesson 1): 273.16 kB before, 273.29 kB after, the route's own
  entry; the screen is a 19 kB lazy chunk with `PROFILE_API` bound at its route.
- *When a slice is green before its code, break the setting it reads* (journey 16, lesson 5): three times.
- *One value per text interpolation in a lazy component* (journey 18, lesson 2): the local time line and
  the warnings are each one computed string.
- *A design-system block gets its own component* (journey 19, lesson 4): `SaveBar` holds `save-bar`.
- *Read what a store already loads before a page loads it again* (journey 21, lesson 2): the page uses
  `TeamStore` only to read the team again after a save, so the Globe shows the pin at the new city.
- *Default an e2e fixture to the state earlier specs assumed* (journey 19, lesson 3): only the profile
  specs and "Choose moments" answer `GET /me`.

**Progress:** 14 of 14 criteria proven (100%). Proven here for earlier journeys: L2-025 criterion 7 and
L2-054 criterion 1 on Profile & Settings, the last of the four screens (journey 15, 21 of 21: 100; journey
16, with L2-054 criterion 6 proven by journey 17, 9 of 15: 60); L2-022 criterion 4's "Choose moments"
reaching Profile & Settings (journey 20, 12 of 13: 90); L2-045 criterion 6, the 429 message on Profile &
Settings, and the limit on its lookup (journey 6, 36 of 40, still 90); Profile & Settings joining
`TeamShell` with its header link current. Total: 76.

## Fix: flaky postal code breaker test

- *Keep wall-clock timeouts out of the request path*: the postal code form's regex had a 100 ms match
  timeout, so on a loaded machine one of the five failing lookups could be refused before the source, the
  breaker never opened and the sixth answered 200; a linear-time (`NonBacktracking`) match needs no timeout.

## Journey 23: Choose display and sharing

**What slowed it**

- The design still described the code as unwritten: a `SettingsStore` in `root`, a `TeammateSettings` no
  journey had built, switches named `ShareWeather` and `ShareStatus`, and a whole-profile save. Journeys 11 to
  22 had built `statusFor`, `SharesStatus` and `SharesWeather` (already applied by the read of the pins),
  `SETTINGS_STORE` bound by `TeamShell` and a location-only `PUT /me`. The design, its five changed diagrams,
  the shared contracts and ADR 0023 were brought to that before any code.
- A save sends the parts that changed. Journey 22's save had to keep sending only the location, so `PUT /me`
  takes a location part and a settings part, each optional; its spec and its backend tests stood unchanged.
- Journey 22's location spec read Toronto's time as "10:05 am", Canada's clock; with the clock the
  teammate's own it is "10:05". The same spec waited 4 seconds for the bar to go after a save; it now reads
  "Saved — your pin is up to date".
- `<button mo-switch>` with its content in the component's template failed angular-eslint's
  `elements-content`: the rule reads the consumer's empty button. `Switch` became the element `mo-switch`
  holding its button.
- Tomás is on the far side of the still picture, so the Globe's pin list has no button for him; the spec
  reads Chloé's pin and opens Tomás's panel by his address, as journey 20 found.
- Slice 2 built the store's whole save state, so the save bar's and the dialog's specs were green on
  arrival; each was broken (a lifetime of 8 seconds, a failure reported as idle, the guard removed, the
  `beforeunload` listener removed) and seen to fail.
- During one break, `git checkout` on the page threw away the slice's uncommitted template work with the
  sabotage; it was rebuilt from the copy taken before the break.

**Lessons**

1. **Break a slice with a copy, not with git.** Copy the file aside, sabotage, copy it back; `git checkout`
   restores the last commit and takes the slice's own work with it.
2. **A component that draws a button's content is an element, not an attribute on an empty button.** The
   linter reads the consumer's template, where the button looks empty.
3. **When a setting becomes the teammate's own, find every spec that read its default.** A clock or a unit
   worked out from the country reaches screens far from the one that changes it.
4. **Make each part of an update optional, and send only what changed.** Earlier callers and their tests
   stay valid, and one unit of work still stores the parts together or not at all.
5. **Prove the browser's own leave prompt with `page.close({ runBeforeUnload: true })`.** A dialog handler
   that dismisses it records the `beforeunload` and keeps the page; with nothing unsaved the page closes.

**Earlier lessons applied**

- *Bring the docs in line first* (journey 1, lesson 6) and *read a design against the code built since*
  (journey 14, lesson 1): the design, its diagrams, the shared contracts and ADR 0023 were one commit before
  any code.
- *Never pipe the verify script* (journey 18, lesson 1): every commit followed verify's own exit code,
  written to a log; it stopped three commits (the Toronto clock, the empty switch button, a selector in a
  spec).
- *Measure the initial bundle* (journey 2, lesson 1): 273.29 kB before, 273.19 kB after; `/profile` moved to
  its own routes file with the guard, and "Leave without saving?" and the CDK Dialog load on first use.
- *When a slice is green before its code, break the setting it reads* (journey 16, lesson 5): seven times,
  including the Globe ignoring the saved clock and the cache dropping the unit.
- *A design-system block gets its own component* (journey 19, lesson 4): `Switch` holds `switch-row`;
  `Segmented` gained its radio mode with `segmented__check`.
- *One value per text interpolation in a lazy component* (journey 18, lesson 2): each switch's line and the
  notes are one computed string.
- *Default an e2e fixture to the state earlier specs assumed* (journey 19, lesson 3): `sofiaProfile()`
  answers the settings her country gives, so no earlier profile spec changed its request.
- *Prove a timed message as soon as it is seen* (journey 11, lesson 3): the clock is paused once "Saved"
  shows, then run 3.9 and 0.1 seconds.
- *Look at an overlay once* (journey 16, lesson 3): one screenshot at 1280 and 375 px of the sections with
  the switches off and of "Leave without saving?" as a sheet.
- *A setting whose switch comes later is read through its token now* (journey 20, lesson 3): the switches
  only write `SETTINGS_STORE`; the Globe's every-kind-off note and legend needed no change.

**Progress:** 20 of 20 criteria proven (100%). L2-034 criteria 2, 3 and 8 are read off the pin, panel,
counts, week, Team row, ribbon and filter specs of journeys 11, 14, 15 and 17, which answer a teammate whose
`sharesStatus` is false; this journey's backend test proves the switch is what makes it false. Proven here
for earlier journeys: L2-019 criterion 3, a changed unit on every screen (journey 13, 9 of 9: 100); L2-022's
switches turning every kind off and bringing the Globe's note and legend (journey 20 stays 90: L2-021
criterion 4's held emblem cannot be reached). Handed on: what "Leave Northwind" does with unsaved changes
(prompt 24), carrying the backend's settings to a browser that never opened Profile & Settings (prompt 25),
and a save with an ended session (prompt 27). Total: 80.

## Journey 24: Leave the team

**What slowed it**

- The prompt said "Removing your pin…" and "Cancel"; the mocks say "Leaving…" and "Stay". The mocks won
  and the prompt was corrected.
- The design left the session `<TO SUPPLY>` and drew a session store to delete. Sessions are protected
  cookies (ADR 0008) and ADR 0010 already refused one whose teammate is gone, so ending a session is
  deleting the teammate's row and expiring the cookies on the answer. ADR 0024 records it, with the empty
  team kept and the sign-in links deleted.
- Deleting a teammate's sign-in links with them makes L2-052 criterion 10 (a good link for an email on no
  team) unreachable by any flow, since mail goes only to an email on a team. Its backend test removes the
  row directly, and ADR 0024 hands the question to the requirements.
- The CDK did not close "Leave Northwind?" when Profile & Settings was destroyed by the navigation to
  `/left`: the dialog stayed over Left Team. The page now closes it itself when it goes.
- `rememberTeam` writes the membership on every page load, so a spec could not see what a reload shows
  once the app forgets the team. `rememberTeamOnce` writes it once a tab.
- `ProfileStore`'s unit test stubs `ProfileApi` and `SettingsStore` by hand; adding a method to each broke
  the unit build, which the quick e2e loop did not run. The verify script caught it.
- Journey 23's save bar spec failed once under the whole suite: pausing the page's clock at the time just
  read raced the running clock ("Cannot fast-forward to the past"). `pauseNow` pauses 20 ms ahead and
  reads again if it lands in the past; the three specs that paused that way use it.
- The markup spec of the leave dialog and Left Team was green on arrival; Left Team's title bound as
  `innerHTML` made it fail.

**Lessons**

1. **A session that is a signed cookie ends when what it names is gone.** Validate the principal against
   the store on each request, and ending every copy of it is deleting the row; expire the cookie on the
   answer too.
2. **Close a dialog yourself when its screen goes.** Destroying the injector that made a CDK Dialog did not
   take its open dialog away after a navigation; keep the `DialogRef` and close it on destroy.
3. **Remember state for a spec once a tab when the spec tests forgetting it.** An init script runs on every
   reload and puts back what the app removed.
4. **Pause a running page clock ahead of the time read.** The clock moves between reading it and pausing
   it; pause a little ahead and read again on "Cannot fast-forward to the past".
5. **Deleting data can make another requirement's precondition unreachable.** Check which flows still lead
   to each criterion that reads what is deleted, and say so in the ADR.

**Earlier lessons applied**

- *Bring the docs in line first* (journey 1, lesson 6) and *read a design against the code built since*
  (journey 14, lesson 1): ADR 0024, the design, five diagrams, the shared contracts, the mocks' note and
  the prompt were one commit before any code.
- *Read the prompt against the mock too* (journey 3, lesson 1): "Leaving…" and "Stay" won over the prompt.
- *Never pipe the verify script* (journey 18, lesson 1): every commit followed verify's own exit code,
  written to a log; it stopped four commits (the redemption test's narrative, the unit stub, a selector in
  a spec, the clock race).
- *Measure the initial bundle* (journey 2, lesson 1): 273.19 kB before, 274.26 kB after: the `danger` and
  `link` variants of `Button`, which the initial chunk holds, and the `/left` route's entry. The dialog and
  Left Team are lazy chunks.
- *Take what a lazy feature needs from a package by name* (journey 16, lesson 2): "Leave Northwind?" opens
  through the same `dialog-layers` module as the other two dialogs.
- *When a slice is green before its code, break the setting it reads* (journey 16, lesson 5) and *break a
  slice with a copy, not with git* (journey 23, lesson 1): the markup spec, with Left Team's page copied
  aside.
- *Check the shape of navigation state and storage* (journey 4, lesson 3): `LeftPage` reads the team's name
  only as a short string, and takes it out of history as `InviteNeededPage` does an email.

**Progress:** 8 of 8 criteria of L2-036 proven (100%): the dialog, busy, failed, "Stay" and Escape, Left
Team with and without the name, the four screens showing "You need an invite link" after leaving, and the
backend's deletion, for the last teammate too. Proven here for earlier journeys: L2-044 criterion 10's leave
dialog and Left Team, and L2-043 criterion 4 through the real leave rather than a removed row. Journey 6,
recounted criterion by criterion: 37 of 40, still 90. Proven: L2-007 criteria 1 to 5; L2-043 criteria 1 to
6 and 8 to 11; L2-044 criteria 1 to 12; L2-045 criteria 1 to 4 and 6 to 11. Not proven: L2-043 criteria 7
and 12 (the reset of the invite link, which waits for its design, L2-055) and L2-045 criterion 5 (no spec
reads "You can try again in" or that the countdown is announced once). Journey 5's "Start a new team" from
Left Team leads to Create Team (journey 5 stays 100). Journey 23's question is answered and proven: "Leave
Northwind?" opens at once, and "Leave without saving?" is never asked on the way out (journey 23 stays
100). Handed on: L2-038 criterion 10 is proven here and L2-037 criterion 9's sheet is not measured
(prompt 27), with a 401 on leaving; L2-039 criterion 4's Escape while leaving is proven (prompt 28).
Total: 82.

## Journey 25: Keep the team fresh

**What slowed it**

- The prompt said the banner reads "Couldn't refresh just now." with "Try now"; the mock, L2-048 and the
  design system say "Couldn’t refresh. Clocks are live; weather and moments are from 14:50." with "Try
  again" and "Trying…". The mock won and the prompt was corrected.
- The design still put `TeamStore` in `domain` and had `GlobeView` take `arrivedIds` and emit
  `arrivedShown`. The pins pulse in `PinLayer` over the globe, from `pinViews`' `isNew`, so the arrived ids
  join the just-joined one there; the design and three diagrams were brought to that before any code.
- The store sat in `TeamShell`, above four screens that each bound their own `BrowserClock` (ADR 0012), so
  it had no clock to ride. ADR 0025 binds one clock in the shell for the four screens and the refresh.
- The first arrival in the refresh spec was Kwame in Accra, on the far side of a globe turned to Tomás in
  Mexico City, so his pin had no button to find; Jordan in Austin arrives instead.
- Carrying the viewer's settings in `GET /pins` (ADR 0025) broke journey 23's test that the body of
  another teammate's read holds no `sharesWeather` and no `temperatureUnit`: the body now holds the
  reader's own. The test reads everything but `viewerSettings` and checks that part is the reader's.
- The midnight spec was green on arrival, as Moments already grouped by the clock's minute; with the
  clock's read taken out of the page it failed, and the page was put back.

**Lessons**

1. **Bind the shared clock where the state that rides it lives.** A store above several screens cannot
   read a clock each screen binds below it; one clock at the store's level drives both, and a refresh on
   its tick rests with it while the tab is hidden, with no timer or listener of its own.
2. **Count an interval from the minute of the read, not the millisecond.** `refreshedAt` is the clock's
   minute, so "15 minutes pass" refreshes on the 15th tick and not the 16th.
3. **Pick a spec's teammate on the near side of what the globe faces.** A pin turned away has no button;
   choose the teammate from where the selection turns the globe.
4. **A test that a word is absent from a whole body breaks when the body gains the reader's own part.**
   Assert over everything but that part, and that the part is the reader's.
5. **Prove a slice red by stashing the product code alone.** `git stash push -- projects` keeps the new
   spec, page objects and fixtures and builds the app as it was; untracked new files stay, so a new
   component must not yet be exported for the old app to build as before.

**Earlier lessons applied**

- *Bring the docs in line first* (journey 1, lesson 6) and *read a design against the code built since*
  (journey 14, lesson 1): ADR 0025, the notes in ADRs 0012 and 0023, the design, three diagrams, the
  shared contracts and the prompt were one commit before any code.
- *Read the prompt against the mock too* (journey 3, lesson 1): caught the banner's words.
- *Never pipe the verify script* (journey 18, lesson 1): every commit followed verify's own exit code,
  written to a log; it stopped two commits (the formatter, a unit spec still passing `null` for the new
  pin).
- *Measure the initial bundle* (journey 2, lesson 1): 274.26 kB before and after; `Banner` and the
  refresh are in the shell's lazy chunk.
- *When a slice is green before its code, break the setting it reads* (journey 16, lesson 5) and *break a
  slice with a copy, not with git* (journey 23, lesson 1): the midnight spec, with Moments' page copied
  aside.
- *Look at an overlay once* (journey 16, lesson 3): one picture of the banner at 1280 and 375 px.
- *Default an e2e fixture to the state earlier specs assumed* (journey 19, lesson 3): an answer without
  `viewerSettings` leaves `SETTINGS_STORE` as it was, so no earlier spec's team fixture changed.
- *Wait for a turning globe to settle on the exact place* (journey 22, lesson 3): the selected pin is read
  at (50%, 50%) before and after the refresh.

**Progress:** 7 of 7 criteria of L2-048 proven (100%): the read every 15 minutes with the selection and the
globe's place kept, the arrival that pulses with no toast as the counts change, the hidden tab, the return
after an hour, moments moving at Milan's midnight, the banner on Globe, Team and Moments, and "Try again"
with "Trying…". Proven here for earlier journeys: L2-025 criterion 10's second half, a teammate who joins
while the Globe is open appearing at the next refresh with a pulse and no toast. Until now no spec proved it,
so journey 15 was 20 of 21 and strictly 90 while it showed 100; it is now 21 of 21 (100). Journey 23's
handed-on question is answered and proven: the pins carry the viewer's saved settings to a browser that
never opened Profile & Settings, and a change saved elsewhere arrives at the next refresh (ADR 0025;
journey 23 stays 100). Journey 26, counted criterion by criterion: 6 of 15 (40, from 0). Proven: L2-049
criteria 7 (here) and 10; L2-050 criteria 1, 2, 3 and 5. Not proven: L2-049 criterion 1 (city and position
kept, weather never zero), 2 (the Team row's status), 3 (cache under 3 hours), 4 (the failing kind's
cached moments), 5 (the 6-second ceiling), 6 (a breaker on the weather, no unbounded queue), 8 (the Globe's
"Loading your team…", and that it is polite) and 9 (the Globe's error, no stale data); L2-050 criterion 4
(requests recorded on Team, Moments, Profile & Settings and Sign In). Total: 85.
