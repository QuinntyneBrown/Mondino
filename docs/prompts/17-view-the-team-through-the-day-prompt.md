# Feature: View the team through the day

## Goal

The Team screen, "Where everyone is in their day", places each teammate on a 24-hour day ribbon at the hour
they are living through, then lists everyone from west to east with their status, location, local time,
offset, weather and next moment: a table from 768 px, a row of name, status, local time and next moment on a
phone. It is filtered by All, Working now or Asleep, each with its count.

Journey 17 of `docs/journeys.md`. Requirements: L2-026, L2-027, L2-028 (`docs/specs/L2.md`).

Builds on: journeys 11, 12 and 13. "Coming up" fills with journey 19; until then it is a dash.

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
- The requirements: L2-026, L2-027, L2-028 in `docs/specs/L2.md`, with every acceptance criterion, and the L1
  each refines in `docs/specs/L1.md`.
- The detailed design: `docs/detailed-designs/team/view-team-through-the-day/README.md` and its diagrams, and
  "Contracts the features share" in `docs/detailed-designs/README.md`.
- The mocks (the source of truth), under `docs/mocks/`: `pages/team/default.html`, `pages/team/working.html`,
  `pages/team/asleep.html`, `pages/team/no-results.html`, `pages/team/loading.html`, `pages/team/empty.html`,
  `pages/team/error.html`, `pages/team/weather-unavailable.html`, `pages/team/edge.html`. Read
  `docs/mocks/README.md` for the cast and its "now" (Monday 27 October 2025, 14:05 UTC); the e2e fixtures use
  that cast and that time.
- The design system, under `docs/design-system/components/`: `team-table.html`, `day-ribbon.html`, `segmented-
  control.html`, `status.html`, `avatar.html`, `empty-state.html`, `skeleton.html`, and the tokens in
  `docs/design-system/tokens/`. Components are named as there and keep the mocks' BEM classes.
- The ADRs in `docs/adr/` for the areas this touches.
- If the mock, the requirement and the design disagree anywhere in this scope, the mock is right: bring the
  others in line first (use `engineering-requirements` and `writing-software-design-documents`; re-render
  changed diagrams with `python .claude/skills/writing-software-design-documents/scripts/render_puml.py
  docs/detailed-designs`). If a state this journey must build has no mock, draw it first with `writing-html-
  mocks`, then `extracting-design-systems` if it adds a component.

## Phase 2: Incremental implementation (`implementing-incrementally`, test-first)
- Invoke the `implementing-incrementally` skill, and `angular-developer` for Angular code.
- Plan thin vertical slices, for example:
  1. The west-to-east order in `domain` (current UTC offset, then longitude), with direct tests.
  2. `TeamPage` (lazy) with the heading and `TeamTable`: the columns Person, Location, Local time, Compared
     to you, Weather and Coming up; the viewer's row; a row is a link to the Globe with that pin selected.
  3. The phone layout under 768 px.
  4. `DayRibbon`: markers at their hour, working hours and night labelled in words, two teammates at one hour
     both reachable, markers as links, 12-hour ticks hour-only.
  5. The `Segmented` tab list with counts; the two no-results messages; counts and list changing on the hour;
     a teammate who hides their status is under All only.
  6. Loading, error, the team of one and the edge cases (a very long name, a one-word name, a name typed as
     markup).
  7. A bounded number of rows in the page: at most 40. Until journey 18 builds the bar chart, the search and
     the city sections (whose open sections bound the rows of a team of 500, L2-026 criterion 7), a team past
     40 lists the first 40 of the filter west to east and its ribbon draws its bands and scale with no
     marker. (The design bounds a large team by its city sections, not by windowing one table.)
- For each slice:
  - Write the Given-When-Then criteria, from the acceptance criteria in `docs/specs/L2.md`.
  - Write the acceptance test: backend through the API (`backend/`), frontend in Playwright with page
    objects (`frontend/`), each with its `// Traces to:` header.
  - Run it and show that it fails for the expected reason.
  - Implement the minimum that makes it pass, and refactor while the tests are green.
  - Run the regression checks (`node tools/verify/verify.mjs`), then commit the slice.
- When all slices are green, keep the requirement, design, mock, tests and code aligned with what was built.

## Phase 3: Lessons and progress
- Add this journey's entry to `docs/lessons-learned.md`: what slowed it, new lessons, and how each earlier
  lesson it applied worked.
- Journey 12 built the offset, the overlap and `OverlapBar` and waits for this screen to prove
  the Team rows' offset (L2-016 criteria 1 to 4 and 6) in Playwright; raise journey 12's % by the criteria proven here.
- Journey 13 waits for this screen to prove the Team row's weather icon, a `WeatherIcon` that stands alone
  and is read as its word (L2-018 criterion 5), and the row's "55°" for a viewer in °F (L2-019 criterion 1,
  with the panel's from journey 14) in Playwright; raise journey 13's % by the criteria proven here.
- Journey 15 links "2 more on the Team page" to `/team?filter=working` and waits for this screen to prove
  that it opens the Team screen with "Working now" chosen (L2-024 criterion 3); add Team to `TeamShell`'s
  children, so the header's "Team" link reaches it. Raise journey 15's % by the criterion proven here.
- Journey 16 built the invite dialog (`InviteDialogOpener`, provided by `TeamShell`) and waits for this screen
  to prove, in Playwright, that "Invite teammate" in the header opens it on Team (L2-054 criterion 1, L2-025
  criterion 7, with Moments and Profile & Settings) and that "Invite teammates" on the card of a team of one
  opens the same dialog (L2-054 criterion 6); open it through `InviteDialogOpener.open(trigger)`. Raise
  journey 16's and journey 15's % by the criteria proven here.
- Journey 11 waits for this screen to prove that a teammate who does not share their status is listed under
  All only, not under Working now nor Asleep nor in their counts (L2-015 criterion 4; the Globe's half is
  proven by journey 15); raise journey 11's % when it is.
- Set journey 17's **% complete** in `docs/journeys.md` (and in `docs/detailed-journeys.md` if it exists) by
  count: the share of its criteria proven by a passing acceptance test. L2-026 criteria 7, 9 and 10's next
  moment, and L2-027 criteria 11 and 12's bar, wait for journeys 18 and 19. Update the total.

## Deferred (not in this journey)
- Past 40 teammates the day ribbon is a bar chart of the teammates at each half hour (L2-027 AC8 to AC10), and
  the list gains a search and a section per city (L2-056). Journey 18 builds both. This journey builds the team
  of 40 or fewer, with rows bounded.
- "Invite teammates" on the team of one opens journey 16's invite dialog.

## Done means
- The nine Team mocks are what the screen shows in those states.
- No postal code appears; arrow keys move between the filters.
- All the new and existing tests pass: `node tools/verify/verify.mjs` is green, and CI is green and under
  5 minutes.
- The requirement, detailed design, mocks, tests and code agree.
- The work is on a branch from `main` with a PR to `main` that fills in `.github/PULL_REQUEST_TEMPLATE.md`,
  one commit per slice with an imperative subject. Fetch and rebase onto `main` first, because another
  session may have pushed to it.
- Only then end the run, with a short summary of what was built, the decisions made along the way, and
  anything deferred.
