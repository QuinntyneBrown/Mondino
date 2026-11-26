# View the week around the world

## Overview

Mondino shows a team spread around the world as pins on a 3D globe. The Globe screen is the home
screen: the globe, a heading over it, and a panel beside it (under it on a phone). This feature
covers the Globe screen when no pin is selected.

- **teammate** — person who belongs to a team
- **viewer** — teammate looking at the screen
- **pin** — a teammate's place on the globe, placed at their city
- **status** — label that follows from a teammate's local hour: Working hours (09:00 to 18:00), Early morning, Evening or Probably asleep (23:00 to 07:00)
- **moment** — something happening where a teammate lives: a holiday, Formula 1, a local event or sport
- **invite link** — address through which a person joins a team
- **team of one** — team whose only teammate is the viewer

With no pin selected, the panel is headed "This week around the world". It lists the team's
moments from today to 7 days ahead, then "In working hours now": the teammates whose status is
Working hours. Choosing a moment selects its teammate's pin. The heading over the globe gives the
number of teammates, the number of distinct time zones, and how many teammates are working and
asleep.

A team of one has nobody else to show. The Globe screen then reads "Just you, for now" and shows
the team's invite link with a "Copy" button, in place of the panel. "Invite teammate" in the
header copies the same invite link, from any of the four screens, and opens nothing.

Everything here is worked out in the browser from the pins the `TeamStore` holds and from the one
shared clock, so the lists and the counts change as the hours pass, with no reload.

## Description

The slice lives in the Mondino web app. It adds one field to what the Mondino API returns with
the pins: the team's invite token.

- **`GlobePage`** — page of the `mondino` application at `/globe`. With no selection it renders
  `WeekPanel`, or `InviteCard` for a team of one. It heads the globe with `TeamStore.counts`.
- **`TeamStore`** — signal store in `domain`'s `pins/`. It holds `pins`, `viewerTeammateId`
  and `inviteToken`, and derives `counts`.
- **`teamCounts(pins, now)`** — pure function in `pins/` that returns a `TeamCounts`: the number
  of teammates, the number of distinct time zones (distinct `timeZoneId` values), the number
  whose status is Working hours and the number whose status is Probably asleep. The status is
  what `statusFor(pin, time)` gives, so a teammate who hides their status outside working hours
  is not counted as asleep (L2-015). `counts` is a computed signal over `pins` and the clock's
  minute tick, so a count changes when the clock passes an hour that changes a status (L2-025).
- **`weekMoments(pins, kinds, now, limit)`** — pure function in `moments/`. It takes each pin's
  moments, drops those whose kind is not in `kinds`, the viewer's chosen kinds
  (`Settings.momentKinds`, L2-022), keeps those dated from today to 7 days ahead, where today is the date in that pin's
  city, orders them by date and then west to east, and returns the first `limit` as
  `WeekMoment` values with a `more` flag. West to east is the order `orderWestToEast` gives the
  moments' teammates, the Team screen's order. `GlobePage` passes a limit of 8 (L2-024). The
  `when` text comes from `whenLabel(daysAhead, date)`, the emblem from `emblemFor` and the teammate's first name
  from `firstName(name)` in `pins/`, the first word of the name.
- **`workingNow(pins, now)`** — pure function in `pins/`. It returns one `WorkingTeammate` for
  each pin whose `statusFor(pin, time)` is Working hours, ordered by local hour and then west
  to east, with city and formatted local time. A pin whose status visibility flag hides the status is still listed, since Working hours
  is not hidden by that setting.
- **`WeekPanel`** (`mo-week-panel`) — presentation component. It takes `moments`, `working`
  and `everyKindOff`, and emits `teammateChosen` with a teammate id, `allMoments` and
  `chooseKinds`. Under the heading
  it reads "Holidays, races and local moments where your teammates live." Each moment is a row
  with its emblem, its title, its kind, the teammate's first name and city, and when it is;
  each teammate in working hours is a row with an `Avatar`, name, city and local time. Choosing
  either row emits `teammateChosen`. "All moments" is always shown under the moments, and
  "Nobody — it’s quiet everywhere." when `working` is empty. With every kind of moment turned
  off (`everyKindOff`, L2-022) the list gives way to "Nothing to show: every kind of moment is turned off for
  your globe." and "Choose what shows", which emits `chooseKinds`; `GlobePage` then navigates
  to `/profile`.
- **`InviteCard`** (`mo-invite-card`) — presentation component. It takes `inviteLink` and
  emits `copy`. It is headed "Bring the team onto the globe", says "Anyone with this invite link
  adds their pin with a postal code. No addresses are shown.", and shows the link as selectable
  text beside "Copy", which the link describes (`aria-describedby`).
- **`AppHeader`** (`mo-app-header`) — presentation component, the header of the four screens.
  Its "Invite teammate" button emits `invite`; it opens nothing.
- **`TeamShell`** — route component of the `mondino` application that holds the Globe, Team,
  Moments and Profile & Settings screens, provides `TeamStore` and `InviteLinkCopier`, and
  renders `AppHeader` and the `Toast`. On `invite` it calls `InviteLinkCopier.copy()`.
- **`InviteLinkCopier`** — service of the `mondino` application, provided at `TeamShell`'s
  route. `copy()` builds the link with `inviteLinkFor` from `TeamStore.inviteToken`, calls the
  CDK `Clipboard` and sets `result` to `Copied` or `Refused`; `dismiss()` clears it. "Copy" on
  the invite card and "Invite teammate" in the header both call it, so both end in the same
  toast.
- **`Toast`** (`mo-toast`) — presentation component that confirms the copy, rendered by
  `TeamShell` from `InviteLinkCopier.result`. "Invite link copied", with "Send it to a teammate. They add their pin with a name and a postal code.", sits
  in a `role="status"` region and dismisses itself after 4 seconds; the timer pauses while the
  toast is pointed at or focused. "Couldn’t copy the invite link", with "Your browser didn’t
  allow it. Select the link in the card and copy it yourself.", sits in a `role="alert"` region
  and stays until dismissed. Each has a close button named "Dismiss", which emits `dismissed`.
  Assistive technology announces both (L2-025).
- **`inviteLinkFor(origin, inviteToken)`** — pure function in `pins/` that returns
  `{origin}/join/{inviteToken}`, the address of `JoinPage`.
- **`Clipboard`** — Angular CDK service. `InviteLinkCopier` calls `copy(inviteLink)` and sets
  `result` from what it returns, which chooses the toast. When the browser refuses, the link
  stays on the invite card as selectable text.

`GlobePage` treats the team as a team of one when `pins` holds exactly one pin and its teammate
id equals `viewerTeammateId`. The Globe screen then reads "Just you, for now" and, in place of
the counts, "Invite your team to fill the map", and shows no panel. When a later load or refresh
(L2-048, designed in `keep-team-fresh`) brings a second pin, `InviteCard` gives way to
`WeekPanel` and the heading reads "2 teammates".

Choosing a moment or a teammate in working hours navigates to `/globe?teammate={teammateId}`; the selection, the turn of the
globe and the teammate's panel then follow the design in `view-teammate-panel`. "All moments"
navigates to `/moments`.

On the backend, `GET /api/teams/{teamId}/pins` returns a `TeamPinsDto`: the team's id and
name, the viewer's teammate id, the team's invite token and the `PinDto` list. `GetPinsQueryHandler`
builds it for a teammate of that team only. The `api` library mirrors it as the `TeamPins` type.
`TeamPinsDto` and `TeamPins` are names this design adds.

A teammate's name, a city and a moment's title are rendered as text, never as HTML.

## Requirements

The feature realises the following level-2 (L2) requirements. Each refines a level-1 (L1)
requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-024` | `L1-008` | With no pin selected the panel shows "This week around the world", the team's moments from today to 7 days ahead in date order and, on one date, west to east by their teammate, and "In working hours now", the teammates whose status is Working hours with their city and local time. |
| `L2-025` | `L1-008` | The Globe screen heads the globe with the number of teammates and, under it, the number of distinct time zones and how many teammates are working and asleep. A team with only the viewer shows "Just you, for now" and the team's invite link to copy. "Invite teammate" in the header copies the same invite link. |

## Diagrams

### System context

A teammate reads the week's moments and the team's counts in Mondino. The moments reach Mondino
from the calendar sources and the weather from Open-Meteo, through the backend only.

![C4 system context for viewing the week around the world](diagrams/c4-context.png)

### Containers

The Mondino web app builds the week panel from the pins the Mondino API returns. The API reads
the team, its invite token and its teammates from the Mondino database.

![C4 container view for viewing the week around the world](diagrams/c4-container.png)

### Components

`GlobePage` reads the pins, the counts and the invite token from `TeamStore`. It passes the
lists from `weekMoments` and `workingNow` to `WeekPanel`, or the invite link to `InviteCard`
for a team of one. `InviteLinkCopier` copies the link through the CDK `Clipboard`, for the card
and for `AppHeader`'s "Invite teammate", and `TeamShell` confirms it with `Toast`.

![C4 component view for viewing the week around the world](diagrams/c4-component.png)

### Class structure

`GlobePage` renders `WeekPanel` from `WeekMoment` and `WorkingTeammate` values, and `InviteCard`
from the invite link. `TeamStore` owns the `TeamCounts` that head the globe. `TeamShell` renders
`AppHeader` and `Toast`, and `InviteLinkCopier` holds the `CopyResult`.

![Class diagram for viewing the week around the world](diagrams/class-structure.png)

### Behaviour — show the week panel and choose a moment

`GlobePage` asks for at most 8 moments of the next 7 days, of the kinds the viewer chose, and
for the teammates in working hours. Choosing a moment or a teammate navigates to that teammate's id, which selects the pin and turns the
globe to it.

![Sequence diagram for showing the week panel and choosing a moment](diagrams/sequence-choose-moment.png)

### Behaviour — a team of one copies the invite link

With one pin, the viewer's own, the Globe screen shows `InviteCard` and no panel. "Copy" puts
the link on the clipboard and a toast confirms it in a status region; a refusal is said in an
alert. "Invite teammate" in the header does the same from any of the four screens. When a
second teammate's pin arrives, the card gives way to `WeekPanel`.

![Sequence diagram for a team of one copying the invite link](diagrams/sequence-copy-invite-link.png)
