# 0018: The initial budget pays for Angular's runtime, which lazy screens put in the main chunk

**Status:** Accepted (bundle headroom pass, after journey 15). Supersedes the budgets of
[0005](0005-fetch-for-the-backend.md) and [0007](0007-join-form-runtime-in-the-initial-bundle.md),
and 0007's rule that components avoid signal queries. Its budget is tightened to 285 kB and
290 kB by [ADR 0030](0030-fast-to-load-and-light-all-day.md).

## Context

After journey 15 the initial bundle was 259.81 kB raw (68.26 kB transferred) against a 260 kB
warning and a 265 kB error. Journeys 3, 8, 10 and 15 each wrote around a platform feature to stay
under it: no `viewChild` (ADR 0007), no `@defer` and no `NgTemplateOutlet` (ADR 0012), no `@let`
and no text with two interpolations (ADR 0014), and the header's `aria-current` set from
`NavigationEnd` instead of `RouterLinkActive` (journey 15). Fifteen journeys remain, and three of
them open a CDK Dialog.

Measured with `ng build --stats-json` (esbuild's metafile), the initial chunks are:

| What | Raw | Of it |
|---|---|---|
| `main` | 237.03 kB | `@angular/core` 155.18, `@angular/router` 93.84 (86.83 of it one module), `rxjs` 20.74, `@angular/platform-browser` 15.04, `@angular/common` 7.04, `tslib` 2.51, Mondino's own code 3.54 |
| `styles` | 22.79 kB | `tokens.css` 21.44 (its `[data-theme="dark"]` block 3.74), `styles.scss` 1.35 |
| **Initial total** | **259.81 kB** | 68.26 kB transferred |

(The package figures are esbuild's bytes per input before the chunk's own wrapping; they add up to
slightly more than the chunk.) Mondino's own code in `main` is the route table (1.04 kB),
`SkipLink` (1.21 kB), `LocalTeamMembership` (0.72 kB), the root (0.36 kB), the guard and the
config. Every route is already lazy, every screen-scoped service is bound at its route or
component, there are no polyfills (zoneless), and the stylesheet is the tokens and the reset the
first paint needs.

The rest is not ours to move. `@angular/core`, `@angular/router` and the `rxjs` barrel are each
reached from `main` (the bootstrap and `provideRouter`), so esbuild places their modules in the
main chunk, and whatever any lazy screen uses of them is kept there. The same app with an empty
route table is 221.26 kB (198.47 kB of script); the lazy screens of journeys 1 to 15 have put
38.6 kB of Angular's runtime into `main` without a line of their code being there. That is the
floor: it moves with every Angular feature a screen uses for the first time, and with nothing
else.

Measured on this branch, each feature used once from a probe lazy route (journey 15's 259.81 kB,
plus 0.09 kB for the probe's route):

| First use, from a lazy screen | Initial total | Added |
|---|---|---|
| `@let` and a text with two interpolations | 260.31 kB | 0.4 kB |
| `NgTemplateOutlet` | 262.94 kB | 3.0 kB |
| `viewChild` / `contentChild` | 267.31 / 267.47 kB | 7.4 / 7.6 kB |
| `@defer` | 268.38 kB | 8.5 kB |
| `RouterLinkActive` | 269.70 kB | 9.8 kB |
| CDK `Dialog` (`@angular/cdk` 22.3.0) | 272.80 kB | 12.9 kB, 11.2 kB of it `@angular/core` |
| All of the above together | 286.96 kB | 27.1 kB |
| `HttpClient` | 279.94 kB | 20.0 kB, before `provideHttpClient` |

Moving the route table, the guard and `LocalTeamMembership` behind a lazy `loadChildren` would take
about 2 kB out of `main` at the cost of one more request, in series, before the first screen's own
chunk; the first paint is slower for it, so it is not done.

## Decision

- **The initial budget warns at 290 kB and fails at 300 kB** (raw; it was 260 and 265). The pass
  freed nothing worth its cost, so the budget pays for the features the remaining journeys need
  at their best practice: a CDK Dialog (journeys 16, 23 and 24), `RouterLinkActive`, `@defer`,
  signal queries, `NgTemplateOutlet` and `@let`, 287 kB together, and about 3 kB for the routes,
  header links and small runtime the remaining screens add. The warning is the signal that
  something outside that list has arrived; the 10 kB to the error is the gap ADR 0005 kept.
- **These features are no longer worked around for the bundle.** A screen uses `viewChild`,
  `@defer`, `@let`, `NgTemplateOutlet`, `RouterLinkActive` and the CDK where they are the
  platform's best practice. ADR 0007's rule on signal queries no longer holds.
- **Still measured, still recorded.** Every journey reads the chunk table before and after, as
  `docs/lessons-learned.md` asks. A change that adds more than 1 kB to the initial total with a
  feature not in the table above says so in its lesson; one that passes the warning needs a record
  like this one.
- **The browser still calls the backend with `fetch`** (ADR 0005). `HttpClient` would take 20 kB
  of the headroom, more than any feature above, for nothing the helper lacks.

## Consequences

- The initial total stays 259.81 kB raw and 68.26 kB transferred until a journey uses one of the
  features above; with all of them it is about 287 kB raw and 75.5 kB transferred.
- Earlier workarounds that best practice now beats, each to be changed by the journey that next
  touches its code, with its own measurement:
  - `TeamShell` marks the header's current screen from `NavigationEnd` (journey 15);
    `routerLinkActive` with `ariaCurrentWhenActive="page"` is the router's own way (9.8 kB, 0 once
    any screen uses it).
  - The error summary moves focus from an `afterRenderEffect` keyed by a counter instead of a
    `viewChild` (ADR 0007).
  - `GlobeView` is not behind `@defer` (ADR 0012); the renderer's dynamic import stays the lazy
    boundary for the 630 kB scene either way, so `@defer` would defer about 8 kB of the globe
    library's own code.
  - The pins' label line is one computed string and no template uses `@let` (ADR 0014).
- Not a candidate: `tokens.css`'s `[data-theme="dark"]` block (3.74 kB raw, about 0.4 kB
  transferred) is never matched in the app, which follows `prefers-color-scheme`, but the mocks
  render through the same file and it stays the design system's single source.
- If a later Angular release ships its runtime in modules that lazy chunks can take on their own,
  the floor falls and this budget is lowered with a record that supersedes this one.
