# Place a pin from a postal code

## Overview

Mondino shows a team on a 3D globe, each teammate as a pin at their city. A person who has
opened a team's invite link puts themselves on the globe through the Join form. The form has
exactly three fields: "Your name", "Country" and "Postal code". It asks for no street address,
e-mail address or phone number, and the text "Only your city is shown. Your postal code stays
private." sits under the postal code field. Under the form the screen names its sources:
"Weather from Open-Meteo · Holidays from public calendars".

**postal code lookup** — resolution of a country and a postal code to the city that postal code lies in

**city** — municipality a postal code lies in, the level at which Mississauga and Toronto are different places

**form** — pattern a country's postal codes take, such as five digits in Italy

This feature covers the form and the lookup. The postal code is looked up when the person leaves
the field or submits the form. While the lookup runs, the screen shows "Finding 20121…" and the
button reads "Placing your pin…" and is disabled. When the city is found, the screen names the
city and region and the weather there ("Milan, Lombardy — pinned at city level. 13° and foggy
right now."), the globe turns to the city, a pin labelled "You" appears and pulses once (not
under reduced motion), and the button changes from
"Place my pin" to "Join" and the team's name.

A postal code in the wrong form, or one the postal code source does not know, is refused with an
alert that names the postal code and the country and gives the form that country's postal
codes take ("Italian postal codes have five digits, like 20121."). A postal code source
that does not answer in time produces a different message: the postal code could not be checked
right now. Nothing is placed in either case.

The pin takes the city's own position, never the position of the postal code. Two teammates in
Toronto with different postal codes have the same position.

Nothing is stored by this feature. The pin on the Join screen exists in the browser only, until
the feature `join-team` adds the teammate. The feature `open-invite-link` supplies the invite
that this feature builds on.

## Description

The feature is a vertical slice from the Join form to two outside sources: the Postal code
source and Open-Meteo. The browser calls only the Mondino API.

**Frontend (`mondino` application, `@mondino/api`, `@mondino/components`, `@mondino/globe`)**

- **`JoinPage`** — renders the form beside the globe on a tablet and wider, and in one column on
  a phone. It lists `Invite.countries` in the Country field in alphabetical order. It passes the
  found city to `GlobeView` as the selected pin labelled "You". `GlobeView` has no input that
  takes a position, so `JoinPage` adds the found city to `pins` as one more pin with the id
  `you`, beside the bare pins (`bare-0`, `bare-1`, … `open-invite-link`), names it in
  `selectedId` and in `arrivedIds`, so it pulses once (not under reduced motion), and projects
  a label template that draws a label for that pin only ("You · Milan"). The id `you` is local
  to the screen and is never a teammate id. `clearFound()` takes the pin out of `pins` and
  empties `selectedId`. The Join globe is not
  interactive, so it cannot be dragged and does not turn on its own (`globe/turn-globe`); it
  turns only to the found city, the pin `selectedId` names, and holds there. It passes `PostalCodeField` the
  chosen `Country`, the `lookupState`, the `LookupMessage` that `joinLookupMessage` gives for
  it, and `invalid`.
- **`JoinStore`** — route-scoped service. It holds the writable signals `name`, `countryCode`
  and `postalCode`, and the signals `lookupState`, `found`, `nameProblem` and
  `postalCodeMissing`.
  - `lookUp()` sets `Locating`, calls `InviteApi.lookUpPostalCode`, and maps the answer or the
    `ApiError` code to a `LookupState`: `postal_code_not_found` to `NotFound`, `rate_limited`
    to `RateLimited`, and `postal_code_unavailable`, any other code and no answer to
    `Unavailable`; the code `invite_not_found` sets `inviteState` to
    `NotFound` instead, which replaces the form. `JoinPage` calls it when the field emits
    `blurred`, unless the postal code is empty or a lookup for the same country and postal
    code has already answered `Found` or `NotFound`. One lookup runs at a time: a new lookup aborts the
    pending one through its `AbortController`.
  - `clearFound()` runs when the postal code or the country changes. It aborts a pending lookup,
    removes the found city and the new pin, removes any alert, and returns the state to `Idle`,
    so the button reads "Place my pin" again.
  - `nameProblem` reports a name that is empty, only spaces, or longer than 60 characters. A
    submit with a name problem places no pin, marks the name field `aria-invalid` and shows
    "Enter your name, up to 60 characters, so teammates know whose pin this is."
  - `postalCodeMissing` reports an empty postal code. A submit with it makes no lookup;
    `JoinPage` sets the field's `invalid` and gives it the message "Enter your postal code."
  - A submit with either problem makes `JoinPage` show a summary alert above the fields
    ("Two things are missing") that links to each field and takes focus.
  - A submit with no problem and no found city runs `lookUp()` and does not join: the button
    read "Place my pin". The person joins with a second submit, once the city is found
    and the button reads "Join" and the team's name (`join-team`).
- **`LookupState`** — union in `@mondino/api` of `Idle`, `Locating`, `Found` (with its
  `PostalCodeResult`), `NotFound`, `Unavailable` and `RateLimited`. Profile & Settings uses the
  same type.
- **`PostalCodeField`** (`@mondino/components`, `mo-postal-code-field`) — presentation
  component, the same on Join and on Profile & Settings. Its inputs are `value`, `country` (the
  chosen `Country`), `lookupState` (a `LookupState`), `message` (a `LookupMessage` or null) and
  `invalid`, and it emits `valueChange`, `blurred` and `retry`. It injects nothing and holds no
  copy of its own: it renders the `message` it is given, in a polite live region for `Idle`,
  `Locating` and `Found` and in an alert (`role="alert"`) otherwise, linked to the input with
  `aria-describedby`, with a button that emits `retry` when the message has a `retryLabel`.
  `invalid` sets `aria-invalid` on the input; it is true for an empty postal code on submit and
  for `NotFound` only, since nothing is wrong with what was typed when the lookup is
  unavailable or rate limited. The message is rendered as text.
- **`LookupMessage`** — type in `@mondino/api`: what the field shows for a lookup state, the
  `text` and, where the message offers one, the `retryLabel` ("Try again").
- **`joinLookupMessage(lookupState, postalCode, country)`** — pure helper beside `JoinPage`
  that gives this screen's `LookupMessage`:
  - `Idle`: "Only your city is shown. Your postal code stays private." (L2-002), which gives
    way to "Enter your postal code." when the form is submitted with the postal code empty.
  - `Locating`: "Finding 20121…".
  - `Found`: "Milan, Lombardy — pinned at city level. 13° and foggy right now.", made of the
    found city's name and region, the temperature as degrees alone in the unit a new teammate
    of the chosen country starts with (°F for the United States, °C elsewhere, L2-019) and the
    condition's word (L2-018) in lower case. When the result's `weather` is null the message
    ends after "pinned at city level."
  - `NotFound`: "We couldn’t find “2012” in Italy. Italian postal codes have five digits, like
    20121.", made of the postal code, the country's `name` and its `postalCodeHint`, which
    is a whole sentence and is appended as it stands (for Canada, "Canadian postal codes look
    like A1A 1A1.").
  - `Unavailable`: "We couldn’t check 20121 right now. Your postal code may be fine — nothing is
    wrong with what you typed.", with the `retryLabel` "Try again"; `retry` runs `lookUp()`
    again.
  - `RateLimited`: "That was a lot of tries in a short time. Wait a moment, then try again."
- **`InviteApi.lookUpPostalCode(inviteToken, countryCode, postalCode, signal)`** — sends
  `POST /api/invites/{inviteToken}/postal-code-lookups` with the country and postal code in the
  body. A postal code never travels in a URL and is never written to browser storage.
- **`PostalCodeResult`** — the `city` (name, region, country code, position, time zone id) and
  the `weather`, or null.
- **`Country`** — type in `@mondino/api`: `code`, `name` and `postalCodeHint`, one whole
  sentence that gives the form the country's postal codes take ("Italian postal codes have
  five digits, like 20121.", "Canadian postal codes look like A1A 1A1."). The backend's
  `PostalCodeFormats` supplies it. The list arrives on the `Invite` (and, for Profile &
  Settings, on the `Profile`), so the frontend holds no second copy of the formats and
  composes no sentence about a form itself.

**Backend**

- **`InvitesController`** — `POST /api/invites/{inviteToken}/postal-code-lookups`. The action is
  marked as open to an invite link's holder and carries the lookup policy of
  `RateLimitPolicies`: 10 lookups a minute for one client, then 429 with `Retry-After`, before
  any outside source is called (L2-045). It sends one `LookUpPostalCodeQuery`.
- **`LookUpPostalCodeQuery`** — `InviteToken`, `CountryCode`, `PostalCode`.
- **`LookUpPostalCodeQueryValidator`** — refuses a country outside the supported list or a
  postal code over 12 characters with 400 and the code `validation_failed`.
- **`LookUpPostalCodeQueryHandler`** — runs three steps in order.
  1. It confirms a team holds the invite token, and refuses with `invite_not_found` otherwise.
  2. It calls `PostalCodeResolver.ResolveAsync`. `NotFound` is refused with
     `postal_code_not_found`; `Unavailable` is refused with `postal_code_unavailable`.
  3. It calls `IWeatherSource.GetCurrentAsync` with the city's position. A failure there yields
     a null weather, and the lookup still succeeds.
- **`PostalCodeResolver`** — application service in `Mondino.Application`, the one place a
  country and a postal code become a city. Join's lookup, Profile & Settings' lookup
  (`LookUpOwnPostalCodeQueryHandler`), `JoinTeamCommandHandler` and
  `UpdateProfileCommandHandler` all resolve through it, so the four cannot differ.
  `ResolveAsync(countryCode, postalCode, ct)` runs three steps and returns a
  `PostalCodeResolution`: a `PostalCodeLookupStatus`, and the normalised `PostalCode` and the
  `City` when found.
  1. It calls `PostalCodeFormats.TryNormalise`. A postal code that does not fit the country's
     form is `NotFound`, and `IPostalCodeLookup` is not called.
  2. It calls `IPostalCodeLookup.FindCityAsync` and passes on `NotFound` and `Unavailable`.
  3. When found, it gives the `City`, with the city's own position and its IANA `TimeZoneId`.
- **`PostalCodeFormats`** — holds one `PostalCodeFormat` for each supported country. To begin
  with these are thirteen: Australia, Brazil, Canada, Germany, Ghana, India, Ireland, Italy,
  Japan, Mexico, Sweden, United Arab Emirates and United States. `TryNormalise` trims the value, removes spaces and
  hyphens, upper-cases it, tests it against the country's pattern, and returns a `PostalCode` in
  the country's canonical spelling. "l5b3c1" and "L5B 3C1" normalise to the same `PostalCode`.
- **`PostalCodeFormat`** — feature-local type: `CountryCode`, `CountryName`, `Pattern` and
  `Hint`, the whole sentence that gives the country's form. `GetInviteQueryHandler` projects
  the list to `CountryDto` (`Code`, `Name`, `PostalCodeHint`) on the `InviteDto`.
- **`IPostalCodeLookup`** — `FindCityAsync(postalCode, ct)` returns a
  `PostalCodeLookupOutcome`: a `PostalCodeLookupStatus` of `Found`, `NotFound` or `Unavailable`,
  and the `City` when found. The contract fixes two rules. The `City` is the municipality the
  postal code lies in, or the nearest named locality the source gives when the postal code
  belongs to no city. The `City.Position` is the city's own position, the same for every postal
  code in that city, and never the position of the postal code.
- **`CachedPostalCodeLookup`** — decorator over `PostalCodeLookupClient`. It caches `Found` and
  `NotFound` outcomes by normalised postal code, applies the 5 s timeout of L2-049, and opens a
  circuit breaker after repeated failures. It does not cache `Unavailable`. The cache lifetimes
  and the breaker thresholds are `<TO SUPPLY>`.
- **`PostalCodeLookupClient`** — calls the Postal code source and maps its answer to a `City`
  with its IANA `TimeZoneId`. The provider is `<TO SUPPLY>`, and so is the means by which the
  city's own position is obtained from that provider.
- **`CachedWeatherSource`** over **`OpenMeteoWeatherSource`** — current weather at a position,
  with the same 5 s timeout, a cache that keeps the weather for 15 minutes (L2-018) and a
  circuit breaker.
- **`PostalCodeResultDto`** — the city (name, region, country code, position, time zone id) and
  the weather or null. It does not echo the postal code.

**Refusals**

| Case | Status | `code` | The screen says |
|------|--------|--------|-----------------|
| Wrong form, or unknown to the source | 422 | `postal_code_not_found` | The postal code could not be found in the country, then the country's `postalCodeHint` |
| Source timed out or circuit open | 503 | `postal_code_unavailable` | The postal code could not be checked right now and nothing is wrong with what was typed; "Try again" |
| Over 10 lookups a minute | 429 | `rate_limited` | That was a lot of tries in a short time; wait a moment, then try again |
| Unsupported country or over 12 characters | 400 | `validation_failed` | The `Unavailable` message; the form cannot send either (the Country field lists the supported countries, and the input's `maxlength` is 12, as the name's is 60) |
| Unknown invite token | 404 | `invite_not_found` | The invite link cannot be used |

In each case but the last, what the person typed is kept; an unknown invite token replaces the
form with the message.

**What leaves the backend.** The Postal code source receives a country and a postal code.
Open-Meteo receives a position. Neither receives a name, a team or an invite token. No log,
metric or span carries the postal code or the position.

## Requirements

The feature realises the following level-2 (L2) requirements. Each refines the level-1 (L1)
requirement cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-002` | `L1-001` | The Join form has exactly three fields: the teammate's name, a country chosen from the supported countries, and a postal code. It asks for no street address, e-mail address or phone number. |
| `L2-003` | `L1-001` | The postal code is looked up for the chosen country when the teammate leaves the field or submits the form. While it is looked up the screen says so; when it is found the screen names the city and the weather there, places the teammate's pin on the globe, and the button changes from "Place my pin" to "Join" and the team's name. |
| `L2-004` | `L1-001` | A postal code that does not match the country's format, or that the lookup does not know, is refused with a message that names the postal code, the country and the form that country's postal codes take. Nothing is placed. |
| `L2-006` | `L1-002` | A postal code is resolved to its city: the municipality it lies in, the level at which Mississauga and Toronto are different places. The pin takes the city's own position, never the position of the postal code. |

## Diagrams

### System context

A person with an invite link gives Mondino a postal code. Mondino asks the Postal code source
for the city and Open-Meteo for the weather at that city.

![C4 system context for placing a pin from a postal code](diagrams/c4-context.png)

### Containers

The Mondino web app posts the country and postal code to the Mondino API in a request body. The
Mondino API checks the invite token in the Mondino database and is the only container that calls
the two outside sources.

![C4 container view for placing a pin from a postal code](diagrams/c4-container.png)

### Components

`InvitesController` sends `LookUpPostalCodeQuery` to `LookUpPostalCodeQueryHandler`. The handler
resolves the city through `PostalCodeResolver`, which checks the form with `PostalCodeFormats`
and finds the city through `CachedPostalCodeLookup`, and reads the weather through
`CachedWeatherSource`. The Mondino web app is shown as one element;
its parts are listed in the Description.

![C4 component view for placing a pin from a postal code](diagrams/c4-component.png)

### Class structure

`JoinStore` holds a `LookupState` and depends on `InviteApi`. `JoinPage` gives `PostalCodeField`
the `LookupMessage` that `joinLookupMessage` builds. `LookUpPostalCodeQueryHandler` depends on
`PostalCodeResolver` and `IWeatherSource`, and `PostalCodeResolver` on `PostalCodeFormats` and
`IPostalCodeLookup`. Each interface has a client and a caching decorator in
`Mondino.Infrastructure`.

![Class diagram for placing a pin from a postal code](diagrams/class-structure.png)

### Behaviour — look up a postal code that is found

The screen shows "Finding 20121…" while the request runs (`L2-003`). `PostalCodeResolver` normalises the
postal code and finds the city with the city's own position (`L2-006`), and the handler reads
the weather. The
screen then names the city and region, the globe turns to the new pin, and the button reads
"Join Northwind" (`L2-003`).

![Sequence diagram for looking up a postal code that is found](diagrams/sequence-look-up-postal-code-found.png)

### Behaviour — refuse a postal code in the wrong form or not found

`PostalCodeResolver` answers `NotFound` for a postal code that does not fit the country's form
before the Postal code source is called. A postal code in the right form that the source does not know receives the same refusal.
Both show the same alert, and editing the postal code removes it (`L2-004`).

![Sequence diagram for refusing a postal code](diagrams/sequence-refuse-postal-code.png)

### Behaviour — the postal code source does not answer in time

`CachedPostalCodeLookup` reports `Unavailable` when the source exceeds the timeout or the
circuit is open. The Mondino API answers 503 with `postal_code_unavailable`, and the screen
offers to try again without saying the postal code is wrong (`L2-004`).

![Sequence diagram for a postal code source that timed out](diagrams/sequence-postal-code-source-timed-out.png)
