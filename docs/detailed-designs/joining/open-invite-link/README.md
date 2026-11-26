# Open an invite link

## Overview

Mondino shows a team spread around the world on a 3D globe. Each teammate is a pin at their
city, with their local time and weather. A person becomes a teammate through the team's invite
link.

**invite link** — address of the form `/join/:inviteToken` that opens the Join screen for one team

**invite token** — random value in an invite link that identifies its team and gives no access beyond joining that team

**bare pin** — pin drawn on the Join screen's globe from a position alone, with no name, city, local time or weather

This feature covers the first step of joining: opening the link. The Join screen shows the
heading "Put yourself on the map.", the team's name, how many teammates are already on the
globe ("Joining Northwind · 11 already here"), the initials of up to five of them, and the globe
with their bare pins. It shows all of this before the person has given anything. An invite link that does not exist or has been withdrawn shows a
message and nothing about any team. A person who is already a teammate of the team on this
device is taken to the Globe screen instead, and no second pin is made.

The person opening the link has no session, so the endpoint behind this feature is one of the
three that are open to anyone who holds an invite link. It answers with the least a stranger to
the team may learn: a name, a count, positions and up to five teammates' initials.

The features `place-pin-from-postal-code` and `join-team` cover the rest of the Join screen.
How a team and its invite link are made, and how an invite link is withdrawn, are not designed:
`<TO SUPPLY>`.

## Description

The feature is a vertical slice from the Join screen to the database. It calls no outside
source.

**Frontend (`mondino` application, `@mondino/api`, `@mondino/components`, `@mondino/globe`)**

- **`JoinPage`** — page at the lazy route `/join/:inviteToken`. It reads the invite token from
  the route, provides `JoinStore`, and renders one of five states: loading, ready, invite link
  cannot be used, could not be opened, and wait and try again. On the state `AlreadyJoined` it
  navigates to `/globe`.
  - Loading shows the heading, skeletons for the team and the form, and a globe placeholder,
    and announces "Opening your invite link…" in a `role="status"` element.
  - `NotFound` shows "This invite link can’t be used" and no form. `Failed` shows "We couldn’t
    open this invite link", says the link may be fine, and offers "Try again", which calls
    `JoinStore.open(inviteToken)` again. Both show the globe with no pins.
  - Ready shows the team's name and the count as text, never as HTML, in the `join__team`
    line, with the avatars beside it. The avatars are decorative and hidden from assistive
    technology.
- **`JoinStore`** — service provided at the `JoinPage` route, so its state goes when the person
  leaves the screen. It holds the `invite` signal and the `inviteState` signal. Its
  `open(inviteToken)` method calls `InviteApi.getInvite` and maps an `ApiError` to a state by
  its `code`. It aborts the pending request when it is destroyed.
- **`InviteState`** — feature-local union of `Loading`, `Ready`, `AlreadyJoined`, `NotFound`,
  `RateLimited` and `Failed`.
- **`InviteApi` / `INVITE_API`, `HttpInviteApi`** — contract, injection token and HTTP client.
  `getInvite(inviteToken)` sends `GET /api/invites/{inviteToken}` and returns an `Invite`. The
  Join route binds the token, so the client stays out of the initial bundle.
- **`Invite`** — `teamName`, `teammateCount`, `positions`, `avatars`, `alreadyJoined` and
  `countries`. The `countries` list serves the Join form and is described in
  `place-pin-from-postal-code`.
- **`InviteAvatar`** — `initials` and `colour` of one teammate, drawn by the design system's
  avatar.
- **`GlobeView`** (`mo-globe`) — imported dynamically inside a `@defer` block. `JoinPage` passes
  it the bare pins and sets it not interactive. The globe's renderer is `<TO SUPPLY>`.

**Backend**

- **`InvitesController`** — `GET /api/invites/{inviteToken}`. The action is marked as open to
  anyone and carries the invite policy of `RateLimitPolicies`: 30 opens a minute for one client,
  then 429 with `Retry-After` and the code `rate_limited` (L2-045). The controller checks
  nothing itself and sends one `GetInviteQuery`.
- **`GetInviteQuery`** — carries the `InviteToken`.
- **`GetInviteQueryHandler`** — loads the `Team` whose `InviteToken` equals the token, through
  `IAppDbContext`. When no team matches, it refuses with `invite_not_found`. A withdrawn invite
  link receives the same refusal as one that was never issued. When `ICurrentTeammate` reports a
  session on this team, the handler returns an `InviteDto` with `AlreadyJoined` set and no
  positions or avatars. Otherwise it builds the full `InviteDto`.
- **`InviteDto`** — `TeamName`, `TeammateCount`, `Positions`, `Avatars`, `AlreadyJoined` and
  `Countries`. `Positions` holds one `Position` for each teammate: the position of the
  teammate's `City`. `Avatars` holds the initials and colour of at most five teammates, in no
  order that matches `Positions`; which five is `<TO SUPPLY>`. The DTO carries no teammate id,
  full name, city name, time zone or weather, and never a postal code.
  `Avatars`, `AlreadyJoined` and `Countries` are additions this subsystem makes to the shared `InviteDto`.
- **`ICurrentTeammate`** — the teammate the session cookie belongs to, or none. The session
  cookie is issued by `join-team`.
- **`ProblemDetailsWriter`** — writes each refusal as ProblemDetails with a `code` extension:
  404 with `invite_not_found`, 429 with `rate_limited`.
- **`MondinoTelemetry`** — records the route as its template, `/api/invites/{inviteToken}`, so
  no log, metric or span carries an invite token.

**Rules the slice applies**

- The response for an unknown invite token carries no team name, no count, no positions and
  no avatars.
- `JoinPage` branches on the `code` of an `ApiError` and shows its own message.
- The invite token appears in the address of the Join screen and in the API route only. The
  response header `Referrer-Policy: no-referrer` from `SecurityHeadersMiddleware` keeps it from
  reaching another site.

## Requirements

The feature realises the following level-2 (L2) requirement, which refines the level-1 (L1)
requirement cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-001` | `L1-001` | An invite link opens the Join screen for its team. The screen shows the team's name, how many teammates are already on the globe, and the globe with their pins, before the person has given anything. |

## Diagrams

### System context

A person with an invite link opens it in Mondino and sees the Join screen. A teammate who opens
the same link on a device that already holds their session is taken to the Globe screen. No
outside source takes part.

![C4 system context for opening an invite link](diagrams/c4-context.png)

### Containers

The Mondino web app asks the Mondino API for the invite by its token. The Mondino API reads the
team from the Mondino database.

![C4 container view for opening an invite link](diagrams/c4-container.png)

### Components

In the Mondino web app, `JoinPage` opens the invite through `JoinStore` and `HttpInviteApi`, and
passes the bare pins to `GlobeView`. In the Mondino API, `InvitesController` sends
`GetInviteQuery` to `GetInviteQueryHandler`, which reads the `Team` and asks `ICurrentTeammate`
whether the session is already on that team.

![C4 component view for opening an invite link](diagrams/c4-component.png)

### Class structure

`JoinStore` depends on the `InviteApi` contract, which `HttpInviteApi` implements.
`GetInviteQueryHandler` handles `GetInviteQuery`, loads a `Team` with its `Teammate` cities, and
builds an `InviteDto` whose positions are bare `Position` values.

![Class diagram for opening an invite link](diagrams/class-structure.png)

### Behaviour — open a valid invite link

The handler finds the team by its invite token. When the session already belongs to a teammate
of that team, the response says so and `JoinPage` navigates to `/globe`. Otherwise the response
carries the team's name, the count, one bare position for each teammate and up to five
avatars, and `JoinPage` shows the Join screen with the globe (`L2-001`).

![Sequence diagram for opening a valid invite link](diagrams/sequence-open-valid-invite-link.png)

### Behaviour — open an invalid invite link

An invite token that matches no team is refused with 404 and the code `invite_not_found`, and
`JoinPage` says the invite link cannot be used, with no team name, count or pins (`L2-001`). A
client over the limit of 30 opens a minute is refused with 429 before the handler runs. A
request that gets no answer sets `Failed`, and `JoinPage` offers "Try again" (`L2-001`).

![Sequence diagram for opening an invalid invite link](diagrams/sequence-open-invalid-invite-link.png)
