# Feature: Sign in with an emailed link

## Goal

A teammate who gave a work email comes back on a new browser or device. Sign In (`/sign-in`), "Welcome back.",
asks for the email and no password. Mondino emails a link that signs the teammate in once, within 15 minutes,
and the screen reads "Check your inbox" whether or not Mondino knows the email. Opening the link shows the
Globe of their team.

Journey 7 of `docs/journeys.md`. Requirements: L2-052 (`docs/specs/L2.md`).

Builds on: journeys 1, 5 and 6. Journey 5 stores the email of whoever makes a team; journey 6 gives the
session cookie, the guard and "You need an invite link".

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
- The requirements: L2-052 in `docs/specs/L2.md`, with every acceptance criterion, and the L1 each refines in
  `docs/specs/L1.md`.
- The mocks (the source of truth), under `docs/mocks/`: `pages/sign-in/default.html`,
  `pages/sign-in/invalid.html`, `pages/sign-in/submitting.html`, `pages/sign-in/sent.html`,
  `pages/sign-in/error.html`, `pages/invite-needed/default.html`. Read `docs/mocks/README.md` for the cast,
  its "now" (Monday 27 October 2025, 14:05 UTC), where the mocks depart from the prototype and the open
  questions; the e2e fixtures use that cast and that time.
- The design system, under `docs/design-system/components/`: `logo.html`, `text-field.html`,
  `form-field.html`, `button.html`, `alert.html`, `link.html`, and the tokens in `docs/design-system/tokens/`.
  Components are named as there and keep the mocks' BEM classes.
- `docs/detailed-designs/README.md` ("Contracts the features share",
  "Not decided yet") and the neighbouring designs this builds on.
- The ADRs in `docs/adr/` for the areas this touches.
- If the mock and the requirement disagree anywhere in this scope, the mock is right: bring the requirement
  in line first (`engineering-requirements`). If a state this journey must build has no mock, draw it first
  with `writing-html-mocks`, then `extracting-design-systems` if it adds a component.

## Phase 2: Detailed design (`writing-software-design-documents`)
- The design is `docs/detailed-designs/joining/sign-in/README.md`. Read it, its diagrams and the neighbouring
  designs it names before any code.
- Where the work shows the design to be wrong or incomplete, change it before the code, render its diagrams with
  `python .claude/skills/writing-software-design-documents/scripts/render_puml.py docs/detailed-designs`, and
  bring the neighbouring designs it changes in line.

## Phase 3: Decide what is open (an ADR in `docs/adr/`, or the detailed design where it says so)
- The email source (`<TO SUPPLY>` in `docs/detailed-designs/README.md`): choose a provider behind
  `ISignInEmailSender`, with a timeout, and record it with its terms in an ADR. Document every setting a
  deployed system needs. Tests use a fake that records what it was asked to send.
- Not designed, and not built here (L2-052, and "Not decided yet" in `docs/detailed-designs/README.md`): how a
  teammate who joined by invite link and gave no email signs in again, what is shown when an emailed link has
  expired or was already used and while one is being opened, which team is shown when one email is on more than
  one team, the words of the email, and what Sign In shows for a 429 (L2-045). A link that has been used or has
  expired signs no one in (L2-052 AC11).

## Phase 4: Incremental implementation (`implementing-incrementally`, test-first)
- Invoke the `implementing-incrementally` skill, and `angular-developer` for Angular code.
- Plan thin vertical slices, for example:
  1. Backend: `POST /api/sign-in-links` (marked open): validation (L2-044 AC9); the same status and body for a
     known and an unknown email (L2-043 AC9, L2-052 AC6); 5 requests in 15 minutes per client, then 429 with
     `Retry-After`; past 3 for one email in 15 minutes, no mail and the same answer (L2-045 AC7, AC8). A direct
     test per row of the limits, advancing `FakeTimeProvider`.
  2. Backend: the token: at least 128 bits, stored as a hash, single use, dead after 15 minutes (L2-043 AC10).
     `ISignInEmailSender` with its fake; the sender receives an address and a link and nothing else (L2-052
     AC13).
  3. Backend: `POST /api/sign-in-links/redemptions` (marked open, 10 openings a minute per client, L2-045 AC9):
     a good token gives journey 6's session cookie; a used or expired one gives no session and reveals nothing;
     an email on no team gets no session (L2-052 AC9 to AC12).
  4. Frontend: the lazy route `/sign-in` with `SignInPage`: default with "Start a team", the invalid email on
     submit with focus back on the field (AC1 to AC3).
  5. Frontend: submitting ("Sending link…", pressed once), sent ("Check your inbox", the email as text, focus
     on the title, "Use another email") and error with "Try again", keeping the email (AC4, AC5, AC7, AC8).
  6. Frontend: opening the link signs the teammate in and shows the Globe; the token is not in the address
     shown afterwards, and the email is in no URL and no browser storage (AC9). An email on no team sees "You
     need an invite link" with that email (AC10, L2-038 AC6).
  7. The links that lead here: "Use a different email" on "You need an invite link", "Sign in" on Create Team,
     and every other the mocks draw.
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
- Set journey 7 to 100 in the **% complete** column of `docs/journeys.md` (and in
  `docs/detailed-journeys.md` if it exists), and update the total.

## Deferred (not in this journey)
- An expired or used sign-in link's own screen, and signing in after joining by invite link: not designed.
- Signing out, and choosing between teams for an email on more than one: not designed; an email signs in to
  the team it was given on.
- Telemetry redaction as a whole (journey 30); this journey's logs and spans already carry no email or token.

## Done means
- Sofia asks for a link with sofia@northwind.co, sees "Check your inbox", opens the link within 15 minutes and
  sees Northwind's Globe; the same link opened again signs no one in.
- An unknown email gets the same screen and the same answer, and no email is sent.
- The five Sign In mocks are what the screen shows, by keyboard and by touch, from 320 px up.
- No email and no token is in a URL the teammate keeps, in browser storage or in telemetry.
- All the new and existing tests pass: `node tools/verify/verify.mjs` is green, and CI is green and under
  5 minutes.
- The requirement, detailed design, mocks, tests and code agree.
- The work is on a branch from `main` with a PR to `main` that fills in `.github/PULL_REQUEST_TEMPLATE.md`,
  one commit per slice with an imperative subject. Fetch and rebase onto `main` first, because another
  session may have pushed to it.
- Only then end the run, with a short summary of what was built, the decisions made along the way, and
  anything deferred.
