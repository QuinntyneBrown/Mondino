# 0002: The e2e harness

**Status:** Accepted (journey 1, Scaffold the workspace)

## Context

The behaviour specs must use no real backend, database or clock and no network beyond
localhost, must be the same on every run, and must fail on an unanswered request, a request off
localhost or a page error. Selectors belong to page objects. The sweeps run only when a person
asks.

## Decision

- **Playwright, Chromium only**, pinned to one version (`@playwright/test` and, through
  `overrides`, `playwright-core`). No retries; `forbidOnly` in CI.
- **The specs run against the production build.** `npm run e2e` builds, then
  `e2e/support/serve.mjs` serves `dist/mondino/browser` on `127.0.0.1:4310` with `index.html`
  for every other address. It has no dependency. A request to `/api` that reaches it is answered
  599, which the harness reports.
- **One shared fixture**, `e2e/fixtures/test.ts`, exports `test` and `expect`; every spec
  imports them from there. Its automatic `guard`:
  - sets the clock with `page.clock.install` to the mocks' "now", Monday 27 October 2025, 14:05
    UTC (`e2e/fixtures/now.ts`); the browser's time zone is Europe/Rome, the viewer's;
  - answers `/api/**` from what the spec registered with `api.answer` or `api.refuse` (a
    ProblemDetails with a `code`), and records any other API request as a problem;
  - aborts and records any request whose host is not localhost;
  - records page errors and console errors;
  - fails the spec if any problem was recorded.
- **Page objects** in `e2e/pages/`, one per screen or dialog, own every selector and are handed
  to specs as fixtures. ESLint refuses a locator call or `waitForTimeout` in a spec.
- **The sweeps have their own configuration**, `playwright.sweeps.config.ts`, with the projects
  `visual`, `responsive` and `accessibility` (axe, WCAG 2.2 AA) over `e2e/sweeps/`. The default
  configuration cannot run them. They are written with each screen and run by
  `npm run e2e:visual`, `e2e:responsive` or `e2e:accessibility` when a person asks; no baseline
  is committed until a person has run the visual sweep and looked at it. The heap checks join
  them with the first feature that allocates heavily (the globe).
- **`e2e:typecheck`** compiles the specs, the sweeps and both configurations, so a sweep that
  is not run is still checked.

## Consequences

- A spec that needs the backend to answer says so in the spec, which is where a reader looks.
- The specs prove the built app, with its budgets and its lazy chunks, at the cost of a build
  (about 3 s) before each run.
