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
- **Sharing.** Under "Privacy", two switches, both on to begin with: "Share my local weather"
  and "Show when I’m outside working hours". The backend applies both, so what a teammate
  switched off never reaches another teammate's browser as something to hide.
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

The feature is a vertical slice from `ProfilePage` to the `Mondino database`, and it reaches
into the read of the team's pins, where the sharing switches take effect. The code does not
exist yet; each part below is introduced by this design.

### Frontend — `mondino` application

- **`ProfilePage`** — lazy route `/profile`. It binds the draft's settings to two `Segmented`
  controls and two `Switch` controls, and binds the save state to `SaveBar`. A change is an
  output from a presentation component that the page passes to `ProfileStore`. Each switch
  carries a line under its label that says what its state means for teammates: "Shown on your
  pin and in your panel." or, off, "Teammates see your local time and no weather."; and "Others
  see “Probably asleep” from 23:00 to 07:00 your time." or, off, "Teammates see no status for
  you outside 09:00 to 18:00." While either
  switch is off in the saved profile, the card of the viewer's own pin adds the note "You still
  see your own weather and status. Teammates don’t." (L2-034). The card's local time is shown
  in the draft's clock format, so a choice of clock shows there before it is saved, as the
  mocks of the save bar draw ("3:05 pm local · Central European Time"); no other display or sharing setting
  shows before it is saved.
- **`ProfileStore`** — store provided at the `/profile` route. It holds the saved `Profile` and
  the draft as signals. `hasUnsavedChanges` is computed by comparing the draft with the saved
  profile field by field, so a setting changed back to what was saved removes the bar (L2-035).
  A new postal code enters the draft only once it is found
  ([Change location](../change-location/README.md)), so one that is not found shows no bar.
  `save()` calls `ProfileApi.updateProfile` and moves `saveState` through `SaveState`. On
  success it replaces the saved profile with the response, writes the settings to
  `SettingsStore` and calls `TeamStore.refresh()`, so the viewer's own pin and the team as
  they now see it are read again for the other screens. On failure, whatever the status or
  `code`, it keeps the draft as it is. The 4 second dismissal of the
  confirmation is one timer, cleared when the store is destroyed; unit tests advance a fake
  clock.
- **`SaveState`** — feature-local union: `idle`, `saving`, `saved`, `failed`.
- **`unsavedChangesGuard`** — `CanDeactivateFn` on the `/profile` route. When
  `hasUnsavedChanges` is true it opens `DiscardChangesDialog` and lets the navigation continue
  only on "Leave without saving" (L2-035).
- **`DiscardChangesDialog`** — CDK Dialog titled "Leave without saving?". It names the settings
  that have unsaved changes and says they are dropped on leaving: "Your changes to temperature
  and clock haven’t been saved. If you leave now, they’re dropped." Each changed setting is
  named by its label on the screen, in lower case and in the screen's order ("location",
  "temperature", "clock", "moments on the globe", "privacy"), joined with commas and "and". It
  offers "Leave without saving" and "Keep editing", and focus starts on "Keep editing". Escape
  and "Keep editing" close it and return focus to where it was.
- **Closing the tab** — while `hasUnsavedChanges` is true, `ProfilePage` holds a `beforeunload`
  listener so the browser asks before a reload or a closed tab. The listener is removed when the
  changes are saved and when the page is destroyed.

### Frontend — libraries

- **`Segmented`** (`@mondino/components`, `mo-segmented`) — a set of options of which one is
  chosen, used for "°C / °F" and "24-hour / 12-hour". It takes a `mode` (`tabs` or `radio`);
  here the mode is `radio`, so it is a `radiogroup` named "Temperature" or "Clock";
  each option is a `radio`, and the chosen one is exposed through `aria-checked` and carries a
  mark besides its colour (L2-033).
- **`Switch`** (`@mondino/components`) — a button with `role="switch"` and `aria-checked`,
  operated by Space and Enter, at least 44 × 44 px (L2-034). It reads "On" or "Off" beside the
  control, so its state is not carried by colour alone.
- **`SaveBar`** (`@mondino/components`) — takes a `state` input and emits `save` and `retry`.
  It renders nothing when the state is `hidden`. Its text sits in a live region (`role="status"`)
  so "Saved — your pin is up to date" is announced; in `failed` it is an alert (`role="alert"`).
  Its states are in the table below.
- **`Settings`**, **`TemperatureUnit`**, **`ClockFormat`** (`@mondino/api`) — the types the
  draft holds. `ProfileApi.updateProfile(teamId, update)` sends the whole `Settings` with the
  country and postal code.
- **`SettingsStore`** (`@mondino/domain`, `storage/`) — the viewer's `Settings` as a signal,
  provided in `root` because every screen reads it. `formatTime` and the temperature formatting
  read the clock format and the unit from it, so a saved choice applies on every screen without
  a reload (L2-033). It starts from `SettingsCache` and is replaced when a teammate joins,
  with the `settings` of the `JoinResult` (the defaults the backend gave for their country,
  so a teammate who joins from the United States sees °F and the 12-hour clock on the first
  screen, L2-019, L2-033), and when a profile is read or saved. Each `replace` writes
  `SettingsCache`.
- **`SettingsCache`** (`@mondino/domain`, `storage/`) — keeps the display settings in browser
  storage so the first screen of a later visit is drawn in the chosen unit and clock before the
  profile arrives. It never holds a postal code. The backend's copy is the one that holds
  (L2-033).
- **`statusFor(pin, time)`** (`@mondino/domain`, `time/`) — returns the status to show
  for a pin, or none. When the pin's status visibility flag is false, it returns a status only
  for "Working hours". Everything that shows, counts or filters by status calls it: the pin,
  the panel, the Team row, the day ribbon, the Team filter and the Globe's counts (L2-034).
  While a teammate's status is hidden they are listed under All only, not under Asleep.

| `SaveBar` state | When | Text | Action |
|-----------------|------|------|--------|
| `hidden` | The draft equals the saved profile and no confirmation is showing | none | none |
| `unsaved` | `hasUnsavedChanges` is true | "You have unsaved changes" | "Save changes" |
| `saving` | A save is pending | "Saving your changes…" | "Saving…", disabled and marked busy |
| `saved` | For 4 seconds after a save succeeds | "Saved — your pin is up to date" | none |
| `failed` | A save failed and the changes are still unsaved; it stays until a save succeeds or the changes are undone | "Couldn’t save. Your changes are still here." | "Try again" |

### Backend — `Mondino.Api`

- **`ProfileController`** — `PUT /api/teams/{teamId}/me` sends one `UpdateProfileCommand`.
  `TeammateSessionHandler` authenticates the session cookie, and the request carries an
  anti-forgery token as every state-changing request does.
- **`TeamsController`** — `GET /api/teams/{teamId}/pins` sends one `GetPinsQuery` and answers a
  `TeamPinsDto`. This feature
  adds no endpoint to it; it defines what the handler withholds.

### Backend — `Mondino.Application`

- **`UpdateProfileCommand` / `UpdateProfileCommandHandler`** — carries `TeamId`, `CountryCode`,
  `PostalCode` and `Settings`, and no teammate id. The handler loads the teammate that
  `ICurrentTeammate` names, calls `Teammate.ChangeSettings(settings)`, saves through
  `IAppDbContext` in one unit of work and returns the `ProfileDto`. The location part of the
  command is described in [Change location](../change-location/README.md).
- **`UpdateProfileCommandValidator`** — refuses a temperature unit or clock format outside the
  enumeration, and a kind of moment that is unknown or repeated, with `validation_failed`. A
  field the teammate may not set is ignored.
- **`GetPinsQuery` / `GetPinsQueryHandler`** — builds one `PinDto` per teammate of the viewer's
  team, returns them in a `TeamPinsDto`, and applies each teammate's sharing switches for that
  viewer:
  - `ShareWeather` is false and the pin is another teammate's: the `PinDto` carries a null
    `Weather` (no weather and no temperature) and the `WeatherState` `NotShared`, and the
    handler does not ask `IWeatherSource` for it (L2-034).
  - `ShowOutsideWorkingHours` is false and the pin is another teammate's: the `PinDto`'s status
    visibility flag, `ShowsStatusOutsideWorkingHours`, is false.
  - The pin is the viewer's own: the `PinDto` carries the weather and a true flag whatever the
    switches say. The viewer's own screens read the switches from `Settings` and add the note
    that teammates do not see them (L2-034).

  `PinDto.Weather` is null unless the weather is available, and `PinDto.WeatherState` is
  `Available`, `Unavailable` or `NotShared`, so a pin whose teammate does not share their
  weather and a pin whose weather could not be read (L2-049) show different messages.
- **`ProfileDto`** — returns the viewer's own `Settings` to the viewer and to no one else.
  Another teammate's `PinDto` carries the effect of the switches, never the switches themselves.

### Backend — `Mondino.Domain`

- **`TeammateSettings`** — value object: `TemperatureUnit`, `ClockFormat`, `MomentKinds`,
  `ShareWeather`, `ShowOutsideWorkingHours`. `DefaultsFor(countryCode)` gives a new teammate's
  settings: Fahrenheit for the United States and Celsius elsewhere (L2-019), the 12-hour clock
  for the United States and Canada and the 24-hour clock otherwise (L2-033), all four kinds of
  moment, and both sharing switches on (L2-034). `JoinTeamCommandHandler` calls it.
- **`Teammate`** — `ChangeSettings(settings)` replaces the value object whole.

### Errors

| Case | Status | `code` | What the screen shows |
|------|--------|--------|-----------------------|
| A setting outside its allowed values | 400 | `validation_failed` | `SaveBar` in `failed` |
| The new postal code cannot be found or checked on saving | 422 or 503 | `postal_code_not_found` or `postal_code_unavailable` | `SaveBar` in `failed`; the draft stays |
| The backend cannot be reached, or answers 5xx | none or 5xx | none | `SaveBar` in `failed`; the draft stays |
| The session has ended | 401 | none | `sessionExpiredInterceptor` forgets the membership and the address shows the no-team page in place; how a teammate signs in again is not designed |

## Requirements

The feature realises the following level-2 (L2) requirements. Each refines the level-1 (L1)
requirement cited beside it.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-033` | `L1-011` | The viewer chooses °C or °F and a 24-hour or 12-hour clock. The choice belongs to the teammate and applies on every screen. |
| `L2-034` | `L1-011` | Two switches, both on to begin with, decide what teammates see of the viewer: "Share my local weather" and "Show when I’m outside working hours". The backend applies both. |
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

A change shows the save bar. A save that succeeds confirms for 4 seconds, applies the
settings on every screen and reads the team's pins again. A save that fails keeps the changes on the screen unsaved and
offers to try again (L2-035).

![Sequence diagram for saving display and sharing settings](diagrams/sequence-save-settings.png)

### Behaviour — another teammate reads the pins after sharing is switched off

`GetPinsQueryHandler` applies both switches for the viewer who asks. The response to another
teammate carries no weather, and the `WeatherState` `NotShared`, for a teammate who does not share it, and a false status visibility
flag for one who does not show when they are outside working hours (L2-034).

![Sequence diagram for reading pins after sharing is switched off](diagrams/sequence-read-pins-after-sharing-off.png)

### Behaviour — leave the screen with unsaved changes

`unsavedChangesGuard` stops a navigation away from `/profile` while there are unsaved changes
and asks through `DiscardChangesDialog` (L2-035).

![Sequence diagram for leaving with unsaved changes](diagrams/sequence-leave-with-unsaved-changes.png)
