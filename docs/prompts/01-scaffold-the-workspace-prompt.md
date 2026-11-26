# Feature: Scaffold the workspace

## Goal

The repository holds only docs and skills. After this journey it holds a running, empty Mondino: the Angular
workspace in `frontend/` (libraries `api`, `domain`, `components`, application `mondino`), the .NET solution
in `backend/` (`Mondino.Domain`, `Mondino.Application`, `Mondino.Infrastructure`, `Mondino.Api` and their test
project), the Playwright harness, `tools/verify/verify.mjs` and a GitHub Actions pipeline. A person who opens
an address that leads nowhere sees the Not found page as the mock draws it, which proves the whole path from
lint to e2e.

Journey 1 of `docs/journeys.md`. Requirements: L2-038 (`docs/specs/L2.md`).

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
    tracking, precise location, feed or adverts. "Invite teammate" copies the invite link and opens nothing
    else; there is no "Message" button; sign-in and making a team are not designed and are not built.
  - Use the specs' words in code, docs and UI: teammate, team, invite link, pin, postal code, city, local
    time, weather, status, offset, overlap, moment, kind.
  - Frontend (`frontend/`, Angular): libraries `api`, `domain`, `components`, `globe` and the app `mondino`,
    in the dependency direction ESLint enforces; standalone, signals, `OnPush`, zoneless; `mo-*` selectors;
    one `name.ts` + `name.html` + `name.scss` per component with the mocks' BEM classes; tokens by role;
    every route lazy; everything acquired is released; state scoped to its route; one shared, injected
    clock; the browser calls only the backend; a postal code is never stored, never in a URL.
  - Backend (`backend/`, .NET): `Mondino.Domain` ← `Mondino.Application` ← `Mondino.Infrastructure` ←
    `Mondino.Api`; a controller sends one MediatR request; errors are ProblemDetails with a `code`; outside
    sources sit behind interfaces with a timeout and a cache; time comes from `TimeProvider`; telemetry
    carries no name, postal code, position, token, query string or body.
  - Tests: backend on EF Core InMemory with fakes and `FakeTimeProvider`, never a sleep; e2e in Playwright,
    Chromium only, page objects own selectors, fixtures answer the API and set the clock, nothing leaves
    localhost. Each acceptance test names its requirements (`// Traces to: L2-0xx`). No architecture tests.
    Do not run the visual, responsive, accessibility or heap sweeps, and do not update baselines.
  - Where a rule names something that does not exist yet (a project, a command, a fixture, a helper, a
    folder, a document), this change adds it.
- Work through the phases below **in order**, using the repo skill each phase names.
- Copy the house style of each folder. Read the existing neighbours before you write anything new.

## Phase 1: Read, and bring the docs in line
- `AGENTS.md`, `CONTRIBUTING.md`, `README.md` and `docs/detailed-designs/README.md` ("The system in brief",
  "Contracts the features share", "Not decided yet").
- The requirement: L2-038 in `docs/specs/L2.md`, with every acceptance criterion, and the L1 each refines in
  `docs/specs/L1.md`.
- The detailed design: `docs/detailed-designs/platform/adapt-to-every-width/README.md` and its diagrams, and
  "Contracts the features share" in `docs/detailed-designs/README.md`.
- The mocks (the source of truth), under `docs/mocks/`: `pages/not-found/default.html`,
  `pages/brand/default.html`. Read `docs/mocks/README.md` for the cast and its "now" (Monday 27 October 2025,
  14:05 UTC); the e2e fixtures use that cast and that time.
- The design system, under `docs/design-system/components/`: `logo.html`, `link.html`, `button.html`, `skip-
  link.html`, and the tokens in `docs/design-system/tokens/`. Components are named as there and keep the
  mocks' BEM classes.
- The ADRs in `docs/adr/` for the areas this touches.
- If the mock, the requirement and the design disagree anywhere in this scope, the mock is right: bring the
  others in line first (use `engineering-requirements` and `writing-software-design-documents`; re-render
  changed diagrams with `python .claude/skills/writing-software-design-documents/scripts/render_puml.py
  docs/detailed-designs`). If a state this journey must build has no mock, draw it first with `writing-html-
  mocks`, then `extracting-design-systems` if it adds a component.

## Phase 2: Decide what is open (an ADR in `docs/adr/`, or the detailed design where it says so)
- Record the workspace baseline (test runners, lint boundaries, how the e2e fixtures answer the API and set
  the clock) as the first ADR(s), following best practice for Angular, .NET and Playwright; any departure from
  best practice gives its reason.

## Phase 3: Incremental implementation (`implementing-incrementally`, test-first)
- Invoke the `implementing-incrementally` skill, and `angular-developer` for Angular code.
- Plan thin vertical slices, for example:
  1. Frontend workspace with the `angular-new-app` skill: current Angular, zoneless, standalone, `OnPush`,
     SCSS, strict; projects `api`, `domain`, `components` and `mondino` under `frontend/projects/`, imported
     as `@mondino/<library>`; Prettier, angular-eslint and the ESLint boundaries for the dependency direction
     in `AGENTS.md`; tight budgets in `angular.json`.
  2. Global foundations only: tokens from `docs/design-system/tokens/tokens.css`, the bundled Gabarito and
     Inter from `docs/design-system/assets/fonts/` as self-hosted `@font-face`, reset and utilities. No
     component styles.
  3. Playwright harness (Chromium only): the shared fixture exporting `test`/`expect` that answers API
     requests from fixtures, sets the clock, and fails a spec on an unanswered request, a request off
     localhost or a page error; the page-object folder; behaviour specs as the default project, with the
     visual, responsive, accessibility and heap sweeps as separate projects that never run by default.
  4. First acceptance path: `**` shows `NotFoundPage` (lazy route) with `Logo`/`Wordmark`, the mock's copy and
     its link (L2-038 AC6). Spec first, see it fail, then build the page and the components it needs.
  5. Backend solution in the four layers with MediatR, `IAppDbContext`, EF Core (InMemory for tests),
     ProblemDetails with a `code`, `TimeProvider`, and a test project with a `WebApplicationFactory` fixture
     (one InMemory store per fixture, fakes for outside sources, `FakeTimeProvider`). First acceptance test
     through the API: the liveness endpoint answers and exposes nothing (L2-051 AC4, liveness only).
  6. A CLI command that applies migrations and an idempotent seed; the API applies none on startup.
  7. `tools/verify/verify.mjs`: format, lint, unit tests, production build, backend tests, e2e type check and
     behaviour specs, in one command, on any OS.
  8. GitHub Actions: lint, build and the one critical acceptance path each for frontend and backend, green and
     under 5 minutes; unit tests stay local.
  9. Docs the rules name and nothing yet has: `docs/adr/` with the ADRs this journey's choices need,
     `docs/lessons-learned.md`, and the README's Getting started and Build and test with the real commands
     (Node.js 24, .NET SDK 10).
- For each slice:
  - Write the Given-When-Then criteria, from the acceptance criteria in `docs/specs/L2.md`.
  - Write the acceptance test: backend through the API (`backend/`), frontend in Playwright with page
    objects (`frontend/`), each with its `// Traces to:` header.
  - Run it and show that it fails for the expected reason.
  - Implement the minimum that makes it pass, and refactor while the tests are green.
  - Run the regression checks (`node tools/verify/verify.mjs`), then commit the slice.
- When all slices are green, keep the requirement, design, mock, tests and code aligned with what was built.

## Phase 4: Lessons and progress
- Add this journey's entry to `docs/lessons-learned.md`: what slowed it, new lessons, and how each earlier
  lesson it applied worked.
- Set journey 1 to 100 in the **% complete** column of `docs/journeys.md` (and in
  `docs/detailed-journeys.md` if it exists), and update the total.

## Deferred (not in this journey)
- Every screen but Not found, and every endpoint but liveness.
- The `globe` library: it joins when the globe is first drawn (journey 6).
- The database engine and hosting platform (`<TO SUPPLY>` in `docs/detailed-designs/README.md`): the first
  journey that persists (journey 2) decides the engine.
- Readiness, traces and metrics (journey 26).

## Done means
- `node tools/verify/verify.mjs` runs every check from a clean clone and passes.
- An unknown address shows the Not found page as `docs/mocks/pages/not-found/default.html` draws it, light and
  dark, from 320 px up.
- The API starts, answers liveness, and applies no migration on startup.
- All the new and existing tests pass: `node tools/verify/verify.mjs` is green, and CI is green and under
  5 minutes.
- The requirement, detailed design, mocks, tests and code agree.
- The work is on a branch from `main` with a PR to `main` that fills in `.github/PULL_REQUEST_TEMPLATE.md`,
  one commit per slice with an imperative subject. Fetch and rebase onto `main` first, because another
  session may have pushed to it.
- Only then end the run, with a short summary of what was built, the decisions made along the way, and
  anything deferred.
