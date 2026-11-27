# Choose display and sharing

## Overview

Mondino is where a team spread around the world sees each other. Each teammate appears on a 3D
globe as a pin with their local time, their weather and their status, which follows from their
local hour: "Working hours", "Early morning", "Evening" or "Probably asleep".

Profile & Settings, titled "Your pin", is the screen where a teammate decides how Mondino looks
to them and what teammates see of them. This feature covers four things on that screen:

- **Display.** Under "Display", the viewer chooses °C or °F ("Temperature") and a 24-hour or
  12-hour clock ("Clock"). The choice belongs to the teammate, is stored by the backend, and
  applies on every screen.
- **Sharing.** Under "What teammates see", two switches, both on to begin with: "Share my
  local weather" and "Share whether I’m working or asleep". With the second off, teammates see
  no status for the viewer at any hour, and no working-hours overlap with them. The backend
  applies both, so what a teammate switched off never reaches another teammate's browser as
  something to hide.
- **Saving.** Nothing on the screen is applied until it is saved. A bar says when there are
  unsaved changes, confirms a save, and reports a save that failed.
- **Leaving with unsaved changes.** A viewer who tries to leave the screen with unsaved changes
  is asked whether to leave without saving.

The terms used below:

- **viewer** — teammate looking at a screen
- **settings** — a teammate's temperature unit, clock format, chosen kinds of moment and two sharing switches
- **draft** — copy of the profile that holds the viewer's changes until they are saved
- **unsaved change** — difference between the draft and what the backend last confirmed
- **save bar** — bar at the foot of Profile & Settings that reports unsaved changes and the result of a save

The same screen also holds the choice of which kinds of moment show on the globe (L2-022). That
choice is part of the same settings and is saved by the same bar; what it does on the globe is
described with the moments designs. Changing the location is described in
[Change location](../change-location/README.md), and leaving the team in
[Leave team](../leave-team/README.md).

## Description

The feature is a vertical slice from `ProfilePage` to the `Mondino database`. Journey 22 built
the screen with its pin and its Location section, `ProfileStore`, `PROFILE_API`, `SaveBar` with
its first two states and `PUT /api/teams/{teamId}/me` for the location; journey 20 built
`SETTINGS_STORE` and `SettingsCache` for the kinds (ADR 0020); journeys 11 to 17 built
`statusFor`, `Teammate.SharesStatus`, `Teammate.SharesWeather` and the read of the pins that
applies them. This feature adds the settings to each and the parts below. How the settings are
kept is [ADR 0023](../../../adr/0023-settings-kept-by-the-backend.md).

### Frontend — `mondino` application

- **`ProfilePage`** — lazy route `/profile`, now with its own routes file (`profile.routes.ts`)
  so its guard is in its chunk. Beside Location it draws Display, Moments on the globe and What
  teammates see, as `pages/profile/default` draws them. It binds the draft's unit and clock to two
  `Segmented` controls in `radio` mode, each in a `fieldset.setting-row` with its legend, and the
  four kinds and two sharing switches to `Switch` rows; it binds `ProfileStore.barState` to
  `SaveBar`. A change is an output from a presentation component that the page passes to
  `ProfileStore`. Each sharing switch carries a line under its label (`switch-row__hint`) that
  says what its state means for teammates; the table below gives the lines. While both sharing
  switches are off in the draft, a note under them (`panel__note`) reads "Teammates will see only
  your name, city and local time." While either is off in the saved profile, the card of the
  viewer's own pin adds the note "You still see your own weather and status. Teammates don’t."
  (L2-034). The pin card's local time is in the saved clock.

  | Switch | Line when on | Line when off |
  |--------|--------------|---------------|
  | "Share my local weather" | "Shown on your pin and in your panel." | "Teammates see your local time and no weather." |
  | "Share whether I’m working or asleep" | "Worked out from your local time — 09:00 to 18:00 counts as working." | "Teammates see no status for you, at any hour." |

  The kinds' switches are "Public holidays", "Formula 1 race weekends", "Local events and
  festivals" and "Big sporting days", each with its kind's `Emblem` (`plain` while off).
- **`ProfileStore`** — store provided at the `/profile` route. It holds the saved `Profile` and
  the draft as signals: the country and postal code (journey 22) and now `settings`.
  `locationChanged` is true for a new location whose postal code was found (L2-032), and
  `settingsChanged` compares the draft's settings with the saved ones field by field, so a
  setting changed back to what was saved removes the bar (L2-035). `hasUnsavedChanges` is
  either; it is what journey 22 called `canSave`. `save()` sends `ProfileApi.updateProfile` the
  parts that changed and moves `saveState` through `SaveState`. On success it replaces the saved
  profile and the draft with the response and calls `SETTINGS_STORE.replace` with its settings;
  a read of the profile does the same, as the backend's copy is the one that holds. On failure it
  keeps the draft as it is. The 4 second dismissal of the confirmation is one timer, cleared when
  the store is destroyed; unit tests advance a fake clock. `barState` gives `SaveBar` its state.
- **`SaveState`** — feature-local union: `idle`, `saving`, `saved`, `failed`.
- **`unsavedChangesGuard`** — `CanDeactivateFn<ProfilePage>` on the `/profile` route. It asks
  `ProfilePage.canLeave()`, which, while `hasUnsavedChanges` is true, opens
  `DiscardChangesDialog` and lets the navigation continue only on "Discard and leave" (L2-035).
  It is asked on every way out of the screen inside the app: a tab in the header, the wordmark,
  and the browser's back button.
- **`DiscardChangesDialog`** — CDK Dialog with `role="alertdialog"`, titled "Leave without
  saving?". It reads "You changed your settings but haven’t saved them. If you leave now,
  those changes are lost and your pin stays as it was." and offers "Discard and leave" and
  "Keep editing". Focus starts on "Keep editing". Escape and "Keep editing" close it and
  return focus to where it was. It and the CDK Dialog are imported when it first opens, through
  the re-exports the invite dialog uses (`dialog-layers`).
- **Closing the tab** — while `hasUnsavedChanges` is true, `ProfilePage` holds a `beforeunload`
  listener so the browser asks before a reload or a closed tab, with its own confirmation. The
  listener is removed when the changes are saved or undone and when the page is destroyed.

### Frontend — libraries

- **`Segmented`** (`@mondino/components`, `mo-segmented`) — a set of options of which one is
  chosen, used for the Team filter and for "°C / °F" and "24-hour / 12-hour". It takes a `mode`
  (`tabs` or `radio`); here the mode is `radio`, so it is a `radiogroup` named "Temperature" or
  "Clock"; each option is a `radio`, and the chosen one is exposed through `aria-checked` and
  carries a tick (`segmented__check`) besides its fill (L2-033). Left and Right move and choose
  in both modes.
- **`Switch`** (`@mondino/components`, `mo-switch`, block `switch-row`) — a button with
  `role="switch"` and `aria-checked`, operated by Space and Enter, at least 44 px tall (L2-034).
  It projects an optional leading emblem, takes its `label` and an optional `hint`, and shows
  "On" or "Off" beside the track, hidden from assistive technology.
- **`SaveBar`** (`@mondino/components`) — takes a `state` input and emits `save` and `retry`.
  The page renders it only when the state is not `hidden`. Its text sits in a live region
  (`role="status"`) so "Saved — your pin is up to date" is announced; in `failed` it is an alert
  (`role="alert"`). Its states are in the table below.
- **`Settings`**, **`TemperatureUnit`**, **`ClockFormat`** (`@mondino/api`) — the types the
  draft holds. `Profile.settings` carries them; `ProfileUpdate` has an optional location part
  (`countryCode` and `postalCode`) and an optional `settings`.
- **`SettingsStore`** (`@mondino/api`, token `SETTINGS_STORE`) — the viewer's `momentKinds`,
  `temperatureUnit` and `clockFormat` as signals, and `replace(settings)`. The unit and the clock
  are null until a profile has been read or saved in this browser, and the screens then take
  the viewer's country's default (`defaultTemperatureUnit`, `defaultClockFormat`). Globe, Team
  and Profile & Settings read them, so a saved choice applies on every screen without a reload
  (L2-033). It is bound by `TeamShell` (ADR 0020), not in `root`: only the teammate screens
  read it.
- **`SettingsCache`** (`@mondino/domain`, `storage/`) — implements `SettingsStore` from the
  browser's storage (`mondino.settings`), keeping the unit, the clock and the kinds for the
  teammate the membership names, so the first screen of a later visit is drawn in the chosen
  unit and clock before anything answers. It never holds a postal code, an email or a switch.
- **`statusFor(pin, time)`** (`@mondino/domain`, `time/`, journey 11) — returns the status to
  show for a pin, or none when `Pin.sharesStatus` is false, at every hour. The pin, the panel,
  the Team row, the day ribbon and every count and filter call it (L2-034).

| `SaveBar` state | When | Text | Action |
|-----------------|------|------|--------|
| `hidden` | The draft equals the saved profile and no confirmation is showing | none | none |
| `unsaved` | `hasUnsavedChanges` is true | "You have unsaved changes" | "Save changes" |
| `saving` | A save is pending | "Saving…" | "Saving", disabled and marked busy |
| `saved` | For 4 seconds after a save succeeds | "Saved — your pin is up to date" | none |
| `failed` | A save failed and the changes are still unsaved; it stays until a save succeeds or the changes are undone | "Couldn’t save. Your changes are still here." | "Try again" |

### Backend — `Mondino.Api`

- **`ProfileController`** — `PUT /api/teams/{teamId}/me` sends one `UpdateProfileCommand`,
  from a `ProfileUpdateRequest` with an optional `CountryCode` and `PostalCode` and an optional
  `Settings`. `TeammateSessionHandler` authenticates the session cookie, and the request
  carries an anti-forgery token as every state-changing request does (ADR 0010).
- **`TeamsController`** — `GET /api/teams/{teamId}/pins` sends one `GetPinsQuery`. This feature
  adds nothing to it; its handler already withholds what a teammate switched off.

### Backend — `Mondino.Application`

- **`UpdateProfileCommand` / `UpdateProfileCommandHandler`** — carries `TeamId`, `CountryCode`,
  `PostalCode` and `Settings`, and no teammate id. The handler loads the teammate that
  `ICurrentTeammate` names, moves the pin when a location is given and differs (see
  [Change location](../change-location/README.md)), calls `Teammate.ChangeSettings(settings)`
  when settings are given, saves through `IAppDbContext` in one unit of work and returns the
  `ProfileDto`.
- **`UpdateProfileCommandValidator`** — refuses a location given in part (a country without a
  postal code, or the reverse) or outside its form, and a kind of moment named twice, with
  `validation_failed`. A word outside the lists does not bind, and is refused with
  `invalid_request`. A field the teammate may not set is ignored.
- **`SettingsDto`** — `TemperatureUnit` (`celsius`, `fahrenheit`), `ClockFormat` (`24-hour`,
  `12-hour`), `MomentKinds` (the web app's words, `holiday` to `sport`), `SharesWeather` and
  `SharesStatus`.
- **`GetPinsQuery` / `GetPinsQueryHandler`** (journeys 10, 11 and 13) — builds one `PinDto`
  per teammate of the viewer's team and applies each teammate's sharing switches for that
  viewer:
  - `SharesWeather` is false and the pin is another teammate's: the `PinDto` carries a null
    `Weather` (no weather and no temperature) and the `WeatherState` `NotShared`, and the
    handler does not ask `IWeatherSource` for it (L2-034).
  - `SharesStatus` is false and the pin is another teammate's: `PinDto.SharesStatus` is false.
    The browser then shows no status for that pin at any hour and no working-hours overlap.
    The time zone still travels, since the local time is still shown.
  - The pin is the viewer's own: the `PinDto` carries the weather and a true flag whatever the
    switches say. Profile & Settings reads the switches from `Profile.settings` and adds the
    note that teammates do not see them (L2-034).
- **`ProfileDto`** — returns the viewer's own `Settings` to the viewer and to no one else.
  Another teammate's `PinDto` carries the effect of the switches, never the switches themselves.

### Backend — `Mondino.Domain`

- **`TeammateSettings`** — value object: `TemperatureUnit`, `ClockFormat`, `MomentKinds`,
  `SharesWeather`, `SharesStatus`. `DefaultsFor(countryCode)` gives a new teammate's
  settings: Fahrenheit for the United States and Celsius elsewhere (L2-019), the 12-hour clock
  for the United States and Canada and the 24-hour clock otherwise (L2-033), all four kinds of
  moment, and both sharing switches on (L2-034). A new `Teammate` takes the defaults of its
  city's country, so joining, making a team and the seed all give them.
- **`Teammate`** — keeps the settings as columns; `Settings` reads them as one
  `TeammateSettings`, and `ChangeSettings(settings)` replaces them whole.

### Errors

| Case | Status | `code` | What the screen shows |
|------|--------|--------|-----------------------|
| A setting outside its allowed values | 400 | `invalid_request` | `SaveBar` in `failed` |
| A kind named twice, or a location given in part | 400 | `validation_failed` | `SaveBar` in `failed` |
| A new location that cannot be found or checked | 422 or 503 | `postal_code_not_found`, `postal_code_unavailable` | `SaveBar` in `failed`; nothing is stored |
| The backend cannot be reached, or answers 5xx | none or 5xx | none | `SaveBar` in `failed`; the draft stays |
| The session has ended | 401 | none | `sessionExpiredInterceptor` forgets the membership and the address shows "You need an invite link" in place (`adapt-to-every-width`); the teammate signs in again through `sign-in`. Until that interceptor is built, the save fails as above |

## Requirements

The feature realises the following level-2 (L2) requirements. Each refines the level-1 (L1)
requirement cited beside it.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-033` | `L1-011` | The viewer chooses °C or °F and a 24-hour or 12-hour clock. The choice belongs to the teammate and applies on every screen. |
| `L2-034` | `L1-011` | Under "What teammates see", two switches, both on to begin with, decide what teammates see of the viewer: "Share my local weather" ("Shown on your pin and in your panel.") and "Share whether I’m working or asleep" ("Worked out from your local time — 09:00 to 18:00 counts as working."). The backend applies both. A teammate's name, city and local time are always seen. |
| `L2-035` | `L1-011` | A change in Profile & Settings is not applied until it is saved. While there are unsaved changes a bar says so and offers "Save changes"; once saved it confirms and then dismisses itself. |

## Diagrams

### System context

A teammate chooses their display and sharing settings in Mondino, and another teammate sees the
effect. When a teammate does not share their weather, Mondino does not ask `Open-Meteo` for it
on another teammate's behalf.

![C4 system context for choosing display and sharing](diagrams/c4-context.png)

### Containers

The `Mondino web app` sends the settings to the `Mondino API`, which stores them in the
`Mondino database` and applies the sharing switches when any teammate reads the pins.

![C4 container view for choosing display and sharing](diagrams/c4-container.png)

### Components

`ProfilePage` drives `ProfileStore`, which saves through `HttpProfileApi` and publishes the
saved settings to `SettingsStore`. In the API, `UpdateProfileCommandHandler` stores the
settings and `GetPinsQueryHandler` reads them to decide what each `PinDto` carries.

![C4 component view for choosing display and sharing](diagrams/c4-component.png)

### Class structure

`ProfileStore` holds the draft `Settings` and a `SaveState`, and `SaveBar` shows one
`SaveBarState`. On the backend, `Teammate` owns one `TeammateSettings`, which
`UpdateProfileCommandHandler` replaces and `GetPinsQueryHandler` reads.

![Class diagram for choosing display and sharing](diagrams/class-structure.png)

### Behaviour — save display and sharing settings

A change shows the save bar. A save that succeeds confirms for 4 seconds and applies the
display settings on every screen. A save that fails keeps the changes on the screen unsaved and
offers to try again (L2-035).

![Sequence diagram for saving display and sharing settings](diagrams/sequence-save-settings.png)

### Behaviour — another teammate reads the pins after sharing is switched off

`GetPinsQueryHandler` applies both switches for the viewer who asks. The response to another
teammate carries no weather, and the `WeatherState` `NotShared`, for a teammate who does not share it, and a false
`SharesStatus` for one who does not share whether they are working or asleep (L2-034).

![Sequence diagram for reading pins after sharing is switched off](diagrams/sequence-read-pins-after-sharing-off.png)

### Behaviour — leave the screen with unsaved changes

`unsavedChangesGuard` stops a navigation away from `/profile` while there are unsaved changes
and asks through `DiscardChangesDialog` (L2-035).

![Sequence diagram for leaving with unsaved changes](diagrams/sequence-leave-with-unsaved-changes.png)
