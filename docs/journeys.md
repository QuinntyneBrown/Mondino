# Journeys

The order Mondino is built in. Each journey is one run of its prompt in [`prompts/`](prompts/), written
with the `writing-feature-prompts` skill: one journey, one prompt. Journey 1 scaffolds the workspace and
every later journey builds on the ones before it.

Each journey realises the L2 requirements beside it ([`specs/L2.md`](specs/L2.md)), from its detailed
design ([`detailed-designs/`](detailed-designs/)) and its mocks ([`mocks/`](mocks/), the source of truth).
Journey 1 is scored against L2-038 criterion 7 (Not Found); the rest of L2-038 is journey 27's. Journey 18
also builds the day ribbon's bar chart for a large team (L2-027 criteria 8 to 10). Every requirement, L2-001
to L2-056, belongs to a journey.

Effort is days for one intermediate developer. % complete is counted, never estimated: the share of a
journey's acceptance criteria that is wholly built and proven by a passing acceptance test (for journey 1,
the share of its prompt's nine slices), rounded to the nearest 10, and 100 only when everything under "Done
means" in its prompt holds. The total is weighted by effort. Journey 1 stands at 100: Not Found draws the still
globe as [`mocks/pages/not-found/default.html`](mocks/pages/not-found/default.html) draws it since it was
redrawn, and its acceptance test compares the two shape for shape.
Journey 2 stands at 100: every criterion of L2-001 is proven by an acceptance test, the backend's
through the API and the screen's in Playwright, with the bare pins on the still globe until
journey 8 draws the 3D one.
Journey 3 stands at 100: every criterion of L2-002, L2-003, L2-004 and L2-006 is proven by an
acceptance test, the backend's through the API and the screen's in Playwright, but for two clauses
its prompt hands on: the weather in the found line (L2-003 criterion 2) comes with journey 13's
weather source, and the globe turning to the city (criterion 3) with journeys 8 and 9.
Journey 4 stands at 100: every criterion of L2-005 is proven by an acceptance test, the backend's
through the API and the screen's in Playwright. The Globe it opens is the arrival only: the new pin
on the still globe, lifted and pulsing once, and the toast; the 3D globe, the team's pins and the
selected teammate's panel come with journeys 8, 10 and 14.
Journey 5 stands at 100: every criterion of L2-053 is proven by an acceptance test, the backend's
through the API and the screen's in Playwright, but for what its prompt hands on: the globe turning
to the maker's city (criterion 9) comes with journeys 8 and 9, and the Globe of a team of one
(criterion 11) opens as journey 4 left it until journey 15 draws "Just you, for now". The links to
Create Team from "You need an invite link" and "You’ve left" come with the screens of journeys 7
and 24.
Journey 6 stands at 90: 34 of the 40 criteria of L2-007 and L2-043 to L2-045 are proven by acceptance
tests, the backend's through the API and the screens' in Playwright, among them every endpoint refused
without a session unless marked open, another team answered as no team, a left teammate's session refused,
the antiforgery token, the security headers and the app served under a nonce-based CSP. The rest name
screens and endpoints of later journeys, which prove them there. Journey 7 proved Sign In's six (L2-043
criteria 9 and 10, L2-044 criterion 9, L2-045 criteria 7 to 9), which brought it from 28 to 34. The six
left are names shown as text on the pins,
the panel, the Team rows and search and the moments (L2-007 criterion 2, L2-044 criteria 1 and 12; journeys
10, 14, 17, 18 and 21), the team's name in the invite and leave dialogs and on Left Team with the link's
reset (L2-043 criterion 12, L2-044 criterion 10; journeys 16 and 24), and Profile & Settings' 429
(L2-045 criterion 6; journey 22). Journey 10 proved the pins' part of L2-044 criterion 1, a name of
markup on a pin shown as text, and the Globe's answer to a session that has ended, which forgets the team
and shows "You need an invite link"; neither completes a criterion, so it stays at 34.
Journey 7 stands at 100: every criterion of L2-052 is proven by an acceptance test, the backend's
through the API and the screen's in Playwright, by keyboard and by touch at 320 px. The Globe it opens
is the arrival journey 4 left; an expired or used link, and the wait while one opens, show Sign In's
form until their screens are designed (ADR 0011).
Journey 8 stands at 100: every criterion of L2-008 and L2-010 is proven by an acceptance test in
Playwright, read from the drawn globe's pixels, and the sun's position by direct unit tests (L2-010
criterion 1), but for what its prompt hands on: stepping down to the lower level of detail (L2-008
criterion 4) is journey 29's, which the scene's two detail steps are ready for; pins that lift and
open their panels on the still picture (criterion 3), a pin in the shaded half and readable there
(L2-010 criteria 2 and 4) come with journeys 9, 10 and 14; and the legend leaving out "Moment this
week" with every kind turned off (criterion 5) with journey 22. Join's stage draws the same globe.
Journey 9 stands at 100: every criterion of L2-009 is proven by an acceptance test in Playwright under
a paused clock, read from where the new pin is drawn, and every rule of turning by direct unit tests
of `GlobeMotion`, but for what its prompt hands on: the turn to a selected pin (criterion 3) is built
as `GlobeView`'s `facing` input and proven on Join, whose globe turns to the city found and holds;
selecting a pin and clearing the selection come with journeys 10 and 14 (ADR 0013). Journey 10 proved
criterion 3 on the Globe screen too: a pin or group pin selected by click, key or tap turns the globe to
it within a second and holds there until a click off the pins clears it.
Journey 10 stands at 100: the cast is drawn as `pages/globe/default` draws it, every criterion of L2-011
to L2-013 is proven by an acceptance test in Playwright, and the colour rule (L2-011 criterion 2) through
the API, with grouping, label placement, initials and accessible names by direct unit tests, but for what
its prompt hands on: the weather on a pin and in its label (L2-011 criterion 1, L2-012 criterion 1) comes
with journey 13, a teammate's sharing switches (L2-011 criteria 4 and 7) with journey 23, and the panel a
selected pin or group pin opens, through which a group's teammates are chosen (L2-012 criterion 5, L2-013
criteria 3 and 7), with journey 14 (ADR 0014).
Journey 11 stands at 80 (9 of its 11 criteria; the other two come with journeys 14, 15 and 17): the rest of
L2-014 and L2-015 is proven by an acceptance test, the
backend's through the API (a pin's IANA time zone, no local time, and whether its status is shared) and
the Globe's in Playwright under the page's fake clock (each pin's local time and status in words as
`pages/globe/default` names them, on the 24-hour clock and on the 12-hour clock of a teammate who joined
from the United States, every time ticking together on the minute, a status changing at its hour, and no
status for a teammate who does not share it), with the status table, its boundaries and Saturday, the
12-hour form and a daylight-saving change by direct unit tests. What is not yet proven belongs to the
screens of later journeys: the panel's "Tuesday 28 Oct" (L2-014 criterion 5; `formatDay` is built and unit-tested)
and the `status` badge come with journey 14, and the counts and filters that leave out a teammate who
does not share their status (L2-015 criterion 4) with journeys 15 and 17; the switch that turns sharing
off, and the clock chosen in Profile & Settings, with journey 23.
Journey 12 stands at 0 (none of its 14 criteria is yet proven by an acceptance test): the offset, the
overlap and the overlap bar are built and proven by direct unit tests against the cast at the mocks' "now"
(every offset `pages/team/default` gives, "7h behind you", "4h 30m ahead", "Same time", a daylight-saving
change on one side, Tomás's 16:00 to 18:00 and "4 pm–6 pm", Noah's "None today" with 23:00 to 08:00, the bar's
parts placed as `pages/globe/selected` places them, its text read aloud with start, end and length, nothing
for the viewer's own pin and no overlap for a teammate who does not share their status), but every criterion
of L2-016 and L2-017 is read off a teammate's panel or a Team row, which come with journey 14 (L2-016
criteria 1 to 5, L2-017 criteria 1 to 8) and journey 17 (L2-016 criteria 1 to 4 and 6); their Playwright
specs raise this number.
Journey 13 stands at 40 (4 of its 9 criteria): the weather comes from Open-Meteo by way of the backend
alone (ADR 0015), and is proven through the API (one call per city, fresh for 15 minutes, a code outside
the table shown as cloudy, a wind of 39 km/h or more as windy, the position rounded to two decimals and
nothing else sent, 5 seconds and no weather, no weather kept after a failure, and a teammate who does not
share it shown none) and on the Globe in Playwright (each pin's icon and degrees as `pages/globe/default`
draws them, its word in the pin's name and the lifted label, °F for a viewer in the United States, the
night icon of a clear sky at 23:05 in Dubai, and the local time alone where the weather is unavailable or
not shared), with `formatTemperature`, `formatDegrees` (no "−0") and the words by direct unit tests. Join's
found line names the weather in the unit of the country chosen (L2-019 criterion 4, and the clause of
L2-003 criterion 2 journeys 3 and 5 handed on), and the weather on a pin and in its label that journey 10
handed on (L2-011 criterion 1, L2-012 criterion 1) is proven. Not yet proven, for the screens of later
journeys: the panel's "13°C" and "Foggy in Milan" (L2-018 criterion 1) and its "55°F" and "0°C" (L2-019
criteria 1 and 2) come with journey 14, the weather icon a screen reader reads as its word on a Team row
(L2-018 criterion 5; on the Globe the icon is hidden and its word is in the pin's name) and the Team row's
"55°" with journey 17, and the unit changed in Profile & Settings (L2-019 criterion 3) with journey 23.

| # | Journey | Description | Requirements | Effort (days) | % complete |
|---|---|---|---|---|---|
| 1 | [Scaffold the workspace](prompts/01-scaffold-the-workspace-prompt.md) | Angular workspace, .NET solution, test harnesses, verify script and CI. | L2-038 | 5 | 100 |
| 2 | [Open an invite link](prompts/02-open-an-invite-link-prompt.md) | See the team's name, count and pins before joining. | L2-001 | 3 | 100 |
| 3 | [Place a pin from a postal code](prompts/03-place-a-pin-from-a-postal-code-prompt.md) | Give name, country and postal code; the city is found. | L2-002, L2-003, L2-004, L2-006 | 5 | 100 |
| 4 | [Join the team](prompts/04-join-the-team-prompt.md) | Join and land on the Globe with your new pin. | L2-005 | 4 | 100 |
| 5 | [Create a team](prompts/05-create-a-team-prompt.md) | Name a team, place your own pin and get its invite link. | L2-053 | 5 | 100 |
| 6 | [Protect team data](prompts/06-protect-team-data-prompt.md) | Only teammates see their team; postal codes stay private. | L2-007, L2-043, L2-044, L2-045 | 5 | 90 |
| 7 | [Sign in with an emailed link](prompts/07-sign-in-prompt.md) | Come back on a new device with a link that works once. | L2-052 | 6 | 100 |
| 8 | [Draw the globe](prompts/08-draw-the-globe-prompt.md) | See a lit 3D globe with its night side shaded. | L2-008, L2-010 | 15 | 100 |
| 9 | [Turn the globe](prompts/09-turn-the-globe-prompt.md) | Drag, arrow-key and auto-turn the globe; hold on a pin. | L2-009 | 5 | 100 |
| 10 | [Show pins](prompts/10-show-pins-prompt.md) | See every teammate's pin; lift one to read it. | L2-011, L2-012, L2-013 | 8 | 100 |
| 11 | [Show local time and status](prompts/11-show-local-time-and-status-prompt.md) | See each teammate's local time and status, ticking together. | L2-014, L2-015 | 4 | 80 |
| 12 | [Show offset and overlap](prompts/12-show-offset-and-overlap-prompt.md) | See how far ahead a teammate is and shared hours. | L2-016, L2-017 | 3 | 0 |
| 13 | [Show weather](prompts/13-show-weather-prompt.md) | See temperature and weather at each teammate's city. | L2-018, L2-019 | 5 | 40 |
| 14 | [View a teammate's panel](prompts/14-view-a-teammates-panel-prompt.md) | Select a pin and read that teammate's details. | L2-023 | 4 | 0 |
| 15 | [View the week around the world](prompts/15-view-the-week-around-the-world-prompt.md) | See this week's moments, who is working, and team counts. | L2-024, L2-025 | 4 | 0 |
| 16 | [Invite teammates](prompts/16-invite-teammates-prompt.md) | Open the invite dialog from any screen and copy the link. | L2-054, L2-055 | 3 | 0 |
| 17 | [View the team through the day](prompts/17-view-the-team-through-the-day-prompt.md) | See everyone west to east on a day ribbon. | L2-026, L2-027, L2-028 | 6 | 0 |
| 18 | [Find a teammate in a large team](prompts/18-find-a-teammate-in-a-large-team-prompt.md) | Search a team past 40, listed in a section per city. | L2-027, L2-056 | 3 | 0 |
| 19 | [Find moments](prompts/19-find-moments-prompt.md) | Holidays, races, events and sport found where teammates live. | L2-020 | 8 | 0 |
| 20 | [Mark pins with moments](prompts/20-mark-pins-with-moments-prompt.md) | See a moment marker beside pins with moments this week. | L2-021, L2-022 | 4 | 0 |
| 21 | [List moments](prompts/21-list-moments-prompt.md) | Browse upcoming moments by when and filter by kind. | L2-029, L2-030 | 4 | 0 |
| 22 | [Change location](prompts/22-change-location-prompt.md) | See your own pin and move it to a new city. | L2-031, L2-032 | 4 | 0 |
| 23 | [Choose display and sharing](prompts/23-choose-display-and-sharing-prompt.md) | Choose units, clock, moment kinds and what teammates see. | L2-033, L2-034, L2-035 | 5 | 0 |
| 24 | [Leave the team](prompts/24-leave-the-team-prompt.md) | Remove your pin and everything held about you. | L2-036 | 3 | 0 |
| 25 | [Keep the team fresh](prompts/25-keep-the-team-fresh-prompt.md) | An open screen refreshes pins, weather and moments quietly. | L2-048 | 3 | 0 |
| 26 | [Survive a source failure](prompts/26-survive-a-source-failure-prompt.md) | Pins keep their local time when weather or calendars fail. | L2-049, L2-050 | 4 | 0 |
| 27 | [Adapt to every width](prompts/27-adapt-to-every-width-prompt.md) | Use every screen from a narrow phone to a large display. | L2-037, L2-038 | 4 | 0 |
| 28 | [Make accessible](prompts/28-make-accessible-prompt.md) | Use everything by keyboard, touch, screen reader and reduced motion. | L2-039, L2-040, L2-041, L2-042 | 6 | 0 |
| 29 | [Stay fast and light](prompts/29-stay-fast-and-light-prompt.md) | Open quickly, turn smoothly, hold steady memory all day. | L2-046, L2-047 | 6 | 0 |
| 30 | [Observe without exposing](prompts/30-observe-without-exposing-prompt.md) | Operators see backend health; telemetry carries no teammate. | L2-051 | 3 | 0 |
| | **Total** | | | **147** | **45** |
