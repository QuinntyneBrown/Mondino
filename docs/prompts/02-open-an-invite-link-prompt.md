# Feature: Open an invite link

## Goal

A person who opens a team's invite link (`/join/:inviteToken`) sees the Join screen for that team before
giving anything: "Put yourself on the map.", the team's name, how many teammates are already here with up to
five of their initials, and the team's bare pins. An invite link that cannot be used says so and shows nothing
of any team; a teammate already in the team on this device goes to the Globe.

Journey 2 of `docs/journeys.md`. Requirements: L2-001 (`docs/specs/L2.md`).

Builds on: journey 1.

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
- The requirement: L2-001 in `docs/specs/L2.md`, with every acceptance criterion, and the L1 each refines in
  `docs/specs/L1.md`.
- The detailed design: `docs/detailed-designs/joining/open-invite-link/README.md` and its diagrams, and
  "Contracts the features share" in `docs/detailed-designs/README.md`.
- The mocks (the source of truth), under `docs/mocks/`: `pages/join/default.html`, `pages/join/loading.html`,
  `pages/join/invite-unusable.html`, `pages/join/error.html`. Read `docs/mocks/README.md` for the cast and its
  "now" (Monday 27 October 2025, 14:05 UTC); the e2e fixtures use that cast and that time.
- The design system, under `docs/design-system/components/`: `logo.html`, `avatar.html`, `text-field.html`,
  `select.html`, `button.html`, `form-field.html`, `globe.html`, `skeleton.html`, `alert.html`, and the tokens
  in `docs/design-system/tokens/`. Components are named as there and keep the mocks' BEM classes.
- The ADRs in `docs/adr/` for the areas this touches.
- If the mock, the requirement and the design disagree anywhere in this scope, the mock is right: bring the
  others in line first (use `engineering-requirements` and `writing-software-design-documents`; re-render
  changed diagrams with `python .claude/skills/writing-software-design-documents/scripts/render_puml.py
  docs/detailed-designs`). If a state this journey must build has no mock, draw it first with `writing-html-
  mocks`, then `extracting-design-systems` if it adds a component.

## Phase 2: Decide what is open (an ADR in `docs/adr/`, or the detailed design where it says so)
- The database engine (`<TO SUPPLY>` in `docs/detailed-designs/README.md`): decide it here in an ADR, with EF
  Core migrations applied by the CLI. Tests stay on EF Core InMemory.
- How a team and its invite link are made is not designed: seed them through the CLI's idempotent seed, and
  build no screen or endpoint for it.

## Phase 3: Incremental implementation (`implementing-incrementally`, test-first)
- Invoke the `implementing-incrementally` skill, and `angular-developer` for Angular code.
- Plan thin vertical slices, for example:
  1. Backend: `Team`, `Teammate` and `City` in the domain; `GET /api/invites/{inviteToken}` through
     `GetInviteQuery`, marked open to anyone, answering `InviteDto` (name, count, positions, avatars,
     countries) or 404 `invite_not_found`. Seed the Northwind team through the CLI.
  2. Backend: the invite rate limit, 30 opens a minute then 429 with `Retry-After` and `rate_limited` (L2-045
     AC2).
  3. Frontend: `InviteApi`/`INVITE_API` in `api`, bound at the lazy Join route; `JoinStore` and `JoinPage`
     with the loading and ready states and the form's fields drawn but inert.
  4. Frontend: invite link cannot be used, and the error state with "Try again" (also for 429).
  5. Frontend: the team's pins. Until journey 8 draws the globe, the stage shows the globe placeholder; the
     bare pins arrive with journey 8. Already a teammate: go to `/globe` (complete once journey 4 issues the
     session).
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
- Set journey 2 to 100 in the **% complete** column of `docs/journeys.md` (and in
  `docs/detailed-journeys.md` if it exists), and update the total.

## Deferred (not in this journey)
- The postal code lookup and the Join button's behaviour (journeys 3 and 4).
- The 3D globe (journey 8).
- Making a team (journey 5), signing in (journey 7) and resetting an invite link (not designed, L2-055).

## Done means
- Opening Northwind's invite link shows the Join screen as the four mocks draw it; an unknown token shows no
  team name, count or pins.
- The response carries no teammate id, name, city, time zone, weather or postal code.
- All the new and existing tests pass: `node tools/verify/verify.mjs` is green, and CI is green and under
  5 minutes.
- The requirement, detailed design, mocks, tests and code agree.
- The work is on a branch from `main` with a PR to `main` that fills in `.github/PULL_REQUEST_TEMPLATE.md`,
  one commit per slice with an imperative subject. Fetch and rebase onto `main` first, because another
  session may have pushed to it.
- Only then end the run, with a short summary of what was built, the decisions made along the way, and
  anything deferred.
