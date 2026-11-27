# 0001: The frontend workspace

**Status:** Accepted (journey 1, Scaffold the workspace)

## Context

`AGENTS.md` asks for an Angular workspace of several projects (`api`, `domain`, `components`,
the application `mondino`, later `globe`), a one-way dependency direction that ESLint enforces,
every route lazy, a small initial bundle, and tokens and fonts that come from the design system.

## Decision

- **Current Angular, as the CLI makes it**: standalone components, signals, zoneless, `OnPush`
  (the schematics default to it and lint requires it), SCSS, strict TypeScript, the
  `@angular/build` application builder, and Vitest through `ng test`.
- **Libraries are read from source.** `@mondino/<library>` is a `tsconfig.json` path to the
  library's `src/public-api.ts`. The libraries have no build target and are never packaged: the
  application's build compiles them, so a component used only by a lazy route lands in that
  route's chunk. Each library has a `package.json` with `"sideEffects": false`; without it a
  component exported from a library's public API stays in the initial bundle even when only a
  lazy route uses it (the initial bundle was 55 kB larger before it was added).
- **One ESLint configuration**, `frontend/eslint.config.js`, run as `npm run lint`. The
  dependency direction is `no-restricted-imports` per project: `api` imports no `@mondino`
  library; `domain` imports `api` only; `components` imports `api` only and never
  `@angular/router`; `globe` imports `api` only; no project reaches another by a relative path.
  A new library adds its rule in the change that adds it.
- **A button is an attribute on the native element** (`a[mo-button]`, `button[mo-button]`), so a
  presentation component needs no router: the screen puts `routerLink` on the link itself.
- **Unit tests.** `ng test` runs the test target of every project that has one. A library gets
  its target with its first spec; it borrows the application's build target
  (`"buildTarget": "mondino:build:development"`), since it has none of its own.
- **Tokens and fonts come from the design system, not a copy.** `angular.json` lists
  `docs/design-system/tokens/tokens.css` as a global style; the builder follows its `@font-face`
  URLs and bundles Gabarito and Inter with the app. `styles.scss` holds only the reset and the
  utilities. A component's tokens (`--btn-*`) live in its own stylesheet.
- **Budgets.** The initial bundle warns at 245 kB and fails at 260 kB (raw); it is 238 kB with
  the router and the root. A component's stylesheet warns at 4 kB.
- **In development** `ng serve` proxies `/api` to the backend on `http://localhost:5080`
  (`proxy.conf.json`), so the browser calls one origin, as it does when deployed.

## Consequences

- The frontend build reads a file under `docs/`. A build of `frontend/` alone (a container that
  copies only that folder) must copy `docs/design-system/tokens` and `assets/fonts` too.
- Nothing checks a library in isolation; the application's build and lint are the check.
- Angular's CLI generates a component as `name.ts`, `name.html`, `name.scss`, which is the file
  layout `AGENTS.md` asks for.
