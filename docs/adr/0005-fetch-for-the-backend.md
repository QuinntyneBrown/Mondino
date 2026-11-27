# 0005: The browser calls the backend with `fetch`

**Status:** Accepted (journey 2, Open an invite link)

## Context

Angular's best practice for HTTP is `HttpClient`. Join is the first screen that calls the
backend. Bound only at Join's lazy route, `HttpClient` still landed in the initial bundle and
grew it by 35 kB (raw), past the 260 kB budget: `@angular/platform-browser` imports
`@angular/common/http`, so the module that holds `HttpClient` is part of the initial chunk, and
whatever of it any screen uses is kept there. `AGENTS.md` puts lazy loading and memory above
convenience and above any other frontend rule they conflict with.

## Decision

- **The HTTP clients in `api` call the browser's own `fetch`**, through one helper,
  `getJson(url, signal)` (`projects/api/src/lib/http/request.ts`), which other verbs join as
  they are needed. It sends cookies to the same origin only, takes an `AbortSignal` so a screen
  can cancel what it no longer needs, and turns a refusal into an `ApiError` with the
  ProblemDetails' `code`, and no answer into `unreachable`.
- A contract in `api` stays a promise that takes an `AbortSignal`; the stores own the
  `AbortController` and abort it when they are destroyed.
- **The initial budget** warns at 255 kB and fails at 265 kB (it was 245 and 260). The first
  screen that renders lists, switches and effects (`@for`, `@switch`, `effect`) brings Angular's
  runtime for them into the initial chunk, wherever that screen is loaded, since `@angular/core`
  is one module there. That is 15 kB, and the initial bundle is now 252 kB.

## Consequences

- Nothing in the frontend can use an `HttpClient` interceptor. Whatever an interceptor would add
  (the antiforgery header of `protect-team-data`, journey 6) is added in `request.ts`.
- If a later Angular release stops `platform-browser` from importing `@angular/common/http`, this
  record is superseded and the clients move to `HttpClient`.
