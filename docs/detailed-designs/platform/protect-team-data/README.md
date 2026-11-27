# Protect team data

## Overview

Mondino shows a team as pins on a globe. A teammate joins through the team's invite link with
a name, a country and a postal code, and the pin is placed at the postal code's city. This
feature covers how Mondino keeps that data to the people it belongs to. A teammate sees only
the team they are in and changes only their own pin. A postal code is returned only to the
teammate it belongs to. Every value a person types is validated by the backend and rendered as
text. What is open to anyone (opening an invite link, looking up a postal code, joining,
asking for a sign-in link and making a team) is marked as open and rate limited. An email is
the teammate's own, as a postal code is, and no screen and no answer says whether Mondino
knows an email.

The backend decides what is allowed. What the browser shows or hides is a convenience and
never the rule.

The terms used below:

- **session** — proof, held in a cookie, that a browser belongs to one teammate of one team
- **current teammate** — teammate a request's session belongs to
- **team scope** — rule that a request naming a team is served only when the current teammate is in that team
- **open endpoint** — endpoint that needs no session: one that needs an invite link's token, or one that anyone may call

How a team is made is in `make-team`, and how a teammate signs in again on another device in
`sign-in`.

## Description

The rules are enforced in the `Mondino API`. Controllers check nothing and send one MediatR
request; each rule sits in the request pipeline in front of them or in the MediatR pipeline
behind them.

**The session (L2-043).**

- **`TeammateSessionHandler`** — authentication handler in `Mondino.Infrastructure`. A
  successful `JoinTeamCommand`, `CreateTeamCommand` or `RedeemSignInLinkCommand` calls
  `SignInAsync`, which issues a cookie that is `HttpOnly`,
  `Secure` and `SameSite=Lax`. The cookie's protected payload names the teammate id and the
  team id and nothing else. On each request the handler reads the cookie and confirms through
  `IAppDbContext` that the teammate still exists in that team (`OnValidatePrincipal`). A
  teammate who has left no longer exists, so an old session is refused with 401. The cookie is `__Host-mondino-session`;
  it lasts 365 days and slides
  ([ADR 0008](../../../adr/0008-session-and-cross-site-requests.md)).
- **`ICurrentTeammate`** — interface in `Mondino.Application` with `TeammateId`, `TeamId` and
  `IsAuthenticated`. **`CurrentTeammate`** in `Mondino.Infrastructure` implements it from the
  authenticated principal. Handlers read the current teammate from it and never from a
  request's body.
- **Fallback policy.** The API's fallback authorisation policy requires an authenticated
  teammate. `InvitesController`, `SignInController` and `TeamCreationController` are the only
  controllers marked `[AllowAnonymous]`, and each of their actions names a rate limit policy.
  The health endpoints, the app's own files (`AppShell`) and the 404 for an unknown `/api`
  address are marked the same way. No endpoint is open by omission (L2-045,
  [ADR 0010](../../../adr/0010-protecting-team-data.md)).
- **Cross-site request forgery.** State-changing requests that need a session require an
  antiforgery token (ADR 0010): the API issues it in the script-readable cookie
  `__Host-mondino-xsrf` when a session is issued and on every answer to a session's `GET`, the
  request helper in `@mondino/api` returns it in the `X-XSRF-TOKEN` header of every `POST`,
  `PUT`, `PATCH` and `DELETE`, and `AntiforgeryFilter` refuses a request without a good one with
  403 and the code `cross_site_request`. The open endpoints carry no session. How the requests that
  change state before a session exists (joining, making a team, asking for a sign-in link and
  opening one) are protected is decided in ADR 0008: each carries `[SameSiteOnly]`, which
  refuses a request from another site by its `Sec-Fetch-Site` or `Origin` with 403 and the code
  `cross_site_request`.

**Team scope (L2-043, L2-007).**

- **`ITeamScopedRequest`** — interface in `Mondino.Application` with `Guid TeamId`.
  `GetPinsQuery`, `GetMomentsQuery`, `GetProfileQuery`, `UpdateProfileCommand`,
  `LeaveTeamCommand` and `ResetInviteLinkCommand` implement it. Any teammate of a team may
  reset its invite link (`invite-teammates`, L2-055): Mondino has no roles, and the team scope
  is the whole rule.
- **`TeamScopeBehaviour`** — MediatR pipeline behaviour. For an `ITeamScopedRequest` it
  compares the request's `TeamId` with `ICurrentTeammate.TeamId`. When they differ, it stops
  the pipeline with `team_not_found`, written as 404. A team that exists and a team that does
  not give the same answer, and the handler is not run.
- **Own pin only.** `ProfileController`'s routes are `/api/teams/{teamId}/me`. They carry no
  teammate id, and `GetProfileQueryHandler`, `UpdateProfileCommandHandler` and
  `LeaveTeamCommandHandler` act on `ICurrentTeammate.TeammateId`. No route addresses another
  teammate's profile, pin or settings, so such a request is answered 404.
- **`GET /api/teams/{teamId}/pins`** (`TeamsController`, `GetPinsQuery`) answers the
  `TeamPinsDto` of "Contracts the features share". Journey 6 builds it with the fields that
  exist so far: each `PinDto` has the teammate id, name, colour, city name, country, position,
  time zone id and `IsViewer`; the weather, the moments and `SharesStatus` join with journeys
  13, 19 and 23. **`GET /api/teams/{teamId}/me`** (`ProfileController`, `GetProfileQuery`)
  answers the `ProfileDto`: the team's name, the teammate's own `PinDto`, country code and
  postal code; its settings join with journeys 22 and 23.
- **Ids and tokens.** `Team.Id` and `Teammate.Id` are version 4 `Guid`s from a cryptographic
  random source, which carry 122 random bits. `Team.InviteToken` is at least 128 bits from
  `RandomNumberGenerator`, encoded for a URL. The token gives access to the open endpoints of
  its own team only. `IInviteTokens` issues it when a team is made (`make-team`) and when its
  link is reset, after which the old token matches no team.

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

**An email never reaches another teammate, and is never confirmed (L2-043, L2-045).**

- `Teammate.Email` is in no DTO but the request bodies that carry it in: `PinDto`,
  `MomentDto`, `ProfileDto`, `InviteDto` and `CreatedTeamDto` have no email property.
  `SignInResultDto` returns the email to the browser that opened the link sent to it.
- `POST /api/sign-in-links` answers 202 with no body for every email in the right form, and
  `RequestSignInLinkCommandHandler` does the same work for each, so neither the answer nor
  its timing says whether the email is on a team. The Sign In screen reads "Check your inbox"
  in every case (`sign-in`, L2-052).
- `POST /api/teams` never refuses because an email is already on a team.
- An email travels in a request body, never in a URL. In the browser it lives in the form
  state of `SignInPage` and `CreateTeamPage` and in the navigation state for
  `InviteNeededPage`; `TeamMembership` and `SettingsCache` never hold one.
- A sign-in token is stored as a hash, is used once and expires after 15 minutes by
  `TimeProvider`. It travels in the fragment of the emailed address and then in a request
  body.

**Validation and data as text (L2-044).**

- **Validators.** A handler first normalises the names, then runs its validator, which stops
  the request with `validation_failed`, written as 400, before anything is stored.
  **`JoinTeamCommandValidator`**, **`CreateTeamCommandValidator`** and
  **`UpdateProfileCommandValidator`** check a name of 1 to 60 characters, a country in the
  supported list and a postal code of at most 12 characters; for a new team also a team name
  of 1 to 60 characters and an email of at most 254 characters in the form of an address.
  `RequestSignInLinkCommandValidator` checks the email the same way. The
  country's format is checked afterwards by the handler through `PostalCodeFormats`, which
  refuses with `postal_code_not_found` (422), not `validation_failed`.
- **`NameNormaliser`** — service in `Mondino.Application`. It removes control characters and
  trims leading and trailing spaces from a teammate's name and a team's name before validation
  and storage.
- **Narrow request bodies.** A request body binds to a record that has only the fields a
  person may set: name, team name, email, country, postal code or city id, and settings. A teammate id, a position or a
  colour in the body is ignored.
- **`RefusalHandler`** and **`ProblemCodes`** — write each refusal (`RefusedException`) as
  ProblemDetails with a `code` extension and no stack trace. A screen branches on `ApiError.code` and shows its own message.
- **Text, not HTML.** The web app renders a teammate's name, a team's name, a city and a
  moment's title and detail, an email on Sign In and on `InviteNeededPage`, and the address on
  `NotFoundPage`, through Angular interpolation. No template binds `innerHTML`, and
  no code calls `bypassSecurityTrust…`.
- **`SecurityHeadersMiddleware`** — adds to each response a Content-Security-Policy that allows
  scripts, styles, fonts, images and connections from the app's own origin only, the inline
  ones by a nonce made for that response, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: no-referrer` and `Strict-Transport-Security`. The API serves the web app's
  files on App Service (ADR 0004), so they carry the same headers; **`AppShell`** serves
  `index.html` with the placeholder `MONDINO_CSP_NONCE` replaced by the nonce, which Angular
  reads from `ngCspNonce` on `mo-root` and gives to its component styles (ADR 0010).
- The browser calls only the `Mondino API`. Fonts and the globe's map data are bundled and
  served from the app's origin.

**Rate limits (L2-045).**

**`RateLimitPolicies`** registers one fixed-window policy for each open endpoint with the
ASP.NET Core rate limiter, each partitioned by client address. The rate limiter runs before
authentication, the controller and any outside source.

| Policy | Endpoint | Limit per client |
|--------|----------|------------------|
| `Invite` | `GET /api/invites/{inviteToken}` | 30 a minute |
| `Lookup` | `POST /api/invites/{inviteToken}/postal-code-lookups`, `POST /api/postal-code-lookups` | 10 a minute |
| `Join` | `POST /api/invites/{inviteToken}/teammates` | 5 a minute |
| `CitySearch` | `POST /api/invites/{inviteToken}/city-searches`, `POST /api/city-searches` | 30 a minute |
| `CreateTeam` | `POST /api/teams` | 5 an hour |
| `SignInLink` | `POST /api/sign-in-links` (journey 7) | 5 in 15 minutes |
| `SignInRedemption` | `POST /api/sign-in-links/redemptions` (journey 7) | 10 a minute |

There is no `GET /api/countries`: the countries come with the invite and are bundled with
Create Team ([ADR 0009](../../../adr/0009-making-a-team.md)).

A refused request is answered 429 with a `Retry-After` header and the code `rate_limited`.
For a lookup or a join request, `JoinPage` shows "Too many tries from this device. You can try
again in 9:42.", counts down from `Retry-After`, disables its button until the countdown ends
and keeps what was typed. For an open of an invite link, nothing has been typed yet, and
`JoinPage` shows "We couldn’t open this invite" with "Try again" (L2-001). Create Team shows
Join's countdown (ADR 0009); what Sign In shows is not drawn yet. Beside the limit per client,
`RequestSignInLinkCommandHandler` sends no further mail once more than 3 sign-in links were
asked for one email in 15 minutes, from any number of clients, and answers as for any other
request, so nobody's inbox can be flooded and nothing is learned about the email. `LookUpPostalCodeQueryHandler` finds the team by its invite token before it calls
`IPostalCodeLookup`, so the lookup cannot be used without a valid invite link. Behind App Service's
front end, the client address is the last entry of `X-Forwarded-For`, read when
`ASPNETCORE_FORWARDEDHEADERS_ENABLED` is `true` (ADR 0010). The limit on
`POST /api/teams/{teamId}/me/postal-code-lookups`, which needs a session, is decided with
journey 22.

**Someone on no team (L2-043).** `teammateGuard`, a `CanMatchFn` in the app, lets `/globe`,
`/team`, `/moments` and `/profile` match their screens only when `TeamMembership` holds a team.
Otherwise the same address matches `InviteNeededPage` in place
(`pages/invite-needed/default`): "You need an invite link", with "Start a team" and "Use a
different email". With no email known, its text reads "Mondino teams are invite-only, and you
aren’t on one yet." The email a sign-in link was sent to joins it with journey 7.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a
level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-007` | `L1-002` | A postal code is returned only to the teammate it belongs to, on their own Join and Profile & Settings screens. Everything another teammate receives carries the city and country only. |
| `L2-043` | `L1-014` | The backend decides what is allowed. Every request must come from a teammate of the team it concerns, except those that are open to anyone (L2-045): opening an invite link, looking up a postal code or finding a city while joining or making a team, joining, making a team, asking for a sign-in link and opening one. What the browser shows or hides is a convenience and never the rule. Mondino has no roles: the teammate who made a team is a teammate like any other. |
| `L2-044` | `L1-014` | Every value from a browser is validated by the backend whatever the frontend checked. A teammate's name, a team's name, an email, a city, a moment's title and detail, what is typed in a search and the address of a page that is not there are rendered as text, never as HTML, wherever they appear. |
| `L2-045` | `L1-014` | Opening an invite link, looking up a postal code or finding a city while joining, and joining are open to anyone who holds an invite link. Sign In (asking for a sign-in link and opening one) and Create Team (its postal code lookup and making the team) are open to anyone at all. Each is marked as open explicitly and is rate limited. |

## Diagrams

### System context

A teammate reads their own team and changes their own pin. A person with an invite link may
open it, look up a postal code and join, and anyone may ask for a sign-in link or make a team. Mondino calls the postal code source only for a valid
invite link and within the rate limit.

![C4 system context for protecting team data](diagrams/c4-context.png)

### Containers

The `Mondino web app` sends the session cookie or an invite token. The `Mondino API`
authenticates, scopes, validates and rate limits each request before it reads the
`Mondino database` or calls the postal code source.

![C4 container view for protecting team data](diagrams/c4-container.png)

### Components

A request passes `SecurityHeadersMiddleware`, `RateLimitPolicies` and `TeammateSessionHandler`
and, for a request that changes something with a session, `AntiforgeryFilter`, before a
controller sends one MediatR request. `TeamScopeBehaviour` runs before the handler, and the
handler runs its validator first. A refusal at any step is written by `RefusalHandler` and
`ProblemCodes`.

![C4 component view for protecting team data](diagrams/c4-component.png)

### Class structure

`TeammateSessionHandler` populates `CurrentTeammate`, which implements `ICurrentTeammate`.
`TeamScopeBehaviour` compares it with each `ITeamScopedRequest`. A handler runs its
validator, such as `JoinTeamCommandValidator`, after `NameNormaliser`. `PinDto` has no postal code; `ProfileDto`
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
requires a valid invite token, validates the postal code (L2-044) and sends the outside source
a country and postal code only.

![Sequence diagram for a rate-limited postal code lookup](diagrams/sequence-rate-limit-postal-code-lookup.png)
