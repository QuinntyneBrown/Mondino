# 0025: The teammate screens share one clock, the refresh rides its minute, and the pins carry the viewer's own settings

**Status:** Accepted (journey 25, Keep the team fresh). Changes how
[ADR 0012](0012-drawing-the-globe.md) binds `CLOCK` on the teammate screens, and takes up the
alternative [ADR 0023](0023-settings-kept-by-the-backend.md) rejected.

## Context

L2-048 asks a screen left open to read the team again every 15 minutes while it is visible, never
while the tab is hidden, and at once when a tab hidden longer is shown again. `TeamStore` is
provided by `TeamShell`, above Globe, Team, Moments and Profile & Settings, but each of those
screens bound `CLOCK` to its own `BrowserClock` (ADR 0012), so the store had no clock to read and
a timer of its own would have been a second clock that does not rest. Separately, ADR 0023 left a
browser that has never opened Profile & Settings drawing in its country's defaults, and named
this journey to revisit carrying the settings with the pins.

## Decision

- **`TeamShell` binds `CLOCK` for its four screens**, which no longer bind their own. One
  `BrowserClock` then drives every local time on whichever screen is open and the store's
  refresh; it goes with the shell. Join and Create Team keep their own, as ADR 0012 says.
- **The refresh rides the clock's minute.** An effect on `CLOCK.minute` calls
  `refreshIfDue(minute)`, which refreshes when 15 minutes or more have passed since `refreshedAt`
  (the minute of the last good read) and none is pending. `BrowserClock` holds no timer while the
  tab is hidden and ticks at once on return, so a hidden tab makes no request and a tab hidden 15
  minutes or more refreshes on return, with no listener or timer in the store. A failed refresh
  is tried again at each minute tick, and "Try again" on the banner at once.
- **The pins carry the viewer's own settings.** `TeamPinsDto.ViewerSettings` is the asker's
  `SettingsDto`; no other teammate's settings or switches are in it. Each load and refresh hands
  it to `SETTINGS_STORE.replace`. An answer without it (an older backend, a fixture) leaves the
  store as it was.

## Consequences

- A browser that has never opened Profile & Settings draws the saved unit, clock and kinds as
  soon as the team answers, and a choice saved in another browser arrives at the next refresh.
  The first paint before the answer still uses what the browser kept, or the country's defaults.
- The answer that describes the team now carries one part that belongs to the asker alone, as
  `ViewerTeammateId` and `InviteToken` already do. A test that another teammate's read carries no
  switch now reads the switches it does carry as the reader's own.
- The clock lives as long as the shell, not one screen; leaving the four screens releases it with
  the store and its pending requests.
- Rejected: a refresh timer in the store (a second clock, and one more thing to rest while
  hidden); reading `GET /me` from the shell (a second request each refresh, and the postal code
  sent to the browser every 15 minutes for nothing).
