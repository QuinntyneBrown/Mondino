# Feature: Invite teammates

## Goal

"Invite teammate" in the header of Globe, Team, Moments and Profile & Settings opens the invite dialog:
"Invite teammates to Northwind", the team's invite link, "Copy link", and "13 on the team · link never
expires". Copying closes the dialog and shows the toast "Invite link copied. Paste it wherever your team
talks."; a refused copy keeps the dialog open with the link selected. On a phone the header button is an icon
and the dialog is a sheet from the bottom. The dialog has nothing else: no field, no teammate and no message.

Journey 16 of `docs/journeys.md`. Requirements: L2-054, L2-055 (`docs/specs/L2.md`).

Builds on: journeys 6 and 15. Journey 15 builds `TeamShell`, `AppHeader`, the invite card of a team of one,
`InviteLinkCopier` and the toast.

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
- The requirements: L2-054, L2-055 in `docs/specs/L2.md`, with every acceptance criterion, and the L1 each
  refines in `docs/specs/L1.md`.
- The mocks (the source of truth), under `docs/mocks/`: `dialogs/invite/default.html`,
  `dialogs/invite/copy-failed.html`, `notifications/invite-link/success.html`,
  `notifications/invite-link/danger.html`, `pages/globe/empty.html`, `pages/team/empty.html`,
  `pages/join/invite-unusable.html`. Read `docs/mocks/README.md` for the cast, its "now" (Monday 27 October
  2025, 14:05 UTC), where the mocks depart from the prototype and the open questions; the e2e fixtures use
  that cast and that time.
- The design system, under `docs/design-system/components/`: `dialog.html`, `button.html`, `text-field.html`,
  `toast.html`, `app-header.html`, `card.html`, and the tokens in `docs/design-system/tokens/`. Components are
  named as there and keep the mocks' BEM classes.
- `docs/detailed-designs/README.md` ("Contracts the features share", "Designed in the mocks, not here yet",
  "Not decided yet") and the neighbouring designs this builds on.
- The ADRs in `docs/adr/` for the areas this touches.
- If the mock and the requirement disagree anywhere in this scope, the mock is right: bring the requirement
  in line first (`engineering-requirements`). If a state this journey must build has no mock, draw it first
  with `writing-html-mocks`, then `extracting-design-systems` if it adds a component.

## Phase 2: Detailed design (`writing-software-design-documents`)
- This feature has requirements and mocks and no detailed design yet. Write it in
  `docs/detailed-designs/team/invite-teammates/`, in the house style of its neighbours: overview, parts, the
  L2 requirements it realises, C4 context, container and component, a class diagram, and a sequence diagram
  per behaviour. Cover `InviteDialog` as a CDK Dialog opened by `TeamShell` on `AppHeader`'s `invite` and by
  Team's "Invite teammates", loaded lazily; focus on open and on close; the two toasts; and the sheet under
  576 px. Bring the designs that still say "Invite teammate" copies the link
  (`team/view-week-around-the-world`, `platform/adapt-to-every-width`, the root README) in line.
- Render the diagrams with `python .claude/skills/writing-software-design-documents/scripts/render_puml.py
  docs/detailed-designs`.
- In `docs/detailed-designs/README.md`, move the feature from "Designed in the mocks, not here yet" into the
  table of subsystems and features, add any contract other features share, and bring the neighbouring designs
  it changes in line.

## Phase 3: Decide what is open (an ADR in `docs/adr/`, or the detailed design where it says so)
- "Reset link" (L2-055) is drawn and not designed: what it asks before it acts, and what the dialog shows
  afterwards (`docs/mocks/README.md`, open question 3). Do not build a control that does nothing. Leave "Reset
  link" out of the built dialog, record that in the design's open questions and in `docs/mocks/README.md`, and
  build only what L2-055's criteria state: a link that no longer works shows Join's "This invite link no
  longer works", the same for a reset, a withdrawn and a mistyped link.

## Phase 4: Incremental implementation (`implementing-incrementally`, test-first)
- Invoke the `implementing-incrementally` skill, and `angular-developer` for Angular code.
- Plan thin vertical slices, for example:
  1. Frontend: `InviteDialog` (CDK Dialog, its chunk loaded on first open) from `AppHeader`'s "Invite
     teammate" on all four screens: the title with the team's name, the read-only link, the count line (L2-054
     AC1, AC6).
  2. Focus: starts on "Copy link", stays inside, Escape and "Close" return it to the opener (AC2).
  3. "Copy link": the dialog closes and the success toast shows for 4 seconds, pausing while pointed at or
     focused (AC3); the same toast after "Copy" on the invite card (AC7).
  4. A refused copy: the dialog stays, the link is selected and focused, and the danger toast stays until
     dismissed (AC4). The clipboard is a token in `api` with a fake in e2e.
  5. Under 576 px: the header's icon button with its accessible name and 44 × 44 px target, and the dialog as
     a sheet from the bottom (AC5).
  6. "Invite teammates" on Team for a team of one opens the same dialog.
  7. Join's unusable invite link reads as the mock does for a reset, withdrawn or mistyped link, with one
     answer from the backend for all three (L2-055 AC1, AC2).
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
- Set journey 16 to 100 in the **% complete** column of `docs/journeys.md` (and in
  `docs/detailed-journeys.md` if it exists), and update the total.

## Deferred (not in this journey)
- "Reset link" itself, until it is designed.
- Sending an invite by email, or any message to a teammate: Mondino has no chat.
- Reduced motion and the full keyboard sweep of every dialog (journey 28).

## Done means
- From any of the four screens, "Invite teammate" opens the dialog, "Copy link" puts
  `mondino.app/join/northwind-7Kq2` on the clipboard, the dialog closes and the toast says so.
- The two dialog mocks and the two toasts are what is shown, light and dark, as a sheet on a phone.
- Nothing in the dialog does nothing when pressed.
- All the new and existing tests pass: `node tools/verify/verify.mjs` is green, and CI is green and under
  5 minutes.
- The requirement, detailed design, mocks, tests and code agree.
- The work is on a branch from `main` with a PR to `main` that fills in `.github/PULL_REQUEST_TEMPLATE.md`,
  one commit per slice with an imperative subject. Fetch and rebase onto `main` first, because another
  session may have pushed to it.
- Only then end the run, with a short summary of what was built, the decisions made along the way, and
  anything deferred.
