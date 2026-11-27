# Survive source failure

## Overview

Mondino depends on outside sources: a postal code source turns a postal code into a city, a
position and a time zone; Open-Meteo gives the weather at a city; a holiday calendar source, a
race calendar source and an event source give the moments where teammates live. Any of them
can be slow or fail. An email source delivers sign-in links (`sign-in`). This feature covers
how the `Mondino API` calls them so that a failure costs only what depends on it: when the
weather is missing, every pin still shows its city and its local time, and when the postal
code lookup is down, a person joining picks their city instead.

The feature also fixes what an outside source learns. A call carries a place and never a
teammate's name, their team or anything that identifies them.

The terms used below:

- **outside source** — service outside Mondino that the backend calls for postal codes, weather or calendars
- **caching decorator** — class that implements an outside source's interface, wraps the real client, and adds a cache, a timeout and a circuit breaker
- **circuit breaker** — guard that stops calls to a source that keeps failing, for a short interval, before trying again
- **place** — a country and postal code, or a position, or a country and year
- **city directory** — data set of cities, with their positions and time zones, that the backend holds itself

The providers of the postal code source, the holiday calendar source, the race calendar source
the event source and the email source are `<TO SUPPLY>`.

## Description

**Interfaces and clients.** Each outside source sits behind an interface in
`Mondino.Application`: `IPostalCodeLookup`, `IWeatherSource`, `IHolidayCalendar`,
`IRaceCalendar` and `IEventCalendar`. `Mondino.Infrastructure` holds one typed HTTP client per
source: `PostalCodeLookupClient`, `OpenMeteoWeatherSource`, `HolidayCalendarClient`,
`RaceCalendarClient` and `EventCalendarClient`. The `Mondino API` is the only caller; the
browser calls no outside source (L2-050). `ISignInEmailSender`, behind which the email source
sits, follows the same rule: `SignInEmailSender` calls it through `SourceResilience`, with the
timeout and the circuit breaker and with no cache, since nothing it sends is an answer to keep
(`sign-in`).

**Caching decorators.** Dependency injection registers each interface as its decorator, which
wraps the client. Handlers see the interface only.

- **`CachedWeatherSource`** — decorates `IWeatherSource`. It rounds the position to two
  decimal places and uses the rounded position as the cache key, so two teammates in one city
  share one entry and one call. An entry younger than 15 minutes is fresh and is returned
  without a call. Otherwise it calls
  `OpenMeteoWeatherSource` through `SourceResilience`. When the call gives no value, it
  returns the cached `Weather` if that is under 3 hours old (`MaxAge`), and `null` otherwise.
  It never returns a zero temperature in place of a missing one.
- **`CachedPostalCodeLookup`** — decorates `IPostalCodeLookup`. The key is the normalised
  `PostalCode`. A postal code's city does not change from hour to hour, so entries are kept
  for a long interval, which is `<TO SUPPLY>`. When the source fails and no entry exists, the
  handler answers `postal_code_unavailable`, which is distinct from `postal_code_not_found`.
- **`CachedMomentCalendars`** — decorates `IHolidayCalendar`, `IRaceCalendar` and
  `IEventCalendar`. Each kind is fetched and cached on its own, keyed by its place (a country
  and year, a year, or a city). When one calendar fails, the decorator returns the last cached
  moments of that kind, and moments of the other kinds are unaffected.

**`SourceResilience`** — one resilience pipeline per source, built with
`Microsoft.Extensions.Resilience`. `ExecuteAsync` runs a call inside it and returns a
`SourceAnswer<T>` with a `SourceOutcome` (`Success`, `Failure`, `Timeout`, `CircuitOpen`) and
the value, if any. It does not throw for a failed source.

- **Timeout.** Each call is cancelled after 5 s.
- **Circuit breaker.** After `FailuresBeforeBreak` failures the circuit opens for
  `BreakDuration`, and calls return `CircuitOpen` at once without reaching the source. Both
  values are `<TO SUPPLY>`.
- **No queue.** The pipeline does not retry and does not queue. Calls to one source run with a
  bounded concurrency, which is `<TO SUPPLY>`.

Time is read from `TimeProvider`, so tests advance a `FakeTimeProvider` and never sleep. The
cache is `IMemoryCache` with a size limit; a cache shared between instances of the API depends
on the hosting platform and is `<TO SUPPLY>`.

**Joining while the postal code lookup is down (L2-049).**

- **`ICityDirectory`** — interface in `Mondino.Application` over the city directory.
  `BundledCityDirectory` in `Mondino.Infrastructure` reads a data set shipped with the API, so
  it is not an outside source and cannot be down while the API answers. The data set is
  `<TO SUPPLY>`.
- When a lookup on Join or Create Team is refused with `postal_code_unavailable`, the screen
  switches the postal code field off and shows "Your city" with "Postal code lookup is down
  right now, so pick your city instead. Your pin goes to its centre."
  (`place-pin-from-postal-code`). What was typed in the postal code field is kept.
- The field searches through `POST /api/invites/{inviteToken}/city-searches` (on Create Team,
  `POST /api/city-searches`), which `SearchCitiesQueryHandler` answers from `ICityDirectory`.
  The browser still calls only the `Mondino API`, and no third party learns where the person
  is.
- Choosing a city places the pin at the city's own position, as a postal code would, with the
  city's time zone. The join then carries the city id in the postal code's place, and
  `JoinTeamCommandHandler` resolves it through `ICityDirectory.Find`, so joining needs no
  outside source at all.
- The lookup is tried again when the screen is next opened. On Profile & Settings, where the
  teammate already has a pin, a lookup that is down keeps the alert "We couldn’t check M5V
  2T6 right now. Your postal code may be fine — nothing is wrong with what you typed. Your
  pin stays in Milan." with "Try again" (`change-location`).
- When the email source does not accept a sign-in link, `POST /api/sign-in-links` answers 503
  with `sign_in_email_unavailable` and Sign In reads "We couldn’t send the link. Mondino
  didn’t answer — try again in a moment." Nothing else depends on the email source.

**What a handler does with a missing answer (L2-049).**

- **`GetPinsQueryHandler`** loads the team's teammates, takes the distinct cities, and asks
  `IWeatherSource` once per city, concurrently. Each `PinDto` carries the city, the position
  and the time zone id from the database. Where the source gave none, `Weather` is `null` and
  `WeatherState` is `Unavailable`; `WeatherState` is `NotShared` where the teammate does not
  share their weather and `Available` otherwise, so the browser can tell the two apart. The
  response succeeds in every case.
- **`GetMomentsQueryHandler`** returns the moments `CachedMomentCalendars` has for each kind.
- **A response waits at most 6 s on outside sources.** The calls for one request run
  concurrently under one deadline of 5 s, so the request completes with what the backend has.
- **The web app shows what it has.** Local time, status, offset and overlap are worked out in
  the browser from the pin's time zone and the clock, so they need no outside source. Where a
  pin's `weatherState` is `Unavailable`, `PinLabel` leaves the weather out, and `TeammatePanel`
  and the Team row say in the weather's place that it is unavailable: in the panel, "Weather
  for Mexico City isn’t available right now. We’ll try again in a few minutes."; above the
  Team list, "Weather is unavailable right now. Local times are still right." `NotShared`
  has its own words (`show-weather`).
- **A first read that is pending shows the screen's loading state.** Until a screen's first
  read answers, the screen shows a placeholder in the shape of its content and announces the
  mock's words once, politely, in a visually hidden `role="status"` element:

  | Screen | Loading state announces |
  |--------|-------------------------|
  | Join | "Opening your invite link…" |
  | Globe | "Loading your team…" |
  | Team | "Loading your team…" |
  | Moments | "Loading moments…" |
  | Profile & Settings | "Loading your pin and settings…" |

  On Join, Globe and Profile & Settings the globe's box holds `GlobePlaceholder` ("The globe
  is loading"); on Team and Moments `main` carries `aria-busy="true"`.
- **A first read that fails shows the screen's error state.** The screen shows the mocks'
  `message-page` (on Join, a notice in the form's place) with "Try again", which reads again,
  and nothing of the team: no stale or partial pins, moments or settings. Team, Moments and
  Profile & Settings also offer "Back to the globe".

  | Screen | Title | Text |
  |--------|-------|------|
  | Join | "We couldn’t open this invite" | "Mondino didn’t answer. Check your connection and try the link again — it hasn’t been used up." |
  | Globe | "The globe didn’t load" | "We couldn’t reach Mondino to fetch your team. Check your connection — nothing you set has been lost." |
  | Team | "The team didn’t load" | "We couldn’t reach Mondino. Check your connection and try again." |
  | Moments | "Moments didn’t load" | "We couldn’t fetch holidays and events for your team. Check your connection and try again." |
  | Profile & Settings | "Your settings didn’t load" | "We couldn’t reach Mondino. Your pin is unchanged — try again in a moment." |

  Sign In and Create Team read nothing before they are shown; a request of theirs that fails
  keeps what was typed and shows its alert with "Try again" (`sign-in`, `make-team`).

  The error state is for a first read only: once a screen has data, a failed refresh keeps it
  and shows the banner below.
- **The backend itself unreachable.** When a refresh fails, `TeamStore` keeps its last pins,
  sets its `refreshFailed` signal and tries again at the next refresh. `TeamShell` shows, above whichever screen is
  open, the banner "Couldn’t refresh. Clocks are live; weather and moments are from 14:50."
  with "Try again", which refreshes at once and reads "Trying…" meanwhile; the clocks keep
  ticking, and the banner goes, without a message, as soon as a refresh succeeds
  (`keep-team-fresh`).

**What an outside source receives (L2-050).**

| Source | Carries |
|--------|---------|
| Postal code source | country and postal code |
| Open-Meteo | the city's position, rounded to two decimal places |
| Holiday calendar source | country and year |
| Race calendar source | year |
| Event source | the city's place; the exact parameters depend on the provider, `<TO SUPPLY>` |
| Email source | the address a sign-in link is sent to, and the link; no name, no team and no city |

Each client's method takes only those values, so a name, a team, a teammate id or a session is
not available to it. The address is the one thing the email source cannot do without; it is
the address the person typed, sent to deliver that person's own link. A city search reaches no
outside source. The clients' `HttpClient`s forward no header from the incoming request:
no cookie, no client address and no forwarded-for header.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a
level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-049` | `L1-016` | The postal code lookup, the weather and the calendars are called only by the backend, each with a timeout, and their answers are cached. When one fails, everything that does not depend on it is still shown. |
| `L2-050` | `L1-016` | A call to an outside source carries a place (a country and postal code, or a position, or a country and year) and never a teammate's name, their team or anything that identifies them. The one exception is the service that sends sign-in links, which has to be given the email address it sends to, and is given nothing more. |

## Diagrams

### System context

Mondino calls five outside sources for postal codes, weather and calendars, and sends each a
place only. The email source, which `sign-in` describes, receives an address and a link. A teammate reads the team
whatever any of them does.

![C4 system context for surviving source failure](diagrams/c4-context.png)

### Containers

The `Mondino API` is the only caller of outside sources, each with a 5 s timeout. The
`Mondino database` holds each pin's city, position and time zone, which need no outside
source once stored.

![C4 container view for surviving source failure](diagrams/c4-container.png)

### Components

`GetPinsQueryHandler` and `GetMomentsQueryHandler` reach the sources through the caching
decorators. Each decorator runs its calls through `SourceResilience`, which calls the typed
clients within the timeout.

![C4 component view for surviving source failure](diagrams/c4-component.png)

### Class structure

`CachedWeatherSource` and `OpenMeteoWeatherSource` both implement `IWeatherSource`, and the
decorator wraps the client; `CachedPostalCodeLookup` and `PostalCodeLookupClient` relate the
same way. Each decorator depends on `SourceResilience`, which returns a `SourceAnswer<T>` with
a `SourceOutcome`. `PinDto.Weather` is nullable, and `PinDto.WeatherState` says why.

![Class diagram for surviving source failure](diagrams/class-structure.png)

### Behaviour — read pins while the weather source is failing

`GetPinsQueryHandler` asks for weather once per distinct city (L2-050).
`CachedWeatherSource` returns a fresh entry when it has one. Otherwise `SourceResilience`
calls Open-Meteo with a 5 s timeout, or does not call it while the circuit is open. With no
value, the decorator gives the cached weather when it is under 3 hours old, and `null`
otherwise, which the handler marks `Unavailable`. The response succeeds, and each pin shows its local time and status; the panel
and the Team row say the weather is unavailable in its place (L2-049).

![Sequence diagram for reading pins while the weather source is failing](diagrams/sequence-read-pins-weather-failing.png)
