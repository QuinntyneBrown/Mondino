# 0028: A store that is refused with 401 forgets the team, and its screen says an invite link is needed; there is no interceptor

**Status:** Accepted (journey 27, Adapt to every width). Replaces the `sessionExpiredInterceptor`
that `adapt-to-every-width` drew; answers what journeys 23 and 24 left on Profile & Settings.

## Context

`adapt-to-every-width` drew `sessionExpiredInterceptor`, an `HttpInterceptorFn` bound in
`app.config.ts` that forgets the membership on any 401 and shows the same address again. The
browser calls the backend with `fetch` (ADR 0005), so there is no `HttpClient` to intercept, and
the interceptor was never built. Instead `TeamStore` forgets the team when the pins are refused
with 401 or 404, and Globe, Team and Moments then navigate to their own address, which shows
"You need an invite link" in place (L2-038 criterion 5).

Profile & Settings did not: a save refused with 401 said "Couldn’t save." and offered "Try
again", which cannot succeed; leaving refused with 401 showed the dialog's alert with "Try
again"; and a read refused with 401 said the profile could not be loaded. Journey 23 asked
whether "Leave without saving?" should be asked first.

## Decision

- **No interceptor.** Each store that speaks for the teammate decides on a 401 itself, as
  `TeamStore` already does.
- **`ProfileStore` treats a 401 on reading the profile, on saving and on leaving as an ended
  session.** It discards the draft, clears `SETTINGS_STORE`, calls `TeamMembership.forget()` and
  navigates to the address shown (`/profile`), replacing it in the history. `teammateGuard` no
  longer matches, so the same address shows "You need an invite link", "Start a team" and "Use a
  different email", as for anyone on no team.
- **"Leave without saving?" is not asked.** With no session nothing can be saved, so the draft
  is discarded before the navigation and `unsavedChangesGuard` lets the page go. An open "Leave
  Northwind?" closes with the page (journey 24's lesson).
- Any other failure is unchanged: the save bar's "Couldn’t save." with "Try again", the leave
  dialog's alert with "Try again", and the read's error with "Try again". A 404 on a save or a
  leave stays a failure of that action.

## Consequences

- An ended session leads to the same screen on all four teammate screens, whichever request
  found it, and the teammate signs in again through `sign-in`.
- What was typed and not saved is lost when the session has ended; it could not have been
  saved, and keeping it would hold a postal code for a teammate the browser no longer knows.
- The postal code lookup on Profile & Settings refused with 401 is still a failed lookup: the
  read of the pins that the shell repeats every 15 minutes finds the ended session first.
- Rejected: an interceptor around `fetch`. It would wrap a global the whole app shares, and a
  read's owner would still have to decide what its screen shows.
