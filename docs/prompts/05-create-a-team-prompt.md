# Feature: Create a team

## Goal

A person with no team opens Create Team (`/new`), "Start a team.", and gives a team name, their name, a work
email, a country and a postal code. The postal code is looked up as on Join. The team is made with its maker's
pin on it, placed at the city, and the screen then reads "Northwind is on the map" and "Now bring everyone
in.", with the invite link to copy and "Go to the globe". Whoever makes a team is a teammate like any other:
there are no admins or roles.

Journey 5 of `docs/journeys.md`. Requirements: L2-053 (`docs/specs/L2.md`).

Builds on: journeys 1 to 4. It reuses Join's form fields, `PostalCodeField`, `LookupState` and the globe
stage, and the join handler's way of placing a pin at the city and issuing a session.

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
- The requirements: L2-053 in `docs/specs/L2.md`, with every acceptance criterion, and the L1 each refines in
  `docs/specs/L1.md`.
- The mocks (the source of truth), under `docs/mocks/`: `pages/create-team/default.html`,
  `pages/create-team/invalid.html`, `pages/create-team/submitting.html`, `pages/create-team/error.html`,
  `pages/create-team/created.html`, and Join's lookup states, whose messages Create Team shares:
  `pages/join/locating.html`, `pages/join/found.html`, `pages/join/not-found.html`,
  `pages/join/lookup-unavailable.html`, `pages/join/rate-limited.html`. Read `docs/mocks/README.md` for the
  cast, its "now" (Monday 27 October 2025, 14:05 UTC), where the mocks depart from the prototype and the open
  questions; the e2e fixtures use that cast and that time.
- The design system, under `docs/design-system/components/`: `logo.html`, `text-field.html`, `select.html`,
  `form-field.html`, `lookup-message.html`, `button.html`, `alert.html`, `globe.html`, `pin.html`,
  `toast.html`, `link.html`, and the tokens in `docs/design-system/tokens/`. Components are named as there and
  keep the mocks' BEM classes.
- `docs/detailed-designs/README.md` ("Contracts the features share", "Designed in the mocks, not here yet",
  "Not decided yet") and the neighbouring designs this builds on.
- The ADRs in `docs/adr/` for the areas this touches.
- If the mock and the requirement disagree anywhere in this scope, the mock is right: bring the requirement
  in line first (`engineering-requirements`). If a state this journey must build has no mock, draw it first
  with `writing-html-mocks`, then `extracting-design-systems` if it adds a component.

## Phase 2: Detailed design (`writing-software-design-documents`)
- This feature has requirements and mocks and no detailed design yet. Write it in
  `docs/detailed-designs/joining/create-team/`, in the house style of its neighbours: overview, parts, the L2
  requirements it realises, C4 context, container and component, a class diagram, and a sequence diagram per
  behaviour. Cover the `POST` that makes a team, its teammate, its invite token and the session in one
  transaction; the postal code lookup for someone with no invite link yet; where the email is held and who may
  read it; `CreateTeamPage` and its states; and the created state's copy button.
- Render the diagrams with `python .claude/skills/writing-software-design-documents/scripts/render_puml.py
  docs/detailed-designs`.
- In `docs/detailed-designs/README.md`, move the feature from "Designed in the mocks, not here yet" into the
  table of subsystems and features, add any contract other features share, and bring the neighbouring designs
  it changes in line.

## Phase 3: Decide what is open (an ADR in `docs/adr/`, or the detailed design where it says so)
- How a postal code is looked up before any invite link exists: L2-045 criterion 4 ties the lookup to an
  invite token. Choose the simplest safe option (an open, rate-limited lookup endpoint for Create Team that
  shares Join's limit of 10 a minute per client) and record it in the design and in L2-045.
- How the email is stored (normalised, unique per team or across teams) and protected at rest; record it in
  the design. It is used only to send that teammate's sign-in links (journey 7).
- Create Team with a postal code that cannot be found, or with the lookup down, is not drawn
  (`docs/mocks/README.md`, open question 9): draw those states first with `writing-html-mocks`, using Join's
  messages.

## Phase 4: Incremental implementation (`implementing-incrementally`, test-first)
- Invoke the `implementing-incrementally` skill, and `angular-developer` for Angular code.
- Plan thin vertical slices, for example:
  1. Backend: `POST /api/teams` (marked open, 3 an hour per client): validation of team name, name, email,
     country and postal code with ProblemDetails and a `code`; nothing stored on refusal (L2-053 AC8, AC9).
  2. Backend: one team, one teammate with a pin at the city, an invite token of at least 128 bits and a
     session for the maker, made together or not at all; a double submit makes one team (AC4). The answer
     carries no postal code and no email for anyone else (AC10).
  3. Backend: the postal code lookup for Create Team, with the same answers and codes as Join's.
  4. Frontend: the lazy route `/new` with `CreateTeamPage`: the five fields, the hints, "Create team", and the
     link to Sign In (AC1).
  5. Frontend: validation on submit with a message under each wrong field and focus on the first (AC2); the
     lookup states shared with Join (AC3).
  6. Frontend: submitting ("Creating your team…", pressed once) and the error state with "Try again", keeping
     what was typed (AC4, AC7); rate limited (AC9).
  7. Frontend: created: "Northwind is on the map", the invite link, "Copy link" reading "Copied", the refused
     copy, "Go to the globe", the pulsing pin handed to the globe stage, focus on the title (AC5, AC6).
     `TeamMembership` is stored with ids and the team's name, never the postal code or email.
  8. The links that lead here: "Start a team" on Join's unusable invite link, "You need an invite link" and
     "You’ve left".
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
- Set journey 5 to 100 in the **% complete** column of `docs/journeys.md` (and in
  `docs/detailed-journeys.md` if it exists), and update the total.

## Deferred (not in this journey)
- Signing in with the email (journey 7).
- The invite dialog and its toasts on the team's screens (journey 16); the created state's refused copy uses
  the same wording.
- The 3D globe turning to the new pin (journeys 8 and 9): until then the globe stage shows the still picture.
- The weather clause of the found line (journey 13).

## Done means
- A person makes Northwind from `/new`, sees "Northwind is on the map" with its invite link, and "Go to the
  globe" opens `/globe` as its only teammate.
- The five Create Team mocks, and the lookup states it shares with Join, are what the screen shows, by
  keyboard and by touch, from 320 px up.
- No postal code and no email is in a URL, in browser storage, in telemetry or in anything sent about another
  teammate.
- All the new and existing tests pass: `node tools/verify/verify.mjs` is green, and CI is green and under
  5 minutes.
- The requirement, detailed design, mocks, tests and code agree.
- The work is on a branch from `main` with a PR to `main` that fills in `.github/PULL_REQUEST_TEMPLATE.md`,
  one commit per slice with an imperative subject. Fetch and rebase onto `main` first, because another
  session may have pushed to it.
- Only then end the run, with a short summary of what was built, the decisions made along the way, and
  anything deferred.
