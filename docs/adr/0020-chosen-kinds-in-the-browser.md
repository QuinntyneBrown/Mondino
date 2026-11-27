# 0020: The viewer's chosen kinds of moment are read through `SETTINGS_STORE`, kept in the browser until Profile & Settings saves them

**Status:** Accepted (journey 20, Mark pins with moments). Journey 23 (Choose display and sharing)
adds the backend's copy behind the same token.

## Context

Only the kinds of moment the viewer chose mark pins and fill "This week around the world"
(L2-022). The switches that choose them are on Profile & Settings, and the backend's copy of a
teammate's settings (`TeammateSettings`, `GET` and `PUT /api/teams/{teamId}/me`) comes with
journeys 22 and 23. The Globe needs the kinds now, and the `choose-display-and-sharing` design
already names a `SettingsStore` that every teammate screen reads and a `SettingsCache` that keeps
the display settings in the browser so a later visit is drawn in them before the profile answers.

## Decision

- **A contract in `api`.** `SettingsStore` holds `momentKinds` as a signal, behind the
  `SETTINGS_STORE` injection token. Screens depend on the token, never on where the kinds are kept.
- **`SettingsCache` in `domain`'s `storage/`** implements it from the browser's local storage, key
  `mondino.settings`, holding `{ teammateId, momentKinds }`. It reads the kinds only when the
  teammate id is the membership's, so a teammate who signs in on a browser another has used starts
  from their own; it drops a kind it does not know, as stored data is a teammate's to change. With
  nothing kept, or storage blocked, all four kinds are on (L2-022). It holds no postal code, no
  email and no position (L2-043).
- **Bound by `TeamShell`**, the lazy route of the teammate screens, not in `app.config.ts`: only
  those screens read it, and its code stays out of the initial bundle.
- **Journey 23 writes it.** A save on Profile & Settings writes the kinds there, and a profile
  read replaces them with the backend's copy, which is the one that holds. Until then nothing in
  the app changes them; the acceptance tests set the state a save would leave.

## Consequences

- The choice changes the viewer's own browser and nothing for anyone else (L2-022 criterion 5).
- Until journey 23, a kind turned off is not carried to another device; that is the backend's copy's
  job, and the cache is only how the first screen is drawn before it answers.
- Rejected: binding the kinds in `app.config.ts` (code in the initial bundle for screens that are
  lazy), and reading them from the Globe page's own storage code (a second place that would have to
  learn about the backend's copy).
