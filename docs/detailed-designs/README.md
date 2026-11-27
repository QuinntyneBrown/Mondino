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
| | [sign-in](joining/sign-in/) | L2-052 |
| | [make-team](joining/make-team/) | L2-053 |
| | [invite-teammates](joining/invite-teammates/) | L2-054, L2-055 |
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
| | [view-team-through-the-day](team/view-team-through-the-day/) | L2-026, L2-027, L2-028, L2-056 |
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

Every L2 requirement, L2-001 to L2-056, is realised by exactly one feature.

## The system in brief

- **Mondino web app** is an Angular single-page application in the browser: the libraries `api`,
  `domain`, `components` and `globe`, and the application `mondino`. It calls only the Mondino
  API.
- **Mondino API** is an ASP.NET Core service in four layers: `Mondino.Domain`,
  `Mondino.Application`, `Mondino.Infrastructure` and `Mondino.Api`. It is the only thing that
  calls an outside source.
- **Mondino database** holds teams and teammates through EF Core, in PostgreSQL
  ([ADR 0004](../adr/0004-database-engine.md)).
- **Outside sources** are the postal code source, Open-Meteo for the weather, the holiday,
  race and event calendars, and the email source that delivers sign-in links.
- **The screens** are Join (`/join/{inviteToken}`), Sign In (`/sign-in`), Create Team (`/new`),
  Globe (`/globe`), Team (`/team`), Moments (`/moments`), Profile & Settings (`/profile`) and
  Left Team (`/left`), with the pages that say one thing.

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
- `PinDto.SharesStatus` (`Pin.sharesStatus`; `TeammateSettings.ShareStatus` on the backend) is
  false when a teammate has switched off "Share whether I’m working or asleep". The flag is
  renamed from the earlier one, which hid the status outside working hours only: the status
  is now hidden at every hour. Anything that shows, counts or filters by status calls
  `statusFor(pin, time)`, never `statusAt` directly, and `statusFor` gives none for such a
  pin. Such a teammate has no working-hours overlap shown, is counted neither as working nor
  as asleep on the Globe, is not listed under "In working hours now", and on Team is listed
  under All only.
- A postal code travels only in a request body. `IPostalCodeLookup.FindCityAsync` answers a
  `PostalCodeLookupOutcome`: found with a `City`, not found or unavailable; the API answers 422 `postal_code_not_found` and 503
  `postal_code_unavailable`, and 429 `rate_limited` over the limit. A person joining looks one up
  with `POST /api/invites/{inviteToken}/postal-code-lookups`, a person making a team with
  `POST /api/postal-code-lookups`, which needs no invite token and is held to the same limit,
  and a teammate changing their location with
  `POST /api/teams/{teamId}/me/postal-code-lookups`.
- `LookupState`, in `@mondino/api`, is the state of a postal code lookup on Join, on Create
  Team and on Profile & Settings: `Idle`, `Locating`, `Found` (with its `PostalCodeResult`),
  `NotFound`, `Unavailable` or `RateLimited`. `PostalCodeField` takes it as `lookupState` and
  has one shape on the three screens, with a `mode` (`Join` or `Move`) that chooses its words.
  On Join and Create Team the lookup starts when the field is left; on Profile & Settings it
  starts from the "Look up" button.
- While the postal code lookup is down, Join and Create Team offer "Your city" (`CityField`).
  It searches `ICityDirectory`, the cities the backend holds itself, through
  `POST /api/invites/{inviteToken}/city-searches` or `POST /api/city-searches`, so the
  browser still calls only the backend. A join or a new team then carries a `cityId` in the
  postal code's place, and `Teammate.PostalCode` is optional.
- A session is issued in three places only: on joining (`join-team`), on making a team
  (`make-team`) and on opening a sign-in link that is still good (`sign-in`). Each ends in
  `TeamMembership.remember`.
- An email is the teammate's own, as a postal code is. It is kept only as
  `Teammate.EmailFingerprint`, a keyed fingerprint set for the teammate who made a team
  (ADR 0009); it travels only in a request body, is in no DTO another teammate receives, and
  is in no log, metric or span. No answer says whether Mondino knows an email:
  `POST /api/sign-in-links` answers 202 with no body whatever the email.
- `ISignInEmailSender`, in `Mondino.Application`, is the outside source that delivers sign-in
  links: Postmark (ADR 0011). It receives the address and the link and nothing else, from an
  outbox, so no answer waits for it. A sign-in token is stored as a hash, works once, and
  expires after 15 minutes by `TimeProvider`.
- `IInviteTokens` makes a team's invite token when the team is made and when its link is
  reset (`POST /api/teams/{teamId}/invite-link-resets`, which any teammate of the team may
  call). An invite link never expires; a reset token matches no team, and is refused with
  `invite_not_found` like one that was never issued.
- The open endpoints are those of `InvitesController`, `SignInController` and
  `TeamCreationController`. Each is marked as open and carries a policy of
  `RateLimitPolicies` (`protect-team-data`).
- `IWeatherSource.GetCurrentAsync(position)` answers a `Weather` or nothing; nothing is never
  shown as zero. Every call to an outside source times out after 5 s, and weather is fresh for
  15 minutes.
- The `globe` library depends on `api` only. `GlobePage` hands `GlobeView` what `domain` works
  out: the pin and label templates, the moment markers, the pin descriptions and, through
  `PIN_GROUPER` (`PinGrouper`, `groupPins(points, options)`), the grouping of pins that would
  cover each other into group pins with a count. `PinLayer` injects the token and `GlobePage`
  binds it. `GlobeView` takes `selectedGroupIds`, and selecting a group pin turns the globe to
  it.
- The pins on the globe are the accessible list. `PinLayer` renders them as the mocks'
  `ul.globe__pins > li.globe__pin > button.pin`; each button is named by `describePin` and
  carries `aria-pressed`, and the visible label is `aria-hidden`. There is no separate hidden
  list. `GlobeFallback` (the still picture) and `GlobePlaceholder` are in `components`, so
  they show when the `globe` library's chunk fails to load. The still picture keeps its pins,
  in place and working: `GlobeFallback` takes `placements` (from `stillPlacements(pins, size,
  options)` in `domain`'s `pins/`), `descriptions`, `markers` and `selectedId`, and emits
  `select` and `selectGroup`. Its pins lift and open their panels; it does not turn and is
  not dragged.
- `TeamShell`, in the app, is the component of the route that holds Globe, Team, Moments and
  Profile & Settings. It provides `TeamStore` and renders `AppHeader` (`mo-app-header`, block
  `app-header`), the refresh banner and the toast. The header avatar's initials and colour come
  from the viewer's pin in `TeamStore`. `AppHeader`'s "Invite teammate" button, an icon alone
  under 768 px with the same accessible name, emits `invite`; `TeamShell` calls
  `InviteDialogOpener.open(trigger)`, which opens the invite dialog on whichever screen is
  showing (`joining/invite-teammates`). The button no longer copies the link itself.
  "Invite teammates" on Team's card for a team of one (`InvitePrompt`) opens the same dialog.
  `InviteLinkCopier` stays: the dialog's "Copy link" and "Copy" on the Globe's invite card
  call it, and both end in the same two toasts. There is no "Message" button: Mondino has no
  chat.
- `GroupPanel` (`mo-group-panel`, `team/view-teammate-panel`) is `TeammatePanel`'s sibling.
  `GlobePage` shows it on `GlobeView`'s `selectGroup`. It takes `content`, the `GroupContent`
  that `groupCities` returns, and lists the group's teammates city by city, the city with the
  most teammates first, each a link that selects that pin. It has a close button and closes
  on Escape, as the teammate panel does.
- The browser knows its team from `TeamMembership`, which holds ids and the team's name and
  never a postal code or an email. Without a membership, the four addresses show
  `InviteNeededPage` in place, and any other address shows `NotFoundPage`. These two and
  `LeftPage` render `NoticePage`: the wordmark, a small globe, a title, one text and one or
  two ways on, with no app header.

  | Page | Title | Ways on |
  |------|-------|---------|
  | `InviteNeededPage` | "You need an invite link" | "Start a team" (Create Team), "Use a different email" (Sign In) |
  | `LeftPage` | "You’ve left Northwind" | "Start a new team" (Create Team), "Sign in to another team" (Sign In) |
  | `NotFoundPage` | "This page fell off the map" | "Back to the globe" |

  `InviteNeededPage` names the email a sign-in link was sent to when it has one, from the
  navigation state. `LeftPage` takes the team's name from the navigation state; opened or
  reloaded without it, it reads "You’ve left the team". `NotFoundPage` shows the address as
  text, without its query string.
- The Team screen keeps its status filter in the address (`/team?filter=working|asleep`) and
  its search text out of it. Past `LargeTeamThreshold` (40) teammates the list is one
  `CitySection` per city, each open section holding at most `CityRowLimit` (50) rows;
  `TeamTable` uses no virtual scrolling.
- `workingNow(pins, now, limit)` returns a `WorkingNow` (`count`, `teammates`, `more`), and
  the Globe's panel lists at most six moments and six teammates. A `MomentMarker` holds its
  `moments`, an `emblem`, a `count` and `today`.
- `GlobeScene.setPalette` takes a `GlobePalette` read from the `--color-globe-*` tokens; the
  globe is drawn by three.js from `globe.glb` and two mask textures built in Blender
  (ADR 0012), and its outline and shadow are SVG circles around the canvas. `CLOCK`'s
  `minute` signal ticks once a minute (`BrowserClock`, bound by each screen that reads the time), and
  `TeamStore.refreshing` is true while a refresh is pending.

## Not decided yet

The designs mark these as `<TO SUPPLY>`:

- The hosting platform, and with it how the API learns a client's own address behind the
  platform's proxy (forwarded headers), which the rate limits count by.
- The providers of the holiday, race and event calendars. (The postal code source and the city
  search's data set are ADR 0006's; the email source is ADR 0011's.)
- Signing in (`joining/sign-in`): how a teammate who joined by invite link signs in again,
  since Join asks for no email and only Create Team collects one; what is shown when an
  emailed link has expired or was already used, and while one is being opened (until then
  Sign In shows its form, ADR 0011); and how the email looks beyond its plain-text words.
- Resetting the invite link (`joining/invite-teammates`): what "Reset link" asks before it
  acts, and what the dialog shows while the reset is pending, when it fails and once it is
  done. Resetting is not built before that design exists.
- What Sign In shows when a request is refused with 429 (Create Team shows Join's countdown,
  ADR 0009).
- On Join: the words of the found line when a city is chosen through "Your city", the words
  for a name over 60 characters, and whether the lookup's rate limit window lengthens to match
  the mock's countdown ("9:42").
- Which emblems Mondino holds the right to use.
- What becomes of a team when its last teammate leaves.
- Numbers the requirements do not give: the circuit breaker's threshold,
  the globe's turning rate, the rate limit on a teammate's own postal code
  lookup.
