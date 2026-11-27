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
- **caching decorator** — class that wraps an outside source's client and adds a cache, a timeout and a circuit breaker
- **circuit breaker** — guard that stops calls to a source that keeps failing, for a short interval, before trying again
- **source deadline** — one 6-second limit shared by the outside sources a request asks one after another
- **place** — a country and postal code, or a position, or a country and year
- **city directory** — data set of cities, with their positions and time zones, that the backend holds itself

The postal code source is GeoNames (ADR 0006), the weather source Open-Meteo (ADR 0015), the
holiday source OpenHolidays beside Mondino's own calendar, which also holds Formula 1, local
events and sport (ADR 0019), and the email source Postmark (ADR 0011). The breakers, the older
answers given while a source fails and the source deadline are ADR 0026's.

## Description

**Interfaces and clients.** Each outside source sits behind an interface in
`Mondino.Application`: `IPostalCodeLookup`, `IWeatherSource`, `IHolidayCalendar`,
`IRaceCalendar` and `IEventCalendar`. `Mondino.Infrastructure` holds one HTTP client per
outside source: `GeoNamesPostalCodeLookup`, `OpenMeteoWeatherSource` and
`OpenHolidaysCalendar`; `MondinoCalendar`, which answers `IRaceCalendar`, `IEventCalendar` and
part of `IHolidayCalendar`, is embedded and calls nothing. The `Mondino API` is the only caller;
the browser calls no outside source (L2-050). `ISignInEmailSender`, behind which the email
source sits, follows the same rule: `PostmarkSignInEmailSender` calls it with the timeout and a
`SourceBreaker` and with no cache, since nothing it sends is an answer to keep (`sign-in`).

**Caching decorators.** Dependency injection registers each interface as its decorator, or the
calendar that uses it, which wraps the client. Handlers see the interface only.

- **`CachedWeatherSource`** — decorates `IWeatherSource`. It rounds the position to two
  decimal places and uses the rounded position as the cache key, so two teammates in one city
  share one entry and one call; concurrent reads of the city share the call in flight. An entry
  younger than 15 minutes is fresh and is returned without a call. Otherwise, unless its
  `SourceBreaker` is open, it calls `OpenMeteoWeatherSource` with a 5 s timeout. When there is
  no value (an error, the timeout, or the breaker open), it returns the city's last good
  `Weather` if that was read under 3 hours ago (`ServedFor`), and `null` otherwise. It never
  returns a zero temperature in place of a missing one. A caller whose token is cancelled stops
  waiting; the call goes on for the others.
- **`CachedPostalCodeLookup`** — decorates `IPostalCodeLookup`. The key is the country and the
  normalised `PostalCode`. A postal code's city does not change from hour to hour, so `Found` is
  kept 30 days and `NotFound` 1 day (ADR 0006). When the source fails and no entry exists, the
  handler answers `postal_code_unavailable`, which is distinct from `postal_code_not_found`.
- **`CachedOpenHolidays`** — wraps `OpenHolidaysCalendar` for `HolidayCalendar`, which answers
  `IHolidayCalendar` with Mondino's own holidays and the public ones. A country's year is fresh
  for 24 hours. When the source fails, times out or its breaker is open, it gives the last year
  it read, whatever its age; the year goes only for room. Formula 1, local events and sport come
  from `MondinoCalendar` and never fail, so `MomentFinder` still gives every other kind, and a
  calendar that throws gives nothing without failing the read.

**`SourceBreaker`** — the circuit breaker, one instance per source, held by its decorator
(ADR 0026). It does not throw for a failed source.

- **Timeout.** Each call is cancelled after 5 s, and counts as a failure.
- **Circuit breaker.** After `FailuresToOpen` failures in a row the breaker opens for
  `BreakerOpenFor`, and the decorator answers at once without reaching the source. The values
  are the settings `OutsideSources:FailuresToOpen` (5) and `OutsideSources:BreakerOpenFor`
  (30 s); one success closes the count.
- **No queue.** No call is retried and none is queued. One call per place is in flight at a
  time, shared by every read of that place, and none while the breaker is open, so calls in
  flight are bounded by the distinct places being read, each ending within 5 s.

**`SourceDeadline`** — a request that asks two sources one after another (the postal code
lookup, then the weather at the city found: on Join, Create Team, a teammate's own lookup and
saving a new location) starts one 6 s deadline before the first and passes it to the second,
which waits only what is left. When it runs out the answer has no weather.

Time is read from `TimeProvider`, so tests advance a `FakeTimeProvider` and never sleep. Each
cache is held in memory by its decorator, with a bound on its entries; each instance of the API
holds its own.

**Joining while the postal code lookup is down (L2-049).**

- **`ICityDirectory`** — interface in `Mondino.Application` over the city directory.
  `BundledCityDirectory` in `Mondino.Infrastructure` reads a data set shipped with the API, so
  it is not an outside source and cannot be down while the API answers. The data set is
  `cities.tsv.gz`, embedded in the API (ADR 0006).
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
- The email source is called from an outbox, after `POST /api/sign-in-links` has answered
  (ADR 0011): a mail it does not accept is dropped and the teammate asks again. The answer
  never depends on it, since a refusal only for a known email would say which emails Mondino
  knows. Nothing else depends on the email source.

**What a handler does with a missing answer (L2-049).**

- **`GetPinsQueryHandler`** loads the team's teammates, takes the distinct cities, and asks
  `IWeatherSource` once per city, concurrently. Each `PinDto` carries the city, the position
  and the time zone id from the database. Where the source gave none, `Weather` is `null` and
  `WeatherState` is `Unavailable`; `WeatherState` is `NotShared` where the teammate does not
  share their weather and `Available` otherwise, so the browser can tell the two apart. The
  response succeeds in every case.
- **`GetMomentsQueryHandler`** returns the moments `MomentFinder` finds for each city, from
  every calendar at once; a calendar that fails gives its last cached moments or none, and the
  other kinds are still given.
- **A response waits at most 6 s on outside sources.** The calls for one request to one source
  run concurrently, each within 5 s, and two sources asked one after another share the 6 s
  `SourceDeadline`, so the request completes with what the backend has.
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
  | Team | "Loading team…" |
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
| Holiday source (OpenHolidays) | country and year |
| Mondino's own calendar (races, events, sport) | nothing: it is embedded and calls no one |
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
decorators. Each decorator asks its `SourceBreaker` before a call and calls its client within the
timeout.

![C4 component view for surviving source failure](diagrams/c4-component.png)

### Class structure

`CachedWeatherSource` and `OpenMeteoWeatherSource` both implement `IWeatherSource`, and the
decorator wraps the client; `CachedPostalCodeLookup` wraps `GeoNamesPostalCodeLookup`, and
`CachedOpenHolidays` wraps `OpenHolidaysCalendar` for `HolidayCalendar`. Each decorator, and
`PostmarkSignInEmailSender`, holds a `SourceBreaker`. `PinDto.Weather` is nullable, and
`PinDto.WeatherState` says why.

![Class diagram for surviving source failure](diagrams/class-structure.png)

### Behaviour — read pins while the weather source is failing

`GetPinsQueryHandler` asks for weather once per distinct city (L2-050).
`CachedWeatherSource` returns a fresh entry when it has one. Otherwise it calls Open-Meteo
with a 5 s timeout, or does not call it while its `SourceBreaker` is open. With no
value, the decorator gives the cached weather when it is under 3 hours old, and `null`
otherwise, which the handler marks `Unavailable`. The response succeeds, and each pin shows its local time and status; the panel
and the Team row say the weather is unavailable in its place (L2-049).

![Sequence diagram for reading pins while the weather source is failing](diagrams/sequence-read-pins-weather-failing.png)
