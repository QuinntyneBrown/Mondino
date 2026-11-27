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

| # | Journey | Description | Requirements | Effort (days) | % complete |
|---|---|---|---|---|---|
| 1 | [Scaffold the workspace](prompts/01-scaffold-the-workspace-prompt.md) | Angular workspace, .NET solution, test harnesses, verify script and CI. | L2-038 | 5 | 100 |
| 2 | [Open an invite link](prompts/02-open-an-invite-link-prompt.md) | See the team's name, count and pins before joining. | L2-001 | 3 | 100 |
| 3 | [Place a pin from a postal code](prompts/03-place-a-pin-from-a-postal-code-prompt.md) | Give name, country and postal code; the city is found. | L2-002, L2-003, L2-004, L2-006 | 5 | 0 |
| 4 | [Join the team](prompts/04-join-the-team-prompt.md) | Join and land on the Globe with your new pin. | L2-005 | 4 | 0 |
| 5 | [Create a team](prompts/05-create-a-team-prompt.md) | Name a team, place your own pin and get its invite link. | L2-053 | 5 | 0 |
| 6 | [Protect team data](prompts/06-protect-team-data-prompt.md) | Only teammates see their team; postal codes stay private. | L2-007, L2-043, L2-044, L2-045 | 5 | 0 |
| 7 | [Sign in with an emailed link](prompts/07-sign-in-prompt.md) | Come back on a new device with a link that works once. | L2-052 | 6 | 0 |
| 8 | [Draw the globe](prompts/08-draw-the-globe-prompt.md) | See a lit 3D globe with its night side shaded. | L2-008, L2-010 | 15 | 0 |
| 9 | [Turn the globe](prompts/09-turn-the-globe-prompt.md) | Drag, arrow-key and auto-turn the globe; hold on a pin. | L2-009 | 5 | 0 |
| 10 | [Show pins](prompts/10-show-pins-prompt.md) | See every teammate's pin; lift one to read it. | L2-011, L2-012, L2-013 | 8 | 0 |
| 11 | [Show local time and status](prompts/11-show-local-time-and-status-prompt.md) | See each teammate's local time and status, ticking together. | L2-014, L2-015 | 4 | 0 |
| 12 | [Show offset and overlap](prompts/12-show-offset-and-overlap-prompt.md) | See how far ahead a teammate is and shared hours. | L2-016, L2-017 | 3 | 0 |
| 13 | [Show weather](prompts/13-show-weather-prompt.md) | See temperature and weather at each teammate's city. | L2-018, L2-019 | 5 | 0 |
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
| | **Total** | | | **147** | **5** |
