# 0008: The session is a year-long sliding cookie, and the open requests refuse other sites

**Status:** Accepted (journey 4, Join the team; decided for journey 6, Protect team data, too)

## Context

Joining is the first request that issues a session (L2-005, L2-043). L2-043 asks for a cookie
that is `HttpOnly`, `Secure` and `SameSite=Lax` or stricter, and for state-changing requests to
be protected against cross-site request forgery. Two things were left `<TO SUPPLY>` in
`join-team` and `protect-team-data`: how long a session lasts, and how a state-changing request
made before any session exists (joining, making a team, asking for a sign-in link and opening
one) is protected.

A teammate who joined by invite link gave no email, and how they sign in again is not designed
(`docs/mocks/README.md`, open question 1). Their session is the only way back to their team, and
Mondino is left open in a tab all day.

An antiforgery token needs something to bind to and a page that hands it out first; a request
made before a session has neither. The forgery a pre-session request is open to is a forged
join: another site makes a visitor's browser join a team it chose, and so signs the visitor in
as a teammate of that team ("login CSRF").

## Decision

- **The session** is ASP.NET Core's cookie authentication, in `Mondino.Infrastructure`
  (`TeammateSessionHandler`). The cookie is `__Host-mondino-session`: `HttpOnly`, `Secure`,
  `SameSite=Lax`, path `/`, no domain. Its protected payload names the teammate id and the team
  id and nothing else. A 401 is answered for a request without one, never a redirect.
- **It lasts 365 days and slides**: a request made after half of that has passed renews it. A
  teammate who opens Mondino at least every six months stays signed in; one who has left the
  team is refused by `protect-team-data`'s check that the teammate still exists.
- **The open state-changing requests refuse other sites.** Each such action carries
  `[SameSiteOnly]`, which refuses with 403 and the code `cross_site_request` a request whose
  `Sec-Fetch-Site` is `cross-site` or `same-site`, or, where a browser sends no `Sec-Fetch-Site`,
  whose `Origin` is not the API's own. A request with neither header (not from a browser) is let
  through: it carries no visitor's cookie to abuse. The bodies are JSON only, so a plain HTML
  form from another site cannot send one, and no CORS policy is configured, so another site's
  script cannot send one either. These are OWASP's Fetch Metadata and Origin checks.
- The protected payload is encrypted by ASP.NET Core Data Protection. Its key ring is kept in
  the folder `DataProtection:KeysPath` names, so every instance of the API and every restart
  reads the same keys.

| Setting | Meaning | Default |
|---|---|---|
| `DataProtection:KeysPath` | The folder the Data Protection key ring is kept in. Every instance must share it, or a session issued by one is refused by another. | none: ASP.NET Core's default, per machine |

## Consequences

- A lost or cleared cookie leaves a teammate who joined by invite link with no way back until
  that is designed; a year-long lifetime makes that rare, not impossible.
- The state-changing requests under `/api/teams/` that need a session (journey 6) add the
  antiforgery token `protect-team-data` describes; the pre-session ones keep `[SameSiteOnly]`.
- Deploying more than one instance needs `DataProtection:KeysPath` on shared storage.
