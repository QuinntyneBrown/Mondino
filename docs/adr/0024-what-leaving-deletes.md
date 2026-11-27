# 0024: Leaving deletes the teammate's row and their sign-in links, ends the session by its absence, and keeps an empty team

**Status:** Accepted (journey 24, Leave the team). Builds on
[ADR 0008](0008-session-and-cross-site-requests.md), [ADR 0009](0009-making-a-team.md),
[ADR 0010](0010-protecting-team-data.md), [ADR 0011](0011-signing-in-with-an-emailed-link.md) and
[ADR 0023](0023-settings-kept-by-the-backend.md); changes one line of 0011.

## Context

L2-036 lets a teammate leave their team: their pin comes off the globe for every teammate, and
everything Mondino holds about them in that team (their name, email if they gave one, postal code,
city, settings and session) is deleted. `profile/leave-team` left two things `<TO SUPPLY>`: how a
session is ended, when a session is a protected cookie and the backend keeps no list of them
(ADR 0008), and what becomes of a team when its last teammate leaves. Two more things were held
about a teammate beside their row: the sign-in links asked for their email, each with the email's
fingerprint and a copy of the address sealed by the link's token (ADR 0011), and the display
settings their browser keeps in `mondino.settings` (ADR 0023).

## Decision

- **Leaving is a deletion of the teammate's row.** `DELETE /api/teams/{teamId}/me` sends
  `LeaveTeamCommand`, which names no teammate: the one who leaves is the one the session names.
  The handler removes that `Teammate` through `IAppDbContext`. The row holds the name, colour,
  joined date, postal code, city, email fingerprint and every setting (ADR 0023), so all go with
  it; nothing is marked, kept aside or archived.
- **Their sign-in links go with them.** In the same unit of work, every `SignInLink` whose
  fingerprint is the teammate's is deleted, with its sealed copy of the email, unless another
  teammate (in another team) holds the same fingerprint: their links are theirs too. A link the
  teammate still holds is then refused like any unusable one.
- **The session ends by the teammate's absence.** A session is a protected cookie naming a
  teammate and a team; ADR 0010's `OnValidatePrincipal` rejects one whose teammate no longer
  exists in that team. Once the row is gone, every copy of the session, in any browser, is refused
  with 401. The answer also expires the session cookie and the antiforgery cookie
  (`ITeammateSessions.EndAsync`, after the unit of work is saved), so the browser that left
  holds neither.
- **A team whose last teammate leaves is kept, with its name and invite link.** Nothing about the
  teammate remains (L2-036 criterion 8). Whoever holds the invite link can still join it, and is
  then its only teammate; a team is never deleted. Building anything more (deleting empty teams,
  a grace period) waits for a requirement.
- **The browser forgets the team.** On a 204, `ProfileStore` clears `SETTINGS_STORE`
  (`SettingsCache.clear()` removes `mondino.settings`) and calls `TeamMembership.forget()`
  (`mondino.membership`), then shows `LeftPage` with the team's name in the navigation state,
  which `LeftPage` reads once and takes out of history.
- **ADR 0011's example changes.** "Opening a good link whose email is on no team (the teammate
  left after asking)" now applies to an email that was never on a team: the link of a teammate who
  left is deleted with them.

## Consequences

- No migration: the deletion uses the existing tables and the cascade from `Team` to `Teammate`
  is not needed, since the teammate's own row is removed.
- A team can exist with no teammates. Its name and invite token are the only things kept, and
  they are about the team, not about anyone in it. An operator who wants empty teams gone has no
  tool for it yet.
- A teammate who left and opens a sign-in link mailed before leaving sees Sign In's form, as for
  any link that cannot be used (ADR 0011), not "You need an invite link" naming the email. Since a
  sign-in mail is sent only to an email on a team, L2-052 criterion 10 (a good link for an email on
  no team) is now reached by no flow the app offers; the redemption still answers it, and its test
  removes the teammate's row directly. Whether L2-052 criterion 10 should go is for the
  requirements to decide.
- Rejected: keeping a session list in the database to delete. It would add a read to every
  request for what the teammate's own row already answers. Rejected: deleting the team with its
  last teammate. It would break an invite link someone may still hold, and L2-036 asks only that
  nothing about the teammate remains.
