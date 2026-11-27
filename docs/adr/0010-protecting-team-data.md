# 0010: Every endpoint needs a session unless marked open, and the app is served under a nonce-based CSP

**Status:** Accepted (journey 6, Protect team data). Builds on
[ADR 0008](0008-session-and-cross-site-requests.md) and [ADR 0009](0009-making-a-team.md).

## Context

`protect-team-data` (L2-007, L2-043, L2-044, L2-045) left open, or described in a way the code
since departed from:

- how the state-changing requests that need a session are protected against cross-site request
  forgery: the design had Angular's `HttpClient` send an antiforgery token, but the browser calls
  the backend with `fetch` ([ADR 0005](0005-fetch-for-the-backend.md));
- how a session of a teammate who has left is refused, and what refuses a request for another
  team;
- the Content-Security-Policy, when the API serves the Angular build from its own `wwwroot`
  ([ADR 0004, Azure hosting](0004-azure-hosting.md)), whose `index.html` holds an inlined critical
  stylesheet and a script, and whose components add `<style>` elements at run time;
- which address a client's rate limits are counted by behind App Service's front end.

## Decision

- **Closed by default.** The API's fallback authorisation policy requires an authenticated
  teammate. `InvitesController` and `TeamCreationController` (and `SignInController` with
  journey 7), the health endpoints, the app's own files and the 404 for an unknown `/api` address
  are the only things marked `[AllowAnonymous]`; each open action names a rate limit policy. No
  endpoint is open by omission: an acceptance test calls every endpoint the API maps, without a
  session, and expects 401 from all but a named list of open ones.
- **A session whose teammate is gone is no session.** The cookie handler's `OnValidatePrincipal`
  confirms through `IAppDbContext` that the teammate still exists in that team, and rejects the
  principal otherwise, so a teammate who has left gets 401 everywhere.
- **Team scope is a MediatR behaviour.** `TeamScopeBehaviour` refuses an `ITeamScopedRequest`
  whose `TeamId` is not the current teammate's with 404 and the code `team_not_found`, before its
  handler runs: a team that exists and one that does not answer alike. Routes about a teammate's
  own pin end in `/me` and carry no teammate id.
- **Session requests that change state carry an antiforgery token.** ASP.NET Core's antiforgery,
  in the double-submit form the platform documents for a single-page app: a request token is
  issued in the script-readable cookie `__Host-mondino-xsrf` (`Secure`, `SameSite=Strict`) when a
  session is issued and on every answer to a session's `GET`, and the browser returns it in the
  `X-XSRF-TOKEN` header of every `POST`, `PUT`, `PATCH` and `DELETE` (`@mondino/api`'s request
  helper). `AntiforgeryFilter` validates it on every such request to an endpoint that needs a
  session, and refuses with 403 and the code `cross_site_request`. The open requests keep
  `[SameSiteOnly]` (ADR 0008). The token is bound to the session's claims, so another teammate's
  token does not pass.
- **Security headers on every answer.** `SecurityHeadersMiddleware` runs first and adds
  `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`
  and `Strict-Transport-Security: max-age=31536000; includeSubDomains` to every response, the
  app's files and every refusal included. The policy is
  `default-src 'self'; script-src 'self' 'nonce-…'; style-src 'self' 'nonce-…'; font-src 'self';
  img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';
  frame-ancestors 'none'`, with a new random nonce (128 bits) for each response.
- **The nonce reaches Angular through `index.html`.** The app's root is
  `<mo-root ngCspNonce="MONDINO_CSP_NONCE">`; the Angular build copies the placeholder onto the
  inlined critical stylesheet, its script and the module scripts, and Angular gives it to the
  styles it adds at run time. The API serves `index.html` itself (`AppShell`), for `/`,
  `/index.html` and every address that is not a file, with the placeholder replaced by the
  response's nonce and `Cache-Control: no-cache`; the hashed files are served as they are.
  The e2e harness's server (`e2e/support/serve.mjs`) does the same, so every behaviour spec runs
  under the policy and a violation fails it.
- **The client address is the one App Service's front end saw.** The rate limits are counted
  per `HttpContext.Connection.RemoteIpAddress`. With `ASPNETCORE_FORWARDEDHEADERS_ENABLED=true`
  ASP.NET Core takes it from the last entry of `X-Forwarded-For`, the one the front end added
  (`ForwardLimit` 1), so a client cannot choose its own.

| Setting | Meaning | Default |
|---|---|---|
| `ASPNETCORE_FORWARDEDHEADERS_ENABLED` | `true` behind App Service (or any proxy that sets `X-Forwarded-For` and `X-Forwarded-Proto`): the rate limits count the client, not the proxy, and the request is known to be HTTPS. | unset: the address of the connection itself |

## Consequences

- A screen that changes something with a session sends `X-XSRF-TOKEN`; the request helper adds
  it, so a new client needs nothing more.
- Every request with a session costs one indexed read to confirm the teammate still exists.
- A new open endpoint must be marked `[AllowAnonymous]`, given a rate limit, and added to the
  open list of the acceptance test, or it answers 401.
- `index.html` is never cached; the hashed files may be.
- No `'unsafe-inline'` is needed. A style attribute written in a template would be refused,
  which `AGENTS.md` already forbids.
