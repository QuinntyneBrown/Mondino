## Purpose

> Mondino is where a team spread around the world sees each other. A teammate joins with a
> postal code and appears as a pin on an interactive 3D globe. Each pin shows that teammate's
> local time, temperature and weather, and a playful highlight when something is happening
> where they live: a local holiday, a Formula 1 race, a festival.

Mondino is Italian for "little world". Its tagline is "Your team, around the world, right now."

**What it is for.** Teammates in Canada, the United States, Italy and anywhere else each give a
name and a postal code, and the team appears on a beautiful 3D globe. A teammate opens it,
sees who is where and what is happening there (a Raptors home game in Toronto, a Grand Prix in
Italy), and has something to talk about. It is a way to get to know each other, and nothing
more. It is a responsive web application, used on a phone, a tablet, a desktop and a large
screen.

**Direction.** One question decides everything: what is it like where my teammate is, right
now? The whole app is three ways in and four screens, and it stays that small:

1. **Join**: "Put yourself on the map." A name, a country and a postal code, beside the globe
   with the team already on it. The postal code is looked up ("Finding 20121…"), the pin is
   placed at city level with the weather there, and the button changes from "Place my pin" to
   "Join" and the team's name. A postal code that cannot be found says so, with the form that
   country's postal codes take; when the lookup is down, the teammate picks their city instead.
2. **Create Team**: "Start a team." A team name, a name, a work email, a country and a postal
   code. The team is made with its maker's pin on it, and the screen gives the invite link:
   "Now bring everyone in."
3. **Sign In**: "Welcome back." A work email and no password: Mondino emails a link that signs
   the teammate in, once, within 15 minutes.
4. **Globe**: the home screen. The globe with every teammate's pin, its night side shaded, and
   a count of teammates, time zones, and who is working and who is asleep. Beside it is a panel:
   with no pin selected, "This week around the world" and "In working hours now", six of each;
   with a pin selected, that teammate's city, local time, how far ahead or behind they are,
   their status, their weather, their moments and the working-hours overlap with you. Teammates
   whose pins would cover each other are one group pin with a count, which is how a team of
   hundreds is drawn; selecting it lists them by city. A team of one shows "Just you, for now"
   and the invite link.
5. **Team**: "Where everyone is in their day." A day ribbon that places each teammate at the
   hour they are living through, then everyone from west to east with their location, local
   time, offset, weather and next moment, filtered by All, Working now or Asleep. Past 40
   teammates the ribbon counts them at each half hour, and the list is searched and split into
   a section per city.
6. **Moments**: the holidays, races and local happenings where teammates live, filtered by
   kind, with today's moment at the top, then This week and Later.
7. **Profile & Settings**: "Your pin." The teammate's own pin on a small globe, their location,
   temperature in °C or °F, a 24-hour or 12-hour clock, which kinds of moment show on the globe,
   what teammates see (their weather, and whether they are working or asleep), and leaving the
   team.

- **A pin is a person, their clock and their sky.** It shows the teammate's initials in their
  own colour, their local time, the weather and the temperature. A pin that is pointed at,
  focused or selected lifts out from the globe, so teammates stay clear on a small globe. A
  moment marker beside a pin, in sun, means there is a moment there this week: its emblem says
  what it is, or a number says how many there are.
- **Only the city is shown.** A postal code places a pin at city level, enough to tell
  Mississauga from Toronto and no more, and stays private: a teammate sees another's city and
  country, never their postal code or an address.
- **Status comes from the local hour.** Working hours are 09:00 to 18:00, early morning 07:00
  to 09:00, evening 18:00 to 23:00, and from 23:00 to 07:00 a teammate is "Probably asleep".
  The working-hours overlap is the part of both working days that coincides, shown on your own
  clock.
- **A moment is one of four kinds**: a holiday, Formula 1, a local event, or sport. Holidays
  come from public calendars, and the weather from Open-Meteo. A moment's marker shows an
  emblem for it; a team's or a series' own logo is used only where Mondino holds the right to
  use it, and otherwise the marker shows Mondino's own icon for the kind.

Mondino has no chat, no calendar or meeting scheduler, no presence or activity tracking, no
precise location, no social feed, no adverts, and no admins or roles: whoever makes a team is
a teammate like any other. "Invite teammate" opens a dialog with the team's invite link, a
button to copy it and a way to reset it, and nothing else. There is no "Message" button:
Mondino has no chat. Three things are not designed yet, and none is built before its design
exists: how a teammate who joined by invite link, and so gave no email, signs in again; what a
sign-in link shows once it has expired or been used; and what "Reset link" asks before it acts
(`docs/mocks/README.md` lists them). Before adding or
changing anything, ask how it serves seeing where a teammate is and what it is like there right
now; if it does not, do not build it, and if a request works against it, say so.

The requirements are in `docs/specs/L1.md` (what Mondino must do) and `docs/specs/L2.md` (each
behaviour with its acceptance criteria). An acceptance test names the L2 requirements it covers
in a header comment (`// Traces to: L2-012`).

The detailed designs are in `docs/detailed-designs/`, one folder per subsystem and one per
feature inside it; its `README.md` lists them with the L2 requirements each realises.

The mission, Mondino's single L0 requirement, is not written yet. When it is, it goes in
`docs/specs/L0.md` and this section quotes it word for word; everything then points back to it.
Do not invent a mission in its place.

## Design

The design is the **Mondino App** prototype in Magic Patterns (the *Global Teammate Globe* OS):
the frames Join, Sign In, Create Team, Invite Needed, Globe, Team, Moments, Profile & Settings,
Left Team and Not Found. Beside it is the *Mondino Brand*
prototype (the frame *Logo & Wordmark*): the mark and wordmark on paper, ink and pin, the mark at
sizes down to 16 px, the app icon, the colours, the type and the pins. The OS's own design
thread holds the decisions behind it.

The mocks in `docs/mocks/` are the design and the ultimate source of truth: every screen in
every state, with `docs/mocks/manifest.json` listing them. They are transcribed from the Magic
Patterns prototype before any screen is built; when the prototype changes, the mocks are
transcribed again, and `docs/mocks/README.md` says where they depart from it, and why.
Everything else follows the mocks: `docs/design-system/`, which is extracted from them and which
they render through, `docs/specs/`, the ADRs, `docs/detailed-designs/`, these instructions and
the code. Where any of those disagrees with a mock, the mock is right and the other is brought
in line. When a mock changes, the design system, the requirement, the ADR it touches and the
detailed design are brought in line with it in that order, before any code.

- **Wordmark:** lowercase **mondino**, set in Gabarito, on every screen. It is never "Mondino"
  in the wordmark itself; in a sentence the product is "Mondino".
- **Mark:** a little world: a globe with one meridian and one parallel, and a single pin
  resting on its rim. Clear space on every side equals the pin's diameter.
- **Colour:** paper and ink carry the interface: a cool paper canvas, white surfaces and
  hairlines, and deep navy ink for text and navigation. Pin (orange-red) marks people and sun
  (yellow) marks moments; leaf (green) marks working hours and sea is the brand's navy. The
  globe has colours of its own. Nothing else competes. The prototype and the mocks are drawn
  in light and in dark.
- **Type:** Gabarito for the wordmark, names and clocks, and Inter for everything that is read.
  Times and temperatures use tabular figures.
- **The globe** is three-dimensional and beautiful: modelled in Blender, lit and shaded, with
  the soft, rounded, toy-like look of a modern animated film, in colours of its own: a bright
  blue ocean with a deeper rim, green land with sand and forest, white ice and cloud, and an
  ink outline. It turns slowly on its own, turns to a selected pin and holds there, and is
  dragged to spin. Its night side is shaded in dusk. A pin lifts out when it is pointed at,
  focused or selected, and its label sits beside it, clear of other pins. The prototype and
  the mocks draw the globe as a cartoon in two dimensions; that is the look the 3D globe
  aims for.
- **Phone:** one column. Globe puts the globe on top and the panel under it, and the header
  shows the mark without the wordmark and "Invite teammate" as an icon. Team shows each
  teammate's name, status, local time and next moment. A dialog is a sheet from the bottom.
- **Tablet and desktop:** Join, Sign In and Create Team put the form beside the globe, Globe
  puts the panel to the right of the globe, Team is a table, and Profile & Settings keeps the
  teammate's pin beside the settings.
- **Motion.** A panel changes with a short fade, a dialog and a toast come in the same way, and
  a newly placed pin pulses. Reduced motion removes them all, and stops the globe turning on
  its own.

Before a screen is built or changed, its states are drawn in `docs/mocks/`. The prototype's
sample team (Northwind, its thirteen teammates, their cities, postal codes, weather and moments,
and its "today") is the cast, not rules. Where the prototype works against a rule here (it tells
a stranger whether an email is known, it speaks of plans and admins, it shows a status by colour
alone), the mocks follow the rule, and `docs/mocks/README.md` records each place they depart,
and why.

## Where things are

- **The frontend is what people use.** `frontend/` is an Angular workspace and holds every
  screen: Join, Sign In, Create Team, Globe, Team, Moments and Profile & Settings, and the
  globe itself.
- **The backend holds the team.** `backend/` is a .NET service: teams and their invite links,
  teammates and their pins, sign-in links, the lookup that turns a postal code into a city, a position and a
  time zone, the weather at each pin, and the moments where teammates live. It is the only
  thing that calls the weather, postal code and calendar sources.
- Before building a feature, read its requirement (`docs/specs/`, `docs/journeys.md`), its
  detailed design (`docs/detailed-designs/`) and its mocks (`docs/mocks/`, the source of truth
  for the UI; `docs/design-system/` is extracted from them).
- Read the relevant ADRs in `docs/adr/` before changing the areas they cover.
- Where a rule below names something that does not exist yet (a project, a command, a fixture,
  a helper, a folder, a document), the first change that needs it adds it. The repository starts
  with these instructions and the skills, and nothing else.
- Run npm commands from `frontend/` and `dotnet` commands from `backend/`.
  `node tools/verify/verify.mjs` runs every CI check and the unit tests locally; run it before
  pushing.

Use the words the specs use in code, docs and UI; no synonyms. Someone who uses Mondino is a
"teammate", and teammates belong to a "team", joined through its "invite link" or made on Create Team. A teammate's
place on the "globe" is their "pin", placed from their "postal code" at their "city". A pin
shows the teammate's "local time", their "weather" and their "status": "Working hours", "Early
morning", "Evening" or "Probably asleep". How far a teammate is ahead or behind is their
"offset", and the working hours two teammates share are their "overlap". Something happening
where a teammate lives is a "moment", and its "kind" is a "holiday", "Formula 1", a "local
event" or "sport".

## Prefer best practice

Choose the platform's established best practice (Angular, .NET, Playwright, WCAG) over the
expedient way. A departure needs an ADR giving its reason. If a rule here or in an ADR conflicts
with best practice, say so and propose the correction; do not work around it silently.

## Frontend

A multi-project workspace under `frontend/projects/`. The baseline is three libraries, `api`
(contracts, types, injection tokens, and the HTTP clients for the backend), `domain` (rules the
browser applies itself: `time/`, `pins/`, `moments/`, `storage/`) and `components`
(presentation), and one application, `mondino`. A `globe` library (the globe's renderer and its
map data, imported dynamically) joins them when the globe is first drawn.

That baseline is where the organisation starts, not a limit on it. When a concern earns its own
library (a `browser` project for browser-only implementations, as `globe` is for the globe's
rendering, and so on), add it. A smaller, focused library that can be lazy-loaded on its own is
better than one that keeps growing. A further application needs its own ADR.

- **Dependency direction.** `mondino` → `components`, `api`, `domain`, `globe`; `domain` →
  `api`; `components` → `api` for types only; `globe` → `api`; `api` → nothing. No library
  imports an app. `mondino`'s `app.config.ts` is the composition root and binds every token,
  except those a lazy route brings, which that route binds so their code stays out of the
  initial bundle. ESLint enforces it. A new library takes its place in this direction, and the
  same change adds it to this rule and to the ESLint boundaries; it never depends on `mondino`,
  and `api` still depends on nothing.
- The rules of time (a teammate's local time, their status, their offset and the overlap) live
  in `domain`'s `time/` only, and are worked out from a pin's time zone and one clock that is
  injected, never from `new Date()` in a component. Which moments are today, this week or later
  lives in `moments/`.
- The backend decides what is allowed: who is in a team, and who may change or remove a pin.
  The frontend shows or hides a control for convenience and never relies on that for a rule.
- **The browser calls only the backend.** It never calls a weather, postal code, calendar or
  map service itself, so no third party learns where a teammate is. The globe's map data is
  bundled and served with the app.
- **The globe is 3D, built from assets modelled in Blender.** Which renderer draws it, and how
  the assets are exported and scaled back for a low-power device, is decided in an ADR before
  the Globe is built. The prototype draws it with d3-geo's orthographic projection and the
  mocks as a still picture; both stand in for the 3D globe and set its colours and its look.
- Prettier and angular-eslint own formatting and lint; CI fails on either.
- Current Angular: standalone components, signals for state, `OnPush` everywhere, zoneless.
- **Responsive at every width.** Every screen works from the narrowest phone to the widest
  desktop, as the mocks draw it; no screen is built for one form factor and patched for the
  rest.
- **Lazy loading and memory management come first.** They outrank convenience and any other
  frontend rule they conflict with; see *Lazy loading and memory* below.
- Selectors are `mo-*`; class, file and folder names omit the prefix. Libraries are imported
  as `@mondino/<library>`.
- **Presentation lives in `components`.** A presentation component takes inputs, emits outputs
  and injects no app service, token or router. Pages and dialogs that orchestrate stay in the
  app.
- **File per type.** A component is `name.ts` + `name.html` + `name.scss` with
  `templateUrl`/`styleUrl`, never inline `template`/`styles`. No inline `style` in templates.
- **One encapsulated BEM stylesheet per component.** Default encapsulation, never
  `ViewEncapsulation.None`. The component is the block, named as in the design system;
  `block__element`, `block--modifier`; a state assistive technology must know is an attribute
  (`aria-current`, `aria-invalid`, `aria-pressed`, `disabled`) and is styled through it. Never
  style another component's block. Keep the mocks' BEM classes: e2e locators depend on them.
- Global styles are foundations only (tokens, `@font-face`, reset, utilities). Read tokens by
  role, never hex. Fonts are bundled and self-hosted, never loaded from a CDN.
- **Declare each `ng-content` slot once.** A component rendering `<a>` or `<button>` by
  condition puts its slots in one `<ng-template>` rendered with `ngTemplateOutlet` in both
  branches. A consumer `@if` wrapping several `[slot=…]` nodes loses the slot (NG8011): one `@if`
  per node.
- Logic with many cases (a store, a tracker, a pure helper) lives in a service or helper with
  its unit tests, never in a component.
- Each service has a contract and an injection token in `api`; components depend on the token.
- **No inline forms.** Button-triggered editing opens a CDK Dialog or navigates to a screen.
  Never hand-roll modals. The invite dialog, "Leave Northwind?" and "Leave without saving?" are
  CDK Dialogs.
- A contract refuses with an error whose `code` a screen branches on; the teammate sees a generic
  message. Names and error strings from the backend or from storage are data, rendered as text,
  never as HTML.
- **What a teammate writes is data.** A teammate's name and role, a team's name, and a city or
  a moment's title from an outside source are rendered as text, never as HTML, wherever they
  appear.
- **A postal code is the teammate's own.** It appears only on that teammate's own Join, Create
  Team and Profile & Settings screens. It is never kept in browser storage, never in a URL, and
  never in what the frontend receives about another teammate.
- **So is an email.** It appears only on that teammate's own Sign In and Create Team screens and
  on "You need an invite link". It is never shown to another teammate, never kept in browser
  storage and never in a URL, and Sign In answers the same way whether or not Mondino knows it.
- Every interaction works by touch on a phone and by keyboard on a desktop; touch targets are
  at least 44 × 44 px; colour is never the only carrier of a state.

## Backend

Clean architecture, strict dependency direction: `Mondino.Domain` (entities, zero deps) ←
`Mondino.Application` (MediatR handlers, validators, DTOs, `IAppDbContext`) ←
`Mondino.Infrastructure` (EF Core, migrations, auth) ← `Mondino.Api` (controllers).

- Business rules live in handlers and domain services. A controller or hub method checks nothing
  itself and sends one MediatR request.
- The API does not apply migrations on startup; a CLI command does. Seed data is idempotent.
- Endpoints accept only what a team's own teammate may do; anything open to anyone (opening an
  invite link, looking up a postal code while joining, asking for a sign-in link, making a
  team) is marked so explicitly and is rate limited.
- Errors are ProblemDetails with a `code` extension where a client branches on them.
- Telemetry is OpenTelemetry. No log, metric or span carries a name, an email, a postal code, a
  position, a token, a query string or a body; a route is recorded as its template.
- A teammate sees only the team they are in, and changes or removes only their own pin.
- **A postal code never leaves the backend for another teammate.** It is used to find the
  city, the position and the time zone, and is returned only to the teammate it belongs to. A
  pin is placed at the city, never at the postal code's own position. An email never leaves it
  for another teammate either.
- **Outside sources sit behind interfaces in `Mondino.Application`.** The postal code lookup,
  the weather (Open-Meteo) and the holiday and race calendars are called only by the backend,
  with a timeout, and their answers are cached. When one fails, a pin still shows its local
  time; nothing fails because the weather is missing. An outside source receives a place,
  never a teammate's name or their team. The sender of sign-in emails sits behind an interface
  too, and receives an address and a link and nothing else.
- Local time is not stored or sent: the backend gives a pin's time zone, and the browser works
  out the time. Anything on the backend that depends on the time reads `TimeProvider`.
- A setting a deployed system needs is documented in the same change.

### Backend tests

- **No real database and no network.** Every test runs on EF Core InMemory (one store per
  fixture); never SQLite, LocalDB, SQL Server or a file. Inject database faults through
  `IAppDbContext`. The postal code lookup, the weather and the calendars are fakes that answer
  as the test tells them to, including failing.
- **Never sleep.** Await an event with a timeout that fails naming what did arrive, or advance
  `FakeTimeProvider`; no `Task.Delay`, no `Thread.Sleep`.
- The acceptance test through the API proves each slice. A rule with a table of cases also gets a
  direct test of the domain type or handler, one case per row.

## E2E (Playwright)

- **No real backend, database or clock, and no network beyond localhost.** API requests are
  answered by fixtures, the globe's map data is served from localhost, and a fixture sets the
  time the spec says it is, so every local time, status and moment is the same on every run. An
  unanswered request, a request off localhost or a page error fails the spec.
- Page Object Model: one page object per screen or dialog owns the selectors. Never put a
  selector in a test. Specs import `test`/`expect` from the shared fixture.
- Only behaviour specs run by default. Visual, responsive and accessibility sweeps are written
  and kept current but run only when a person asks; no agent runs them or updates baselines
  unprompted. Update baselines only for intentional design changes, after changing the mock.
- Chromium only; never configure or run another browser.
- In unit tests, time-driven rules (the clocks ticking over, a status changing at its hour, the
  postal code lookup after typing stops, a toast that dismisses itself, the countdown after too
  many tries) advance a fake clock; never sleep.

## CI (GitHub Actions)

- The pipeline is always green and finishes in under 5 minutes in total. A flaky or slow check is
  fixed or removed, never retried.
- It runs only the few highest-value tests per feature: lint, build and one critical acceptance
  path each. Unit tests run locally, never in CI.
- A setting a deployed system needs is documented in the same change.

## Lazy loading and memory (the top frontend priority)

Mondino is left open all day, in a tab beside the work, and glanced at. The globe has to appear
fast, turn smoothly on an ordinary laptop or a phone, and use no more memory at the end of the
day than at the start. A change that grows the initial bundle or leaks memory is not done,
whatever else it achieves.

- **Load only what is needed now.** Every route uses `loadComponent`/`loadChildren`; heavy or
  below-the-fold UI uses `@defer`; large libraries (the globe's renderer, its map data) and
  whole feature libraries are imported dynamically, never from the initial chunk. Keep the
  initial bundle small and the `angular.json` budgets tight; raising a budget needs a reason in
  the change.
- **Release everything you acquire.** Whatever a component, service or scene creates, it tears
  down when its owner is destroyed: subscriptions (`takeUntilDestroyed`/`DestroyRef`), timers,
  intervals and `requestAnimationFrame` loops,
  event listeners (the globe's pointer and resize listeners among them), observers,
  `AbortController`s, the clock that ticks the local times, whatever the globe's renderer
  holds, and pending requests a person has navigated away from.
- **Bound what grows.** A list that can grow without end (a large team's pins, the Team table,
  the moments) uses a fixed-size or windowed buffer, or is paged and dropped from memory.
  Nothing accumulates without a limit for the length of a visit.
- **Scope state to its use.** Provide services at the route or component that needs them, not
  in `root`, unless the whole app shares them. A screen's state goes when the teammate leaves it.
- **Prove it.** Leaving a screen returns its memory: a feature that allocates heavily
  (the globe, a large team) is checked for a stable heap across repeated enter and leave, and
  like the visual and accessibility sweeps, these heap checks run only when a person asks.
- **One clock, and it rests.** Every local time on a screen ticks from one shared clock, not a
  timer per pin, and the globe stops turning and drawing while its tab is hidden.

## Incremental implementation and ATDD (mandatory for product code)

Every change to user-impacting product code (the app, its libraries and the backend) needs a
requirement, a detailed design and a mock before implementation, and is built incrementally.
Mocks, designs, the design system, docs and test-only changes are exempt and get no tests.

Before writing product code, invoke and follow the `implementing-incrementally` skill, with ATDD:
plan small slices and finish one at a time. For each, write Given-When-Then criteria, write the
acceptance test (backend: through the API; frontend: Playwright with page objects), run it to
prove it fails for the expected reason, then implement only that slice, refactor green and run
the regression checks before the next. No bulk implementation, no tests added afterwards, no
weakening tests to pass. Keep requirement, design, mock, tests and code aligned throughout.

Never write architecture tests: no structure, layout, naming, banned-API or spec-traceability
tests. A test suite proves behaviour.

## Skills

The skills are in `.claude/skills/` and, as the same files, in `.agents/skills/`; a change to one
is made in both. They are used in this order as the product is built:
`engineering-requirements` (`docs/specs/`), `writing-html-mocks` (`docs/mocks/`, from the Magic
Patterns prototype), `extracting-design-systems` (`docs/design-system/`),
`writing-software-design-documents` (`docs/detailed-designs/`), `estimating-designs`,
`writing-feature-prompts`, then `angular-new-app`, `angular-developer` and
`implementing-incrementally` for the code. `grilling` stress-tests a plan and `creating-videos`
films a finished slice.

## Lessons learned and progress

Before a slice of `docs/detailed-journeys.md`, read `docs/lessons-learned.md` and apply the lessons
that fit. When the slice finishes, before it merges, add its entry there (what slowed it, new
lessons, and how each earlier lesson it applied worked) and update **% complete** in
`docs/detailed-journeys.md` and `docs/journeys.md`.
