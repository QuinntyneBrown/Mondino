# Detailed designs

Each folder below is a subsystem of Mondino, and each folder inside it is one vertically sliced
feature. A feature's `README.md` holds its design: an overview, the parts it is made of, the L2
requirements it realises, and its diagrams (C4 context, container and component, a class
diagram, and a sequence diagram per behaviour). The requirements are in
[`docs/specs/L1.md`](../specs/L1.md) and [`docs/specs/L2.md`](../specs/L2.md).

The diagrams are PlantUML sources (`diagrams/*.puml`) with a rendered `.png` beside each. After
editing a source, render again:

```bash
python .claude/skills/writing-software-design-documents/scripts/render_puml.py docs/detailed-designs
```

## Subsystems and features

| Subsystem | Feature | L2 requirements |
|---|---|---|
| [joining](joining/) | [open-invite-link](joining/open-invite-link/) | L2-001 |
| | [place-pin-from-postal-code](joining/place-pin-from-postal-code/) | L2-002, L2-003, L2-004, L2-006 |
| | [join-team](joining/join-team/) | L2-005 |
| [globe](globe/) | [draw-globe](globe/draw-globe/) | L2-008, L2-010 |
| | [turn-globe](globe/turn-globe/) | L2-009 |
| | [show-pins](globe/show-pins/) | L2-011, L2-012, L2-013 |
| [time](time/) | [show-local-time-and-status](time/show-local-time-and-status/) | L2-014, L2-015 |
| | [show-offset-and-overlap](time/show-offset-and-overlap/) | L2-016, L2-017 |
| [weather](weather/) | [show-weather](weather/show-weather/) | L2-018, L2-019 |
| [moments](moments/) | [find-moments](moments/find-moments/) | L2-020 |
| | [mark-pins-with-moments](moments/mark-pins-with-moments/) | L2-021, L2-022 |
| | [list-moments](moments/list-moments/) | L2-029, L2-030 |
| [team](team/) | [view-teammate-panel](team/view-teammate-panel/) | L2-023 |
| | [view-week-around-the-world](team/view-week-around-the-world/) | L2-024, L2-025 |
| | [view-team-through-the-day](team/view-team-through-the-day/) | L2-026, L2-027, L2-028 |
| | [keep-team-fresh](team/keep-team-fresh/) | L2-048 |
| [profile](profile/) | [change-location](profile/change-location/) | L2-031, L2-032 |
| | [choose-display-and-sharing](profile/choose-display-and-sharing/) | L2-033, L2-034, L2-035 |
| | [leave-team](profile/leave-team/) | L2-036 |
| [platform](platform/) | [adapt-to-every-width](platform/adapt-to-every-width/) | L2-037, L2-038 |
| | [make-accessible](platform/make-accessible/) | L2-039, L2-040, L2-041, L2-042 |
| | [protect-team-data](platform/protect-team-data/) | L2-007, L2-043, L2-044, L2-045 |
| | [stay-fast-and-light](platform/stay-fast-and-light/) | L2-046, L2-047 |
| | [survive-source-failure](platform/survive-source-failure/) | L2-049, L2-050 |
| | [observe-without-exposing](platform/observe-without-exposing/) | L2-051 |

Every L2 requirement, L2-001 to L2-051, is realised by exactly one feature.

## The system in brief

- **Mondino web app** is an Angular single-page application in the browser: the libraries `api`,
  `domain`, `components` and `globe`, and the application `mondino`. It calls only the Mondino
  API.
- **Mondino API** is an ASP.NET Core service in four layers: `Mondino.Domain`,
  `Mondino.Application`, `Mondino.Infrastructure` and `Mondino.Api`. It is the only thing that
  calls an outside source.
- **Mondino database** holds teams and teammates through EF Core.
- **Outside sources** are the postal code source, Open-Meteo for the weather, and the holiday,
  race and event calendars.

## Contracts the features share

- `GET /api/teams/{teamId}/pins` answers a `TeamPinsDto`: the team's id and name, its invite
  token, the viewer's teammate id and the list of `PinDto`. Each `PinDto` also carries
  `IsViewer`, which agrees with the viewer's teammate id.
- `PinDto.Weather` is null unless the weather is available, and `PinDto.WeatherState`
  (`Pin.weatherState`, the type `WeatherState` in `@mondino/api`) is `Available`, `Unavailable`
  or `NotShared`, so weather that is not shared and weather that is unavailable are told apart
  and worded differently.
- `GET /api/invites/{inviteToken}` answers an `InviteDto`. Its `Avatars` are the initials and
  colour of the five teammates who joined most recently, with no name, id or city; they are
  the most a holder of an invite link learns of a teammate.
- `PinDto.ShowsStatusOutsideWorkingHours` (`Pin.showsStatusOutsideWorkingHours`) is false when a
  teammate has switched off "Show when I'm outside working hours". Anything that shows, counts
  or filters by status calls `statusFor(pin, time)`, never `statusAt` directly. While such a
  teammate's status is hidden they are listed under All only: not under Asleep, not in its
  count and not in "asleep" on the Globe.
- A postal code travels only in a request body. `IPostalCodeLookup.FindCityAsync` answers a
  `PostalCodeLookupOutcome`: found with a `City`, not found or unavailable; the API answers 422 `postal_code_not_found` and 503
  `postal_code_unavailable`, and 429 `rate_limited` over the limit. A person joining looks one up
  with `POST /api/invites/{inviteToken}/postal-code-lookups`, and a teammate changing their
  location with `POST /api/teams/{teamId}/me/postal-code-lookups`.
- `PostalCodeResolver`, an application service owned by `joining/place-pin-from-postal-code`,
  is the one place a country and a postal code become a city. `ResolveAsync` checks the form
  with `PostalCodeFormats`, calls `IPostalCodeLookup` and answers a `PostalCodeResolution`
  with the normalised `PostalCode` and the `City`, which carries the time zone. Both lookups
  (`LookUpPostalCodeQueryHandler` on Join, `LookUpOwnPostalCodeQueryHandler` on Profile &
  Settings), `JoinTeamCommandHandler` and `UpdateProfileCommandHandler` resolve through it.
- A request that names a team implements `ITeamScopedRequest`; for a team that is not the
  current teammate's own, `TeamScopeBehaviour` answers 404 with the code `team_not_found`
  before the handler runs, the same answer as for a team that does not exist.
- `LookupState`, in `@mondino/api`, is the state of a postal code lookup on Join and on Profile
  & Settings: `Idle`, `Locating`, `Found` (with its `PostalCodeResult`), `NotFound`,
  `Unavailable` or `RateLimited`. `PostalCodeField` has one shape on both screens: inputs
  `value`, `country` (a `Country`), `lookupState`, `message` (a `LookupMessage` or null: `text`
  and `retryLabel`) and `invalid`, which sets `aria-invalid` and is true for an empty postal
  code on submit and for not found only; outputs `valueChange`, `blurred` and `retry`. The
  field holds no copy: Join builds its message with `joinLookupMessage` beside `JoinPage`, and
  Profile & Settings with `profileLookupMessage`. `Country` and `LookupMessage` are types in
  `@mondino/api` too.
- `Country` is `code`, `name` and `postalCodeHint`: one whole sentence that gives the form
  that country's postal codes take ("Italian postal codes have five digits, like 20121.",
  "Canadian postal codes look like A1A 1A1."). The backend's `PostalCodeFormats` holds the
  sentence for each supported country (`PostalCodeFormat.Hint`) and supplies it as
  `CountryDto.PostalCodeHint` on the `InviteDto` and the `ProfileDto`; the not-found message
  on Join and on Profile & Settings ends with it as it stands, and the frontend composes no
  sentence about a form of its own.
- `IWeatherSource.GetCurrentAsync(position)` answers a `Weather` or nothing; nothing is never
  shown as zero. Every call to an outside source times out after 5 s, and weather is fresh for
  15 minutes.
- The `globe` library depends on `api` only. `GlobePage` hands `GlobeView` what `domain` works
  out: the pin and label templates, the moment markers, the pin descriptions and, through
  `PIN_SPREADER`, the placement of pins that are close together.
- `GlobeView` (`mo-globe`) has one list of inputs and outputs, given in `globe/draw-globe`:
  the inputs `pins`, `selectedId`, `interactive`, `descriptions`, `markers`, `label` and
  `arrivedIds`, the outputs `select`, `selectGroup` and `arrivedShown`, and the one public
  method `focusPin(teammateId)`. No input names a position to turn to: a page turns the globe
  to a place by putting a pin there in `pins` and naming it in `selectedId`. A globe whose
  `interactive` is false (Join, and the small globe on Profile & Settings) cannot be dragged
  and does not turn on its own; it still turns to the pin `selectedId` names and holds there.
- The pins on the globe are the accessible list. `PinLayer` renders them as the mocks'
  `ul.globe__pins > li.globe__pin > button.pin`; each button is named by `describePin` and
  carries `aria-pressed`, and the visible label is `aria-hidden`. There is no separate hidden
  list. `GlobeFallback` (the still picture) and `GlobePlaceholder` are in `components`, so
  they show when the `globe` library's chunk fails to load; the still picture has no pins.
- `TeamShell`, in the app, is the component of the route that holds Globe, Team, Moments and
  Profile & Settings. It provides `TeamStore` and renders `AppHeader` (`mo-app-header`, block
  `app-header`), the refresh banner and the toast. The header avatar's initials and colour come
  from the `Membership` in `TeamMembership`, so the avatar shows in loading and error states;
  `TeamShell` refreshes them from the viewer's pin in `TeamStore` whenever pins are read.
  `AppHeader`'s "Invite teammate" button emits `invite`;
  `TeamShell` provides `InviteLinkCopier`, a service of the `mondino` application, and calls
  its `copy()`, as "Copy" on the invite card does, so both copy the team's invite link and
  end in the same toast; it opens nothing. There is no "Message" button: Mondino has no chat.
- `GroupPanel` (`mo-group-panel`, `team/view-teammate-panel`) is `TeammatePanel`'s sibling.
  `GlobePage` shows it on `GlobeView`'s `selectGroup`; it lists the group's teammates west to
  east, each a link that selects that pin. It has no close button: it closes by its "This week
  around the world" link or Escape.
- `relativeLabel(daysAhead)`, in `domain`'s `moments/`, gives "Today", "Tomorrow" or "In N
  days" at any number of days ahead. `whenLabel(daysAhead, date)`, beside it, is the one
  helper that words when a moment happens where no date stands beside it: `relativeLabel`'s
  words up to 7 days ahead, and the day and month ("12 Nov") beyond. The teammate panel's
  moment cards, the Team table's "Coming up", the week panel and the moment marker use
  `whenLabel`; the Moments screen's rows show the weekday, day and month themselves, so they
  keep `relativeLabel`'s wording at every distance.
- `TeamStore`, in `domain`'s `pins/`, has one list, given in `team/keep-team-fresh`: the
  signals `pins`, `teamName`, `inviteToken`, `viewerTeammateId`, `selectedTeammateId`,
  `counts`, `arrivedTeammateIds`, `loadState`, `refreshFailed` and `refreshedAt`, the derived
  `viewerPin` and `selectedPin`, and the methods `load(teamId)`, `refresh()`,
  `select(teammateId)`, `clearSelection()` and `acknowledgeArrived()`. It reads the pins with
  `TeamApi.getPins(teamId, signal)`, which returns a `TeamPins`; the team's moments are not
  held in it but read by `MomentsPage` with `TeamApi.getMoments(teamId, signal)`.
- `SettingsStore`, in `domain`'s `storage/`, holds the viewer's `Settings` (the temperature
  unit, the clock format, the kinds of moment shown on the globe and the two sharing
  switches) as a signal. It is provided in `root`, because every screen reads it, starts from
  `SettingsCache` and is replaced when a profile is read or saved
  (`profile/choose-display-and-sharing`); leaving the team clears both.
- The browser knows its team from `TeamMembership`, whose `Membership` holds the team's id and
  name, the teammate's id and the viewer's `initials` and `colour` (the colour from the
  `JoinResult`, which returns the one the backend assigned), and never a postal code or a
  city. Without a membership, the four addresses show `InviteNeededPage` in
  place, and any other address shows `NotFoundPage`. `LeftPage` takes the team's name from the
  navigation state; opened or reloaded without it, it reads "You’ve left the team".

## Not decided yet

The designs mark these as `<TO SUPPLY>`:

- The globe's renderer and the format its Blender-built assets are exported to; an ADR decides
  both before the Globe is built, and with them the detail steps and whether the renderer draws
  a 3D body under each pin.
- The database engine and the hosting platform, and what follows from them: the guard that
  keeps the limit of 500 teammates exact under concurrency, a cache shared between instances
  of the API, the forwarded header the client address is read from, the CSP nonce for
  component styles, and the header that caches the assets.
- The product that receives the telemetry, and its sampling rate.
- The providers of the postal code source and of the holiday, race and event calendars, and
  what depends on each: how the city's own position is obtained, what the event source is
  sent, and how a source's region is matched to a city's.
- How a team and its invite link are made, how an invite link is withdrawn, how a session is
  stored, and how a teammate signs in again on another device.
- Which emblems Mondino holds the right to use.
- Protection against cross-site request forgery for the join request, which is made before a
  session exists.
- What becomes of a team when its last teammate leaves.
- What a drag does to the globe while a pin is selected, the order of two moments that
  fall on the same day at one pin, and the day of a race weekend that a Formula 1 moment's
  date carries.
- Numbers the requirements do not give: the session's lifetime; the circuit breaker's
  threshold and break, the cache lifetimes of postal codes and calendars, and how many calls
  to one source run at once; the globe's turning rate, step, tilt limit and easing, the
  movement that separates a tap from a drag, how near the edge a pin is drawn fainter, and how
  many pins a fan holds; the wind threshold; the buffer of a windowed list; and the rate limit
  on a teammate's own postal code lookup.
