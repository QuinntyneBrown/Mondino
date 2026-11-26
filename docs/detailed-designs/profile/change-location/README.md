# Change location

## Overview

Mondino is where a team spread around the world sees each other. Each teammate appears on a 3D
globe as a pin placed at their city, with their local time, their weather and the moments
happening where they live. A teammate gives a country and a postal code when joining; the
backend turns the postal code into a city, a position and a time zone, and the postal code
itself stays private.

Profile & Settings, titled "Your pin", is the screen where a teammate sees and changes what
Mondino holds about them. This feature covers the top of that screen. It shows the viewer's own
pin on a small globe with their city, country, local time and time zone, and the reminder
"Teammates see your city, never your postal code." It also lets a teammate who has moved change
their country and postal code. The new postal code is looked up as it is on Join. On saving, the
pin moves to the new city and takes that city's time zone, weather and moments.

The terms used below:

- **viewer** — teammate looking at the screen, whose own data the screen shows
- **profile** — what the backend returns to a teammate about themselves: their own pin, country, postal code and settings
- **postal code lookup** — request that turns a country and a postal code into a city, without changing anything
- **draft** — copy of the profile that holds the viewer's changes until they are saved
- **found city** — city a postal code lookup answered with, shown before saving

The display settings, the sharing switches and the save bar that share this screen are described
in [Choose display and sharing](../choose-display-and-sharing/README.md). Leaving the team is
described in [Leave team](../leave-team/README.md).

## Description

The feature is a vertical slice from the `ProfilePage` to the `Mondino database`. The code does
not exist yet; each part below is introduced by this design.

### Frontend — `mondino` application

- **`ProfilePage`** — lazy route `/profile`, guarded by `teammateGuard`. It reads the profile
  through `PROFILE_API`, lays out "Your pin" beside the settings from tablet width up and in one
  column on a phone, and passes values to presentation components. It holds no rule of its own.
  While the profile is being read it shows a placeholder for the globe and for each section, and
  announces "Loading your pin and settings…". When the read fails it shows "We couldn't load
  your pin" in place of the screen, with "Try again" and "Back to the globe".
- **`ProfileStore`** — store provided at the `/profile` route, so its state goes when the viewer
  leaves the screen. It holds the saved `Profile`, the draft, the state of the postal code lookup
  and the state of the save as signals. `changeCountry(countryCode)` and
  `changePostalCode(value)` update the draft and clear the found city. `lookUp()` calls
  `ProfileApi.lookUpPostalCode`. `canSave` is false while a changed postal code has no found
  city, so saving is not offered for a postal code that was not found (L2-032). The store aborts
  a pending lookup when a newer one starts and when the route is destroyed.
- **`LookupState`** — feature-local union: `idle`, `finding`, `found` (with a `PostalCodeResult`),
  `notFound`, `unavailable`.
- **The small globe** — `ProfilePage` imports `GlobeView` from `@mondino/globe` dynamically and
  renders `mo-globe` with one pin, the viewer's own, and `interactive` set to `false`. A globe
  that is not interactive does not turn on its own and cannot be dragged (L2-031). While the
  draft holds a found city that is not saved, the globe shows the pin there, marked as new
  ("New · Toronto"); the city and local time beside it stay the saved ones until the save.
  `GlobeScene` is disposed when the page is destroyed.

### Frontend — libraries

- **`ProfileApi` / `PROFILE_API`** (`@mondino/api`) — contract and injection token. This feature
  uses `getProfile(teamId)`, `lookUpPostalCode(teamId, countryCode, postalCode)` and
  `updateProfile(teamId, update)`. `HttpProfileApi` implements it. The postal code travels in
  the request body, never in a URL.
- **`Profile`** — type holding `teamName`, the viewer's own `pin` (a `Pin`), `countryCode`,
  `postalCode` and `settings`. It is the only type in the frontend that carries a postal code
  after joining. `ProfileStore` keeps it in memory only; `SettingsCache` never receives it.
- **`ProfileUpdate`** — feature-local type sent on save: `countryCode`, `postalCode`, `settings`.
- **`ApiError`** — error with a `code`. `ProfileStore` branches on `postal_code_not_found`,
  `postal_code_unavailable` and `rate_limited`; the page shows its own message for each.
- **`PostalCodeField`** (`@mondino/components`) — the country and postal code inputs that Join
  also uses. It shows "Finding 20121…" while the lookup runs, the found city and region when it
  answers, and the alert of L2-004 when it does not. On this screen the found message reads
  "Toronto, Ontario — your pin moves here when you save.", with the weather there, and the alert
  ends "Your pin stays in Milan." It emits the change and the blur; it injects nothing.
- **`localTime` and `formatTime`** (`@mondino/domain`, `time/`) — work out the viewer's local
  time from the pin's time zone id and the injected `CLOCK`, in the clock format the viewer chose.

### Backend — `Mondino.Api`

- **`ProfileController`** — exposes `GET /api/teams/{teamId}/me`, `PUT /api/teams/{teamId}/me`
  and `POST /api/teams/{teamId}/me/postal-code-lookups`. Each action checks nothing itself and
  sends one MediatR request. `TeammateSessionHandler` authenticates the session cookie before
  the action runs; a request with no session is refused with 401. The lookup action carries the
  postal code lookup policy from `RateLimitPolicies`.

### Backend — `Mondino.Application`

- **`GetProfileQuery` / `GetProfileQueryHandler`** — loads the teammate that `ICurrentTeammate`
  names and returns a `ProfileDto`. A `teamId` that is not the teammate's own team is refused
  with 404, the same answer as for a team that does not exist.
- **`LookUpPostalCodeQuery` / `LookUpPostalCodeQueryHandler`** — the same query the Join screen
  sends. `PostalCodeFormats` checks the postal code against the country's format and normalises
  it; a postal code in the wrong form is refused without a call to the `Postal code source`.
  `IPostalCodeLookup` resolves the normalised postal code to a `City`, and `IWeatherSource`
  gives the weather there. The handler returns a `PostalCodeResultDto` and changes nothing.
- **`UpdateProfileCommand` / `UpdateProfileCommandHandler`** — carries `TeamId`, `CountryCode`,
  `PostalCode` and `Settings`. The command has no teammate id: the handler changes the teammate
  that `ICurrentTeammate` names, so a request cannot change another teammate's location
  (L2-032). When the country or postal code differs from the stored one, the handler resolves
  the city again through `IPostalCodeLookup` and calls `Teammate.MoveTo(postalCode, city)`. It
  saves in one unit of work through `IAppDbContext` and returns the new `ProfileDto`. A postal
  code that cannot be found or checked is refused and nothing is stored.
- **`UpdateProfileCommandValidator`** — refuses a country outside the supported list and a
  postal code over 12 characters with `validation_failed`.
- **`ProfileDto`** — `TeamName`, the teammate's own `PinDto`, `CountryCode`, `PostalCode` and
  `Settings`. The own `PinDto` always carries the weather, whatever the sharing switches say.
- **`PostalCodeResultDto`** — city name, region and weather, or weather as null when
  `IWeatherSource` fails.

### Backend — `Mondino.Domain`

- **`Teammate`** — `MoveTo(postalCode, city)` replaces the `PostalCode`, the `CountryCode` and
  the `City`. The pin's position is `City.Position`, so a new postal code in the same city
  leaves the pin where it was (L2-032).
- **`City`**, **`Position`**, **`PostalCode`** — value objects. `City` carries the `TimeZoneId`
  from which the browser works out the local time; local time is not stored or sent.

### Backend — `Mondino.Infrastructure`

- **`CachedPostalCodeLookup`** — decorator over `PostalCodeLookupClient` with a cache, a
  5 second timeout and a circuit breaker. `PostalCodeLookupClient` calls the `Postal code
  source`; the provider is `<TO SUPPLY>`. The request carries the country and the postal code
  and nothing about the teammate or the team.
- **`CachedWeatherSource`** — decorator over `OpenMeteoWeatherSource`. It receives the city's
  position only.
- **`AppDbContext`** — EF Core implementation of `IAppDbContext`. The database engine is
  `<TO SUPPLY>`.

### Errors

| Case | Status | `code` | What the screen shows |
|------|--------|--------|-----------------------|
| Postal code in the wrong form, or not known to the source | 422 | `postal_code_not_found` | The alert of L2-004, naming the postal code, the country and the form its postal codes take |
| `Postal code source` does not answer in time | 503 | `postal_code_unavailable` | That the postal code could not be checked right now, with an offer to try again |
| Country unsupported or postal code over 12 characters | 400 | `validation_failed` | A generic message |
| Too many lookups | 429 | `rate_limited` | A request to wait a moment and try again |
| `teamId` is not the teammate's own team | 404 | none | The screen is not shown |

The lookup limit for a teammate, per minute, is `<TO SUPPLY>`; L2-045 sets 10 per minute for
the lookup made while joining.

Other teammates see the move at their next read of `GET /api/teams/{teamId}/pins` and
`GET /api/teams/{teamId}/moments`: `GetPinsQueryHandler` and `GetMomentsQueryHandler` read the
teammate's `City` at that moment, so the new time zone, weather and moments follow without a
further step.

## Requirements

The feature realises the following level-2 (L2) requirements. Each refines the level-1 (L1)
requirement cited beside it.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-031` | `L1-011` | Profile & Settings, "Your pin", shows the viewer's own pin on a small globe, their city and country, their local time and time zone, and the reminder that teammates see the city and never the postal code. |
| `L2-032` | `L1-011` | A teammate who has moved changes their country and postal code. The new postal code is looked up as when joining, and on saving the pin moves to the new city with its time zone, weather and moments. |

## Diagrams

### System context

A teammate changes their location through Mondino. Mondino asks the `Postal code source` for the
city and `Open-Meteo` for the weather there; neither learns who the teammate is.

![C4 system context for changing location](diagrams/c4-context.png)

### Containers

The `Mondino web app` calls only the `Mondino API`. The API alone calls the two outside sources
and stores the teammate's new city in the `Mondino database`.

![C4 container view for changing location](diagrams/c4-container.png)

### Components

`ProfilePage` works through `ProfileStore` and `HttpProfileApi`. In the API, `ProfileController`
sends one request to one of three handlers; the handlers resolve the city through
`IPostalCodeLookup` and move the `Teammate`.

![C4 component view for changing location](diagrams/c4-component.png)

### Class structure

`ProfileStore` holds a `Profile` and a `LookupState` and depends on the `ProfileApi` contract.
On the backend, `UpdateProfileCommandHandler` moves a `Teammate`, which owns its `PostalCode`
and its `City`; the `City` owns the `Position` the pin takes.

![Class diagram for changing location](diagrams/class-structure.png)

### Behaviour — open the profile

`ProfilePage` reads the viewer's own profile. The response is the only one that carries a
postal code, and it carries the viewer's own (L2-031). The page then loads the globe library and
draws one pin on a globe that does not turn and cannot be dragged.

![Sequence diagram for opening the profile](diagrams/sequence-open-profile.png)

### Behaviour — change the postal code

Leaving the postal code field starts a lookup. A found postal code shows its city and offers
saving. A postal code that cannot be found shows the alert of L2-004, and one that cannot be
checked says so; in both cases saving is not offered and the pin stays where it was.

![Sequence diagram for changing the postal code](diagrams/sequence-change-postal-code.png)

### Behaviour — save the new location

Saving sends the country and postal code in the request body. The handler resolves the city
again, so the stored city never depends on what the browser claims, and moves the current
teammate's pin in one unit of work.

![Sequence diagram for saving the new location](diagrams/sequence-save-location.png)
