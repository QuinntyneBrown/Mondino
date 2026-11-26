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
- `PinDto.ShowsStatusOutsideWorkingHours` (`Pin.showsStatusOutsideWorkingHours`) is false when a
  teammate has switched off "Show when I'm outside working hours". Anything that shows, counts
  or filters by status calls `statusFor(pin, time)`, never `statusAt` directly.
- A postal code travels only in a request body. `IPostalCodeLookup.FindCityAsync` answers
  found, not found or unavailable; the API answers 422 `postal_code_not_found` and 503
  `postal_code_unavailable`.
- `IWeatherSource.GetCurrentAsync(position)` answers a `Weather` or nothing; nothing is never
  shown as zero.
- The `globe` library depends on `api` only. `GlobePage` hands `GlobeView` what `domain` works
  out: the pin and label templates, the moment markers, the pin descriptions and, through
  `PIN_SPREADER`, the placement of pins that are close together.
- `TeamStore` is provided at the route that holds Globe, Team, Moments and Profile & Settings.
  The browser knows its team from `TeamMembership`, which holds ids and the team's name and
  never a postal code. Without a membership, the four addresses show `InviteNeededPage` in
  place, and any other address shows `NotFoundPage`.

## Not decided yet

The designs mark these as `<TO SUPPLY>`:

- The globe's renderer and the format its Blender-built assets are exported to; an ADR decides
  both before the Globe is built.
- The database engine and the hosting platform.
- The providers of the postal code source and of the holiday, race and event calendars.
- How a team is made, and how a teammate signs in again on another device.
- What the "Invite teammate" and "Message" buttons lead to; neither is built before it is
  designed.
- Where the header reads the viewer's initials and colour for the avatar that links to
  Profile & Settings.
- Which emblems Mondino holds the right to use.
- How a `PinDto` tells weather that is not shared from weather that is unavailable.
- How the Asleep filter and its count treat a teammate who hides their status, beyond L2-015's
  rule that they are not counted as asleep.
- Protection against cross-site request forgery for the join request, which is made before a
  session exists.
- What becomes of a team when its last teammate leaves.
- Numbers the requirements do not give: the session's lifetime, the circuit breaker's threshold,
  the globe's turning rate and detail steps, and the rate limit on a teammate's own postal code
  lookup.
