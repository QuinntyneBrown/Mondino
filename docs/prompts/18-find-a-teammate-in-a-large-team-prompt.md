# Feature: Find a teammate in a large team

## Goal

Past 40 teammates the Team screen changes shape. The day ribbon becomes a bar chart of how many teammates are
at each half hour of their day ("324 of 500 are in working hours right now"). The list gains a search, "Find a
person or city", and splits into one section per city from west to east, each with its count and local time. A
search that matches no one says so and offers "Show everyone". A team of 40 or fewer is unchanged.

Journey 18 of `docs/journeys.md`. Requirements: L2-056 (`docs/specs/L2.md`).

Builds on: journey 17, which builds the Team screen, its day ribbon, its filter and its bounded rows for a
team of 40 or fewer.

## Finish the whole feature in one run. Do not stop. (CRITICAL)

- You are authorised to take this feature all the way: reading and aligning the docs, any decision the work
  needs, incremental test-first implementation, progress tracking, green tests and a PR. Go through
  every phase and every slice in one continuous run. Do not pause between phases to report, ask for approval,
  or wait for "continue".
- Do not end your turn until the "Done means" list at the bottom is fully true. A partial result, a plan, or
  "the next steps would be..." is not done.
- Where the repo's instructions say "stop and ask", treat this prompt as the confirmation in advance for
  everything in scope here. Choose the simplest option that fits the existing architecture, record it (an ADR
  or the design's open-questions section, if the repo has them), and keep going.
- If a shared library, component or design asset lacks something, that is not a reason to stop. Update it
  first, as the repo's rules require, then go on.
- When a test, build or command fails, find the root cause and fix it, then go on. Never weaken a test to make
  it pass, and never skip a step quietly.
- Only stop for a real blocker you cannot resolve yourself, such as missing credentials, or an action outside
  this repo that can't be undone, such as production deploys or data changes. If that happens, finish
  everything else first, then report the blocker clearly.
- Keep track of progress (a todo list), so that nothing gets left out after context is summarised.

## Rules (read first, binding)

- Follow the repo's agent instructions exactly (`AGENTS.md`, `CONTRIBUTING.md`), especially:
  - The mocks in `docs/mocks/` are the source of truth. Where a design, a requirement or the code disagrees
    with a mock, the mock is right. A mock changes first, then `docs/design-system/`, `docs/specs/`, the ADR
    and `docs/detailed-designs/`, in that order, before any code.
  - Build nothing that has no requirement, detailed design and mock. Mondino has no chat, scheduler, presence
    tracking, precise location, feed, adverts, admins or roles. "Invite teammate" opens the invite dialog
    (the link, "Copy link" and "Reset link", nothing else); there is no "Message" button. Three things are
    not designed and are not built: how a teammate who joined by invite link signs in again, what a used or
    expired sign-in link shows, and what "Reset link" asks before it acts (`docs/mocks/README.md`).
  - Use the specs' words in code, docs and UI: teammate, team, invite link, pin, postal code, city, local
    time, weather, status, offset, overlap, moment, kind.
  - Frontend (`frontend/`, Angular): libraries `api`, `domain`, `components`, `globe` and the app `mondino`,
    in the dependency direction ESLint enforces; standalone, signals, `OnPush`, zoneless; `mo-*` selectors;
    one `name.ts` + `name.html` + `name.scss` per component with the mocks' BEM classes; tokens by role;
    every route lazy; everything acquired is released; state scoped to its route; one shared, injected
    clock; the browser calls only the backend; a postal code and an email are never stored, never in a URL.
  - Backend (`backend/`, .NET): `Mondino.Domain` ← `Mondino.Application` ← `Mondino.Infrastructure` ←
    `Mondino.Api`; a controller sends one MediatR request; errors are ProblemDetails with a `code`; outside
    sources sit behind interfaces with a timeout and a cache; time comes from `TimeProvider`; telemetry
    carries no name, email, postal code, position, token, query string or body.
  - Tests: backend on EF Core InMemory with fakes and `FakeTimeProvider`, never a sleep; e2e in Playwright,
    Chromium only, page objects own selectors, fixtures answer the API and set the clock, nothing leaves
    localhost. Each acceptance test names its requirements (`// Traces to: L2-0xx`). No architecture tests.
    Do not run the visual, responsive, accessibility or heap sweeps, and do not update baselines.
  - Where a rule names something that does not exist yet (a project, a command, a fixture, a helper, a
    folder, a document), this change adds it.
- Work through the phases below **in order**, using the repo skill each phase names.
- Copy the house style of each folder. Read the existing neighbours before you write anything new.

## Phase 1: Read, and bring the docs in line
- `docs/lessons-learned.md`: apply the lessons that fit (journey 1 creates it).
- The requirements: L2-056 in `docs/specs/L2.md`, with every acceptance criterion, and the L1 each refines in
  `docs/specs/L1.md`.
- The mocks (the source of truth), under `docs/mocks/`: `pages/team/hundreds.html`,
  `pages/team/hundreds-no-match.html`, `pages/team/default.html`, `pages/team/no-results.html`,
  `pages/globe/hundreds.html`. Read `docs/mocks/README.md` for the cast, its "now" (Monday 27 October 2025,
  14:05 UTC), where the mocks depart from the prototype and the open questions; the e2e fixtures use that cast
  and that time.
- The design system, under `docs/design-system/components/`: `day-ribbon.html`, `team-table.html`,
  `text-field.html`, `segmented-control.html`, `empty-state.html`, `button.html`, and the tokens in
  `docs/design-system/tokens/`. Components are named as there and keep the mocks' BEM classes.
- `docs/detailed-designs/README.md` ("Contracts the features share", "Designed in the mocks, not here yet",
  "Not decided yet") and the neighbouring designs this builds on.
- The ADRs in `docs/adr/` for the areas this touches.
- If the mock and the requirement disagree anywhere in this scope, the mock is right: bring the requirement
  in line first (`engineering-requirements`). If a state this journey must build has no mock, draw it first
  with `writing-html-mocks`, then `extracting-design-systems` if it adds a component.

## Phase 2: Detailed design (`writing-software-design-documents`)
- This feature has requirements and mocks and no detailed design yet. Write it in
  `docs/detailed-designs/team/find-teammate-in-large-team/`, in the house style of its neighbours: overview,
  parts, the L2 requirements it realises, C4 context, container and component, a class diagram, and a sequence
  diagram per behaviour. Cover the threshold of 40, the half-hour counts and the grouping by city as pure
  helpers in `domain` (`time/` and `pins/`) worked out from the injected clock, the search as a signal held by
  the Team page, how sections and rows are windowed so the page holds a bounded number, and what the ribbon
  says in words. Bring `team/view-team-through-the-day` in line.
- Render the diagrams with `python .claude/skills/writing-software-design-documents/scripts/render_puml.py
  docs/detailed-designs`.
- In `docs/detailed-designs/README.md`, move the feature from "Designed in the mocks, not here yet" into the
  table of subsystems and features, add any contract other features share, and bring the neighbouring designs
  it changes in line.

## Phase 3: Decide what is open (an ADR in `docs/adr/`, or the detailed design where it says so)
- How a section per city is windowed (a virtual scroll over sections and rows, or sections that render their
  rows when near the viewport) so the rows in the page stay under a fixed limit; record the limit and the
  choice in the design.
- Whether a section starts open or closed for a team of 500, as the mock draws it; follow the mock.

## Phase 4: Incremental implementation (`implementing-incrementally`, test-first)
- Invoke the `implementing-incrementally` skill, and `angular-developer` for Angular code.
- Plan thin vertical slices, for example:
  1. `domain`: counts per half hour from pins and the clock, and the grouping by city from west to east;
     direct unit tests, one case per row, with a fake clock.
  2. The ribbon as a bar chart past 40 teammates, with its sentence in words; a face per teammate at 40 or
     fewer (L2-056 AC1, AC5).
  3. A section per city with its count and local time, teammates under it, within the filter that is on (AC2).
  4. The search: name or city, as typed, within the filter; matched in the browser, in no URL and no storage
     (AC3, AC7).
  5. No match: the live region, "Try another filter." and "Show everyone", which clears the search and returns
     to All (AC4).
  6. A team of 500 from a fixture: rows in the page stay under the limit while scrolling and searching (AC6).
- For each slice:
  - Write the Given-When-Then criteria, from the acceptance criteria in `docs/specs/L2.md`.
  - Write the acceptance test: backend through the API (`backend/`), frontend in Playwright with page
    objects (`frontend/`), each with its `// Traces to:` header.
  - Run it and show that it fails for the expected reason.
  - Implement the minimum that makes it pass, and refactor while the tests are green.
  - Run the regression checks (`node tools/verify/verify.mjs`), then commit the slice.
- When all slices are green, keep the requirement, design, mock, tests and code aligned with what was built.

## Phase 5: Lessons and progress
- Add this journey's entry to `docs/lessons-learned.md`: what slowed it, new lessons, and how each earlier
  lesson it applied worked.
- Set journey 18 to 100 in the **% complete** column of `docs/journeys.md` (and in
  `docs/detailed-journeys.md` if it exists), and update the total.

## Deferred (not in this journey)
- Moments for a team of 500 is not drawn (`docs/mocks/README.md`, open question 7); journey 21 bounds its
  rows.
- Group pins on the Globe for a team of hundreds (journey 10).
- The heap check across enter and leave (journey 29), which runs only when a person asks.

## Done means
- With the fixture of 500, Team shows the bar chart, the search and a section per city as
  `pages/team/hundreds.html` draws them; "Reykjavik" shows the no-match state, and "Show everyone" restores
  the list.
- With the cast of thirteen, Team is as journey 17 left it.
- The number of rows in the page stays bounded for a team of 500.
- All the new and existing tests pass: `node tools/verify/verify.mjs` is green, and CI is green and under
  5 minutes.
- The requirement, detailed design, mocks, tests and code agree.
- The work is on a branch from `main` with a PR to `main` that fills in `.github/PULL_REQUEST_TEMPLATE.md`,
  one commit per slice with an imperative subject. Fetch and rebase onto `main` first, because another
  session may have pushed to it.
- Only then end the run, with a short summary of what was built, the decisions made along the way, and
  anything deferred.
