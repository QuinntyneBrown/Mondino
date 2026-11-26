# Protect team data

## Overview

Mondino shows a team as pins on a globe. A teammate joins through the team's invite link with
a name, a country and a postal code, and the pin is placed at the postal code's city. This
feature covers how Mondino keeps that data to the people it belongs to. A teammate sees only
the team they are in and changes only their own pin. A postal code is returned only to the
teammate it belongs to. Every value a person types is validated by the backend and rendered as
text. The three things open to anyone who holds an invite link are rate limited.

The backend decides what is allowed. What the browser shows or hides is a convenience and
never the rule.

The terms used below:

- **session** — proof, held in a cookie, that a browser belongs to one teammate of one team
- **current teammate** — teammate a request's session belongs to
- **team scope** — rule that a request naming a team is served only when the current teammate is in that team
- **open endpoint** — endpoint that needs an invite link's token and no session

This design does not cover how a team is made or how a teammate signs in again on another
device; both are `<TO SUPPLY>`.

## Description

The rules are enforced in the `Mondino API`. Controllers check nothing and send one MediatR
request; each rule sits in the request pipeline in front of them or in the MediatR pipeline
behind them.

**The session (L2-043).**

- **`TeammateSessionHandler`** — authentication handler in `Mondino.Infrastructure`. A
  successful `JoinTeamCommand` calls `SignInAsync`, which issues a cookie that is `HttpOnly`,
  `Secure` and `SameSite=Lax`. The cookie's protected payload names the teammate id and the
  team id and nothing else. On each request the handler reads the cookie and confirms through
  `IAppDbContext` that the teammate still exists in that team. A teammate who has left no
  longer exists, so an old session is refused with 401. The session's lifetime is `<TO SUPPLY>`.
- **`ICurrentTeammate`** — interface in `Mondino.Application` with `TeammateId`, `TeamId` and
  `IsAuthenticated`. **`CurrentTeammate`** in `Mondino.Infrastructure` implements it from the
  authenticated principal. Handlers read the current teammate from it and never from a
  request's body.
- **Fallback policy.** The API's fallback authorisation policy requires an authenticated
  teammate. `InvitesController` is the only controller marked `[AllowAnonymous]`, and each of
  its actions names a rate limit policy. The health endpoints are marked the same way
  (`observe-without-exposing`). No endpoint is open by omission (L2-045).
- **Cross-site request forgery.** State-changing requests under `/api/teams/` require an
  antiforgery token: the API issues it in a script-readable cookie, and Angular's `HttpClient`
  returns it in a request header. The three open endpoints carry no session. How the join
  request, which changes state before a session exists, is protected is `<TO SUPPLY>`.

**Team scope (L2-043, L2-007).**

- **`ITeamScopedRequest`** — interface in `Mondino.Application` with `Guid TeamId`.
  `GetPinsQuery`, `GetMomentsQuery`, `GetProfileQuery`, `LookUpOwnPostalCodeQuery`,
  `UpdateProfileCommand` and `LeaveTeamCommand` implement it.
- **`TeamScopeBehaviour`** — MediatR pipeline behaviour. For an `ITeamScopedRequest` it
  compares the request's `TeamId` with `ICurrentTeammate.TeamId`. When they differ, it stops
  the pipeline with `team_not_found`, written as 404. A team that exists and a team that does
  not give the same answer, and the handler is not run.
- **Own pin only.** `ProfileController`'s routes are `/api/teams/{teamId}/me`. They carry no
  teammate id, and `GetProfileQueryHandler`, `LookUpOwnPostalCodeQueryHandler`,
  `UpdateProfileCommandHandler` and `LeaveTeamCommandHandler` act for
  `ICurrentTeammate.TeammateId`. `LookUpOwnPostalCodeQueryHandler` serves
  `POST /api/teams/{teamId}/me/postal-code-lookups`, the lookup a teammate makes when changing
  their location; it needs a session and is under team scope, so it is not one of the open
  endpoints. No route addresses another
  teammate's profile, pin or settings, so such a request is answered 404.
- **Ids and tokens.** `Team.Id` and `Teammate.Id` are version 4 `Guid`s from a cryptographic
  random source, which carry 122 random bits. `Team.InviteToken` is at least 128 bits from
  `RandomNumberGenerator`, encoded for a URL. The token gives access to the three open
  endpoints of its own team only. What issues the token belongs to making a team, which is
  `<TO SUPPLY>`.

**A postal code never reaches another teammate (L2-007).**

- `PinDto` and `MomentDto` have no postal code property, and no part or hash of one. They
  carry the city's name and country, and the city's position, never the postal code's own.
- `ProfileDto` is the only DTO returned to a teammate that carries a postal code, and
  `GetProfileQueryHandler` builds it for the current teammate only.
- `InviteDto` carries bare positions with no names, and `Avatars`: the initials and colour
  of the five teammates who joined most recently, with no name, id or city. Initials and a
  colour are the most a holder of an invite link learns of a teammate (L2-001).
  `PostalCodeResultDto` answers the person who typed the postal code.
- A postal code travels in a request body, never in a URL. In the browser it lives only in the
  form state of `JoinPage` and `ProfilePage`. `SettingsCache` and `TeamMembership` never hold
  one, so none is in local storage, session storage, IndexedDB, a cookie or the address bar.

**Validation and data as text (L2-044).**

- **`ValidationBehaviour`** — MediatR pipeline behaviour. It runs the request's validator and
  stops the pipeline with `validation_failed`, written as 400, before anything is stored.
- **`JoinTeamCommandValidator`** and **`UpdateProfileCommandValidator`** — a name of 1 to 60
  characters (joining only), a country in the supported list and a postal code of at most 12
  characters. `LookUpPostalCodeQueryValidator` and `LookUpOwnPostalCodeQueryValidator` apply
  the same two limits to a lookup. The country's format is checked afterwards by the handler
  through `PostalCodeResolver`, the one application service all four resolve a postal code
  with (`place-pin-from-postal-code`); it uses `PostalCodeFormats`, and the handler refuses
  with `postal_code_not_found` (422), not `validation_failed`.
- **`NameNormaliser`** — service in `Mondino.Application`. It removes control characters and
  trims leading and trailing spaces before validation and storage.
- **Narrow request bodies.** A request body binds to a record that has only the fields a
  person may set: name, country, postal code and settings. A teammate id, a position or a
  colour in the body is ignored.
- **`ProblemDetailsWriter`** — writes each refusal as ProblemDetails with a `code` extension
  and no stack trace. A screen branches on `ApiError.code` and shows its own message.
- **Text, not HTML.** The web app renders a teammate's name, a team's name, a city and a
  moment's title and detail through Angular interpolation. No template binds `innerHTML`, and
  no code calls `bypassSecurityTrust…`.
- **`SecurityHeadersMiddleware`** — adds to each response a Content-Security-Policy that allows
  scripts, styles, fonts, images and connections from the app's own origin only,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` and
  `Strict-Transport-Security`. The host that serves the web app's files shall send the same
  headers; the hosting platform, and how Angular's component styles receive a CSP nonce on it,
  are `<TO SUPPLY>`.
- The browser calls only the `Mondino API`. Fonts and the globe's map data are bundled and
  served from the app's origin.

**Rate limits (L2-045).**

**`RateLimitPolicies`** registers three fixed-window policies with the ASP.NET Core rate
limiter, each partitioned by client address. The rate limiter runs before authentication, the
controller and any outside source.

| Policy | Endpoint | Limit per client |
|--------|----------|------------------|
| `OpenInvite` | `GET /api/invites/{inviteToken}` | 30 a minute |
| `PostalCodeLookup` | `POST /api/invites/{inviteToken}/postal-code-lookups` | 10 a minute |
| `Join` | `POST /api/invites/{inviteToken}/teammates` | 5 a minute |

A refused request is answered 429 with a `Retry-After` header and the code `rate_limited`.
For a lookup or a join request, `JoinPage` shows "That was a lot of tries in a short time. Wait
a moment, then try again." and keeps what was typed. For an open of an invite link, nothing has
been typed yet, and `JoinPage` shows "We couldn’t open this invite link" with "Try again"
(L2-001). `LookUpPostalCodeQueryHandler` finds the team by its invite token before it calls
`PostalCodeResolver`, so the lookup cannot be used without a valid invite link. Behind a proxy,
the client address is read from the forwarded header the hosting platform sets, which is
`<TO SUPPLY>`. `POST /api/teams/{teamId}/me/postal-code-lookups`, which needs a
session, carries a policy of its own from `RateLimitPolicies`; its limit is `<TO SUPPLY>`.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a
level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-007` | `L1-002` | A postal code is returned only to the teammate it belongs to, on their own Join and Profile & Settings screens. Everything another teammate receives carries the city and country only. |
| `L2-043` | `L1-014` | The backend decides what is allowed. Every request except opening an invite link, looking up a postal code while joining and joining must come from a teammate of the team it concerns. What the browser shows or hides is a convenience and never the rule. |
| `L2-044` | `L1-014` | Every value from a browser is validated by the backend whatever the frontend checked. A teammate's name, a team's name, a city and a moment's title and detail are rendered as text, never as HTML, wherever they appear. |
| `L2-045` | `L1-014` | Opening an invite link, looking up a postal code while joining and joining are open to anyone who holds an invite link. Each is marked as open explicitly and is rate limited. |

## Diagrams

### System context

A teammate reads their own team and changes their own pin. A person with an invite link may
open it, look up a postal code and join. Mondino calls the postal code source only for a valid
invite link and within the rate limit.

![C4 system context for protecting team data](diagrams/c4-context.png)

### Containers

The `Mondino web app` sends the session cookie or an invite token. The `Mondino API`
authenticates, scopes, validates and rate limits each request before it reads the
`Mondino database` or calls the postal code source.

![C4 container view for protecting team data](diagrams/c4-container.png)

### Components

A request passes `SecurityHeadersMiddleware`, `RateLimitPolicies` and `TeammateSessionHandler`
before a controller sends one MediatR request. `TeamScopeBehaviour` and `ValidationBehaviour`
run before the handler. A refusal at any step is written by `ProblemDetailsWriter`.

![C4 component view for protecting team data](diagrams/c4-component.png)

### Class structure

`TeammateSessionHandler` populates `CurrentTeammate`, which implements `ICurrentTeammate`.
`TeamScopeBehaviour` compares it with each `ITeamScopedRequest`, `LookUpOwnPostalCodeQuery`
among them. `ValidationBehaviour` runs validators such as `JoinTeamCommandValidator`. `PinDto` has no postal code; `ProfileDto`
carries the owner's.

![Class diagram for protecting team data](diagrams/class-structure.png)

### Behaviour — a request for another team is refused

A teammate of team A requests team B's pins by its id. `TeammateSessionHandler` refuses a
missing or outdated session with 401. For a valid session, `TeamScopeBehaviour` finds that the
team is not the current teammate's and answers 404 with `team_not_found`, the same answer as
for a team that does not exist; `GetPinsQueryHandler` is not run (L2-043). The response
carries the security headers (L2-044).

![Sequence diagram for refusing a request for another team](diagrams/sequence-refuse-another-team.png)

### Behaviour — a rate-limited postal code lookup

A person on the Join screen looks up a postal code. Past 10 lookups in a minute,
`RateLimitPolicies` answers 429 with `Retry-After` before any controller, handler or outside
source is called, and `JoinPage` keeps what was typed (L2-045). Within the limit, the handler
requires a valid invite token, and `PostalCodeResolver` validates the postal code (L2-044) and
sends the outside source a country and postal code only.

![Sequence diagram for a rate-limited postal code lookup](diagrams/sequence-rate-limit-postal-code-lookup.png)
