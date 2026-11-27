# Feature: View the week around the world

## Goal

With no pin selected, the Globe screen's panel shows "This week around the world" (the team's moments from
today to 7 days ahead) and "In working hours now". The heading gives the team's counts ("12 teammates", "12
time zones · 8 working · 2 asleep"). A team of one shows "Just you, for now" and the invite link to copy.

Journey 15 of `docs/journeys.md`. Requirements: L2-024, L2-025 (`docs/specs/L2.md`).

Builds on: journeys 10, 11 and 14. The moments list fills with journey 19; until then it shows its empty
wording, "No moments this week." (`pages/globe/no-moments`). This journey also builds `TeamShell` and
`AppHeader` (the header the mocks draw over the four teammate screens), which journey 16 builds on.

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
- The requirements: L2-024, L2-025 in `docs/specs/L2.md`, with every acceptance criterion, and the L1 each
  refines in `docs/specs/L1.md`.
- The detailed design: `docs/detailed-designs/team/view-week-around-the-world/README.md` and its diagrams, and
  "Contracts the features share" in `docs/detailed-designs/README.md`.
- The mocks (the source of truth), under `docs/mocks/`: `pages/globe/default.html`, `pages/globe/quiet.html`, `pages/globe/no-moments.html`,
  `pages/globe/empty.html`, `notifications/invite-link/success.html`, `notifications/invite-link/danger.html`.
  Read `docs/mocks/README.md` for the cast and its "now" (Monday 27 October 2025, 14:05 UTC); the e2e fixtures
  use that cast and that time.
- The design system, under `docs/design-system/components/`: `moment-row.html`, `panel-row.html`, `card.html`,
  `toast.html`, `button.html`, `app-header.html`, and the tokens in `docs/design-system/tokens/`. Components
  are named as there and keep the mocks' BEM classes.
- The ADRs in `docs/adr/` for the areas this touches.
- If the mock, the requirement and the design disagree anywhere in this scope, the mock is right: bring the
  others in line first (use `engineering-requirements` and `writing-software-design-documents`; re-render
  changed diagrams with `python .claude/skills/writing-software-design-documents/scripts/render_puml.py
  docs/detailed-designs`). If a state this journey must build has no mock, draw it first with `writing-html-
  mocks`, then `extracting-design-systems` if it adds a component.

## Phase 2: Incremental implementation (`implementing-incrementally`, test-first)
- Invoke the `implementing-incrementally` skill, and `angular-developer` for Angular code.
- Plan thin vertical slices, for example:
  1. The counts in `domain` (teammates, distinct time zones, working, asleep, through `statusFor`), changing
     on the hour with no reload.
  2. "In working hours now": by local hour then west to east, each row selecting its pin; "Nobody — it's quiet
     everywhere."
  3. "This week around the world": its lead, "No moments this week." until journey 19 brings the first 6
     moments in date order then west to east (each selecting its teammate's pin), and "All moments" always
     under it. The every-kind-off note with "Choose moments" comes with the viewer's chosen kinds (journey 23).
  4. The team of one: `InviteCard` with the invite link and "Copy"; no panel.
  5. Copying from the card through `InviteLinkCopier`: `Toast` hosted by `TeamShell`, success announced for
     4 seconds, refusal as an alert that stays until dismissed.
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
- Journey 14 built the teammate's and the group's panels and waits for this screen to prove that closing
  either, by its close button or Escape, returns the panel to the week's view (L2-023 criteria 4 and 10;
  the selection cleared and the pin settled back are proven) in Playwright; raise journey 14's % by the
  criteria proven here.
- Set journey 15 to 100 in the **% complete** column of `docs/journeys.md` (and in
  `docs/detailed-journeys.md` if it exists), and update the total.

## Deferred (not in this journey)
- The invite dialog behind "Invite teammate" in the header (journey 16).
- Moments data (journey 19) and the viewer's chosen kinds (journeys 20 and 23).

## Done means
- The Globe screen with no selection matches `default`, `quiet` and `empty`, and the two notifications.
- "Copy" on the invite card ends in the invite toasts. "Invite teammate" in the header is drawn and opens
  the invite dialog with journey 16.
- All the new and existing tests pass: `node tools/verify/verify.mjs` is green, and CI is green and under
  5 minutes.
- The requirement, detailed design, mocks, tests and code agree.
- The work is on a branch from `main` with a PR to `main` that fills in `.github/PULL_REQUEST_TEMPLATE.md`,
  one commit per slice with an imperative subject. Fetch and rebase onto `main` first, because another
  session may have pushed to it.
- Only then end the run, with a short summary of what was built, the decisions made along the way, and
  anything deferred.
