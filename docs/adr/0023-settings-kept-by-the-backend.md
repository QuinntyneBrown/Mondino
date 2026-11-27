# 0023: A teammate's settings are kept by the backend, and the browser keeps the display ones to draw the first screen

**Status:** Accepted (journey 23, Choose display and sharing). Extends
[ADR 0020](0020-chosen-kinds-in-the-browser.md), whose `SETTINGS_STORE` and `SettingsCache` it
writes; follows [ADR 0015](0015-weather-source.md), whose unit started from the country.

## Context

Profile & Settings chooses °C or °F and a 24-hour or 12-hour clock (L2-033), the kinds of moment
that mark pins (L2-022) and what teammates see: "Share my local weather" and "Share whether I’m
working or asleep" (L2-034). A choice belongs to the teammate, holds on a later day, and is
applied only once saved (L2-035). Until this journey the unit and the clock were worked out from
the viewer's country in the browser (journeys 11 and 13), the kinds were kept in the browser alone
(ADR 0020), and `Teammate.SharesWeather` and `Teammate.SharesStatus` existed with no way to change
them. `GetPinsQueryHandler` already applies both switches for every other viewer.

## Decision

- **The backend keeps every setting.** `Teammate` holds `TemperatureUnit`, `ClockFormat`,
  `MomentKinds`, `SharesWeather` and `SharesStatus`, read and replaced whole as the value object
  `TeammateSettings` (`Teammate.Settings`, `Teammate.ChangeSettings`). The kinds are one column,
  their names joined in their fixed order. `TeammateSettings.DefaultsFor(countryCode)` gives a new
  teammate's on joining and on making a team: °F in the United States and °C elsewhere (L2-019),
  the 12-hour clock in the United States and Canada and the 24-hour clock elsewhere (L2-033), all
  four kinds (L2-022) and both switches on (L2-034). The migration gives each existing teammate
  the defaults of their city's country.
- **The settings travel to their teammate alone.** `ProfileDto.Settings` (`GET` and `PUT
  /api/teams/{teamId}/me`) carries `temperatureUnit` (`celsius`, `fahrenheit`), `clockFormat`
  (`24-hour`, `12-hour`), `momentKinds` and the two switches. Another teammate receives only their
  effect: no weather and `WeatherState` `NotShared`, and a false `PinDto.SharesStatus`.
- **A save sends what changed, in parts.** `PUT /me` takes the location (`countryCode` and
  `postalCode`) and `settings`, each optional: a part left out is unchanged. The settings part is
  the whole set. A word outside the lists does not bind and is refused with 400 `invalid_request`;
  a kind named twice with 400 `validation_failed`. Both parts are stored in one unit of work, so a
  location that cannot be found stores no setting either.
- **The browser draws in the saved choice through `SETTINGS_STORE`.** The contract gains
  `temperatureUnit` and `clockFormat`, null until a profile has been read or saved in this
  browser (the screens then take the viewer's country's default, as before), and `replace(settings)`.
  `SettingsCache` keeps the unit, the clock and the kinds in `mondino.settings` for the teammate the
  membership names, drops a value it does not know, and keeps no switch, postal code or email.
  Profile & Settings' read and save replace it with the backend's copy, which is the one that holds.
  It stays bound by `TeamShell`, so Globe, Team, Moments and Profile & Settings share one instance
  and a save applies on every screen without a reload.

## Consequences

- A choice holds on a later day in the same browser before anything answers, and on any browser
  once Profile & Settings has read it. On a browser that has never opened Profile & Settings the
  screens use the country's defaults and all four kinds until it is opened.
- The display settings change only the viewer's own screens; the switches change only what the
  backend gives other teammates, so nothing a teammate switched off reaches another browser to
  be hidden there.
- Rejected here: carrying the viewer's settings in `GET /pins`, which every teammate screen
  reads. It would bring them to a new browser sooner, but it puts one teammate's own choices
  into the answer that describes the team, and changes every spec's team fixture. Journey 25
  took it up ([ADR 0025](0025-the-refresh-rides-the-shells-clock.md)): the pins carry the
  asker's own settings alone, each load and refresh replaces `SETTINGS_STORE` with them, and a
  fixture without them leaves the store as it was. Rejected: keeping the switches in the browser, which would let a
  teammate's browser, not the backend, decide what others see.
