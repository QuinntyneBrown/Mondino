# Mondino mocks

Static HTML mocks of every Mondino screen in every state: the screens before a team (Join, Sign
In, Create Team), the four screens of a team (Globe, Team, Moments, Profile & Settings), the
pages that say one thing, the dialogs, the notifications, and the brand sheet.
They are the design and the ultimate source of truth. `docs/design-system/`, `docs/specs/`, the
ADRs, `docs/detailed-designs/`, `AGENTS.md` and the code follow them.

They are transcribed from the **Mondino App** prototype in Magic Patterns (the *Global Teammate
Globe* OS; frames Join, Sign In, Create Team, Invite Needed, Globe, Team, Moments, Profile &
Settings, Left Team and Not Found, and its shared `Globe`, `AppShell`, `AuthLayout`,
`NoticePage`, `InviteDialog`, `OverlapBar`, feedback, pins, team and time code), as it stood on
26 November 2026 after its second pass: the cool paper palette, the cartoon globe, the screens
for signing in and making a team, the invite dialog, a team of 500, and its own dark theme. The
brand sheet, `pages/brand`, is the *Mondino Brand* prototype's frame *Logo & Wordmark*, with the
globe's colours added from the app's theme.

## How to open them

Open [`index.html`](index.html) from disk; nothing needs a server or a network. Each mock has a
bar at the bottom that lists the screen's other states and switches the theme.

- `?theme=dark` or `?theme=light` forces a theme; the `t` key switches it.
- `?chrome=0` hides the mock bar and the notes, leaving the screen as the product shows it.
- A dashed "Note" box says what a still page cannot show: motion, timing, focus.

```
docs/mocks/
  index.html            gallery of every screen and state (generated)
  manifest.json         the screens, their states and the L2 requirements each serves
  assets/tokens.css     imports the design system's tokens (docs/design-system/tokens/tokens.css)
  assets/ui.css         imports the design system's component CSS, then the brand sheet's own layout
  assets/mock.css, mock.js   the mock bar and notes; not product UI
  pages/<screen>/<state>.html
  dialogs/<dialog>/<state>.html
  notifications/<notification>/<state>.html
```

## Cast and catalog

The prototype's sample team is the cast, not rules. Every mock uses it.

- **Team:** Northwind. Its invite link is `mondino.app/join/northwind-7Kq2`.
- **The viewer:** Sofia Bianchi, Milan, Italy (postal code 20121, shown only on her own Join,
  Create Team and Profile & Settings; her email, sofia@northwind.co, only on her own Sign In,
  Create Team and "You need an invite link").
- **Now:** Monday 27 October 2025, 14:05 UTC, which is 15:05 in Milan. Temperatures in °C and a
  24-hour clock unless a mock says otherwise.

| Teammate | City, country | Time zone | Local time | Status | From Sofia | Weather | Moment |
|---|---|---|---|---|---|---|---|
| Tomás Herrera | Mexico City, Mexico | America/Mexico_City | 08:05 | Early morning | 7h behind | Partly cloudy, 22° | Holiday · Día de Muertos · 1 Nov; Sport · Clásico Nacional · 2 Nov |
| Jordan Lee | Austin, United States | America/Chicago | 09:05 | Working hours | 6h behind | Partly cloudy, 24° | Local event · Halloween on 6th Street · 31 Oct |
| Chloé Martin | São Paulo, Brazil | America/Sao_Paulo | 11:05 | Working hours | 4h behind | Showers, 26° | Formula 1 · São Paulo Grand Prix · 9 Nov |
| Liam O’Connor | Dublin, Ireland | Europe/Dublin | 14:05 | Working hours | 1h behind | Rainy, 9° | Holiday · October Bank Holiday · today |
| Kwame Mensah | Accra, Ghana | Africa/Accra | 14:05 | Working hours | 1h behind | Clear, 30° | Holiday · Farmers’ Day · 5 Dec |
| Luca Ferri | Milan, Italy | Europe/Rome | 15:05 | Working hours | Same time | Foggy, 13° | none |
| Sofia Bianchi (you) | Milan, Italy | Europe/Rome | 15:05 | Working hours | — | Foggy, 13° | Formula 1 · Monza tickets on sale · 12 Nov |
| Lena Fischer | Berlin, Germany | Europe/Berlin | 15:05 | Working hours | Same time | Cloudy, 8° | Local event · St. Martin’s lantern walk · 11 Nov |
| Mara Lindqvist | Stockholm, Sweden | Europe/Stockholm | 15:05 | Working hours | Same time | Cloudy, 6° | Holiday · Alla helgons dag · 1 Nov |
| Ahmed Al-Sayed | Dubai, United Arab Emirates | Asia/Dubai | 18:05 | Evening | 3h ahead | Clear, 32° | Holiday · UAE National Day · 2 Dec; Formula 1 · Abu Dhabi Grand Prix · 7 Dec |
| Priya Raman | Bengaluru, India | Asia/Kolkata | 19:35 | Evening | 4h 30m ahead | Stormy, 27° | Holiday · Karnataka Rajyotsava · 1 Nov |
| Aiko Tanaka | Tokyo, Japan | Asia/Tokyo | 23:05 | Probably asleep | 8h ahead | Clear, 14° | Holiday · Culture Day · 3 Nov |
| Noah Williams | Melbourne, Australia | Australia/Melbourne | 01:05 Tue | Probably asleep | 10h ahead | Windy, 18° | Sport · Melbourne Cup Day · 4 Nov |

So the Globe reads "13 teammates" and "12 time zones · 8 working · 2 asleep", and the Team
filters read "All 13", "Working now 8" and "Asleep 2". Luca joined in the prototype's second
pass, in Milan like Sofia, so the cast always has two pins in one place: on the globe they are
one group pin, "2". Tomás has two moments in the week, so his moment marker shows a count.
Eight moments fall this week: one today (Dublin) and seven in the next seven days; the panel
lists six of them. "Today" is the date in the moment's own place, so Melbourne Cup Day is seven
days off in Melbourne although it is eight days off in Milan.

A few states need something the cast cannot give at that hour, and say so in a note:

- **A team of 500**, in `globe/hundreds`, `team/hundreds` and `team/hundreds-no-match`: the
  prototype's seeded team (`bigTeam.ts`: the cast and 487 generated teammates in 40 cities),
  reproduced name for name, at the cast's "now": 38 time zones, 324 working, 42 asleep.
- **A smaller team** of Sofia, Mara and Liam: `globe/quiet` (23:30 in Milan, nobody in working
  hours, every kind of moment turned off) and `team/no-results` (mid-afternoon, no one asleep).
- **A week with no moment**, in `globe/no-moments`: the cast at its "now" with no moment where
  any teammate lives from today to 7 days ahead, so no pin carries a moment marker.
- **A team of one**, Sofia: `globe/empty`, `team/empty` and `create-team/created`.
- **Edges**, in `team/edge`: three more teammates with a very long name, a one-word name and a
  name typed as markup, on a 12-hour clock in °F.
- **A move**, in `profile/locating`, `location-found`, `invalid`, `lookup-unavailable` and
  `rate-limited`: Sofia types a Toronto postal code, M5V 2T6. (The prototype moves her to
  Berlin; the city is the cast's, not a rule.)
- **°F and the 12-hour clock**, the prototype's own controls, in `globe/fahrenheit-12-hour` and
  `team/edge`.
- **Sharing off**, in `globe/sharing-off`: Ahmed shares neither his weather nor whether he is
  working or asleep. (The prototype shows Lena.)

## Where the mocks depart from the prototype, and why

The prototype's second pass took up most of what the mocks had corrected in its first: no
postal code and no role on another teammate, no "Message" button, a moment marker with the
kind's icon, darker pin text and control edges, all four kinds of moment on. What is left:

| The prototype | The mocks | Why |
|---|---|---|
| Sign In has a state "No Mondino account uses sofia@northwind.co". | Not drawn. "Check your inbox" is shown whether or not the email is on a team. | A screen open to anyone must not tell anyone which emails Mondino knows (L2-043, L2-045). |
| "Check your inbox" has a button "I’ve clicked the link". | No such button. | It is how the prototype moves on. In the product the link in the email opens Mondino signed in. |
| A full team: "The team has used all 1,000 places on its plan. Ask a Northwind admin to make room". | "The team has all 500 of its places taken. Ask a teammate at Northwind to tell you when a place opens". | Mondino has no plans and no admins, and a team holds 500 (L2-005). |
| A reset invite link: "Someone at Northwind reset it". | "Someone on the team reset it". | A link that no longer works names no team (L2-001). |
| "ask a teammate for a fresh invite link", "you’ll need a new invite link". | "the team’s invite link". | The invite link never expires, as the invite dialog says, so leaving does not use it up. |
| The viewer's own panel on the Globe shows their postal code. | City and country only. | A postal code appears only on the teammate's own Join, Create Team and Profile & Settings (L2-007). |
| "8h ahead you". | "8h ahead of you". | Grammar. "7h behind you" and "same time as you" are the prototype's. |
| Team shows a teammate's status as a coloured dot beside the time. | The dot, and the status in words under the name. | A status is never given by colour alone (L2-015). |
| A moment marker is the same whether the moment is today or later in the week. | Today's is larger and ringed. | Today's moment is the one to notice, and it is stronger by more than colour (L2-021). |
| A pin pointed at shows a label with the name, and the city and first moment. | The lifted label also carries the local time and the weather. | A lifted pin is how a teammate is read on a small globe (L2-012). |
| "No one matches…" and a filter with nothing say "Try another filter." as a line of text. | The same words, in a live region. | So the change is announced (L2-039). |
| Join and Create Team list six countries; Profile & Settings types the country. | One list of the supported countries on all three. | One field, one shape. |
| Profile & Settings moves Sofia to "Berlin-Mitte". | A city: "Toronto, Canada." | Only the city is shown, and a pin is placed at the city (L2-006). |
| The invite dialog's "Reset link", and the copy button on the empty Globe's card, do nothing when pressed. | "Reset link" is drawn and noted as not designed; the card's "Copy" ends in the invite toasts. | See the open questions. |
| The globe calculates the night side from the clock at render time. | The default globe shows the night side at 14:05 UTC on 27 October 2025. | A fixed instant keeps the globe, local times and working-hour counts consistent across captures. |
| Moments on the same date keep the prototype’s sample-team order. | On 1 November, Mexico City comes first, followed by Stockholm and Bengaluru. | Both the Globe panel and Moments order same-date entries from west to east, as required by the L2 acceptance criteria. |
| Join colours each nameless pin in its teammate’s colour. | Every nameless pin on Join is in the pin colour. | The initials beside the team’s name carry their teammates’ colours, so a coloured pin would tie a set of initials to a city; the initials are not tied to any pin (L2-001). |
| The globe fetches its land from a CDN and is drawn live with d3-geo. | A still SVG of the same cartoon globe, drawn into each mock. | Mocks open from disk with no network. |
| Fonts from Google Fonts. | Gabarito and Inter bundled in the design system. | Fonts are self-hosted, never from a CDN. |
| White initials on every teammate colour. | Seven of the thirteen teammate colours darkened. | 4.5:1 for text (L2-041). |
| Tabs, filters and chips drawn about 30 px tall; the phone header 390 px wide at its narrowest. | The same look, each with a 44 px touch target, and a header that fits 320 px. | Every touch target is at least 44 × 44 px, and every screen works from the narrowest phone (L2-037, L2-039). |

The prototype now draws most states itself. These are still the mocks' own, written from the L2
requirements: Join's error summary, Profile & Settings with the lookup down or rate limited,
Team with long and odd names, the Globe in °F on a 12-hour clock, the Globe's week with no moment
(`globe/no-moments`: "No moments this week.", with "All moments" under it), and the brand sheet's notes.

## The globe

The product's globe is a 3D model built in Blender (L2-008). The mocks draw it still, in the
prototype's cartoon look: a blue ocean with a deeper rim, green land with sand and forest, ice
caps, puffy clouds, a glossy shine, a hard drop shadow and an ink outline, with the night side
shaded in dusk from the sun's position at the cast's "now". They design the interface around the
globe and the look it aims for; which renderer draws it is decided in an ADR.

The globe's colours are tokens of their own (`--color-globe-*`, in the design system): ocean,
land, sand, ice, cloud and night, a little deeper in dark, where the outline is light. Pins and
their labels are HTML over the picture, placed at the positions the projection gives. Pins that
would cover each other are one group pin with a count; where the 3D globe cannot be drawn, the
still picture keeps its pins.

## Open questions and assumptions

1. **Signing in after joining by invite link.** Sign In emails a link to a "work email", and
   Create Team asks for one. Join asks for a name, a country and a postal code and no email, so
   a teammate who joined by invite link has no email to sign in with. Whether Join should ask
   for one, or such a teammate comes back another way, is not designed. Nothing is built for it
   until it is.
2. **A sign-in link that has expired or was already used.** "It works once, for the next 15
   minutes." What opening it afterwards shows is not designed.
3. **"Reset link".** The invite dialog draws it and Join says what a reset link looks like to
   someone who opens it. What it asks before it acts, and what the dialog shows afterwards, is
   not designed; anyone on the team can press it, since Mondino has no admins.
   Until it is, the built invite dialog leaves "Reset link" out (journey 16): a control that
   does nothing when pressed is not built, so its foot keeps the count alone, "13 on the team ·
   link never expires". An unusable link already has one answer on Join, "This invite link no
   longer works" (L2-001).
4. **The palette.** The Mondino App prototype uses the palette the *Palette Variants* canvas
   calls "Current": navy ink and sea on a cool off-white with a warm orange pin. Fjord, Candy
   Pop and Lagoon are on that canvas as options and none has been applied to the app. The mocks
   use Current. Choosing another changes the primitives at the top of
   `docs/design-system/tokens/tokens.css` and nothing else.
5. **Dark theme.** Decided: the prototype now has one, and the mocks use its values. The design
   system adds the steps the prototype's sixteen values do not give (a raised surface, the
   danger and warning surfaces).
6. **"Invite teammate".** Decided, and changed: the header button opens the invite dialog
   (`dialogs/invite`), on a phone as an icon. It no longer copies the link straight to the
   clipboard. "Message" stays out: Mondino has no chat.
7. **A team of hundreds.** Decided for 500: group pins on the Globe, the day ribbon as a bar
   chart past 40 teammates, and Team with a search and a section per city. Moments for a team
   of 500 is not drawn (L2-047).
8. **A count on a moment marker.** Decided: two or more moments this week show their number.
9. **Create Team's postal code lookup.** Decided (journey 5): Create Team looks its postal code
   up as Join does and shows Join's words, `create-team/locating`, `found`, `not-found` and
   `lookup-unavailable`, while its button keeps reading "Create team". A postal code lookup
   refused with 429 shows Join's countdown, `create-team/rate-limited`
   ([ADR 0009](../adr/0009-making-a-team.md)). The request to make the team has no rate limit
   and is never refused for coming too often ([ADR 0016](../adr/0016-no-limit-on-making-a-team.md)).
10. **Time zones.** The Globe counts distinct IANA time zones, as the prototype does: twelve for
    the cast, worked out at 14:05 UTC.
11. **The Team filter** is a tab list and the Moments filter a set of pressed buttons, as L2-028
    and L2-030 word them.
12. **The initials on Join** are those of the five teammates who joined most recently, with
    their colours and nothing else: no name, no city.
13. **The countries** on Join, Create Team and Profile & Settings are the supported list to
    begin with: Australia, Brazil, Canada, Germany, Ghana, India, Ireland, Italy, Japan, Mexico,
    Sweden, United Arab Emirates and the United States.
14. **Leaving.** `left-team` takes the team's name from the screen the teammate left from;
    opened or reloaded without it, its title reads "You’ve left the team". Someone on no team
    who opens a screen sees `invite-needed` in place.
15. **The sheet's width.** `dialogs/invite` says a dialog is a sheet "under 576 px", as L2-037
    and the design system's dialog page do; the component CSS made it one under 640 px, with the
    Globe's stage. Journey 16 brought the CSS to 576 px (36rem), the phone's own breakpoint.

## Coverage

<!-- coverage:start -->

Legend: ✅ mock exists · ➖ not applicable (reason in manifest) · ❌ missing

### Pages

| Screen | default | loading | empty | error | locating | found | not-found | lookup-unavailable | choosing-city | invalid | submitting | join-failed | rate-limited | team-full | invite-unusable | sent | created | selected | selected-self | selected-asleep | pin-lifted | just-joined | group | hundreds | sharing-off | quiet | no-moments | globe-unavailable | fahrenheit-12-hour | weather-unavailable | working | asleep | no-results | edge | hundreds-no-match | filtered | location-found | Requirements |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Join (`join`) | [✅](pages/join/default.html) | [✅](pages/join/loading.html) | ➖ | [✅](pages/join/error.html) | [✅](pages/join/locating.html) | [✅](pages/join/found.html) | [✅](pages/join/not-found.html) | [✅](pages/join/lookup-unavailable.html) | [✅](pages/join/choosing-city.html) | [✅](pages/join/invalid.html) | [✅](pages/join/submitting.html) | [✅](pages/join/join-failed.html) | [✅](pages/join/rate-limited.html) | [✅](pages/join/team-full.html) | [✅](pages/join/invite-unusable.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-001`, `L2-002`, `L2-003`, `L2-004`, `L2-005`, `L2-006`, `L2-037`, `L2-040`, `L2-045`, `L2-049`, `L2-052`, `L2-053` |
| Sign In (`sign-in`) | [✅](pages/sign-in/default.html) | ➖ | ➖ | [✅](pages/sign-in/error.html) |  |  |  |  |  | [✅](pages/sign-in/invalid.html) | [✅](pages/sign-in/submitting.html) |  |  |  |  | [✅](pages/sign-in/sent.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-037`, `L2-039`, `L2-041`, `L2-044`, `L2-045`, `L2-052` |
| Create Team (`create-team`) | [✅](pages/create-team/default.html) | ➖ | ➖ | [✅](pages/create-team/error.html) | [✅](pages/create-team/locating.html) | [✅](pages/create-team/found.html) | [✅](pages/create-team/not-found.html) | [✅](pages/create-team/lookup-unavailable.html) |  | [✅](pages/create-team/invalid.html) | [✅](pages/create-team/submitting.html) |  | [✅](pages/create-team/rate-limited.html) |  |  |  | [✅](pages/create-team/created.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-003`, `L2-004`, `L2-006`, `L2-037`, `L2-039`, `L2-044`, `L2-045`, `L2-053` |
| Invite Needed (`invite-needed`) | [✅](pages/invite-needed/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-038`, `L2-043`, `L2-052`, `L2-053` |
| Globe (`globe`) | [✅](pages/globe/default.html) | [✅](pages/globe/loading.html) | [✅](pages/globe/empty.html) | [✅](pages/globe/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/globe/selected.html) | [✅](pages/globe/selected-self.html) | [✅](pages/globe/selected-asleep.html) | [✅](pages/globe/pin-lifted.html) | [✅](pages/globe/just-joined.html) | [✅](pages/globe/group.html) | [✅](pages/globe/hundreds.html) | [✅](pages/globe/sharing-off.html) | [✅](pages/globe/quiet.html) | [✅](pages/globe/no-moments.html) | [✅](pages/globe/globe-unavailable.html) | [✅](pages/globe/fahrenheit-12-hour.html) | [✅](pages/globe/weather-unavailable.html) |  |  |  |  |  |  |  | `L2-005`, `L2-007`, `L2-008`, `L2-009`, `L2-010`, `L2-011`, `L2-012`, `L2-013`, `L2-014`, `L2-015`, `L2-016`, `L2-017`, `L2-018`, `L2-019`, `L2-021`, `L2-022`, `L2-023`, `L2-024`, `L2-025`, `L2-033`, `L2-034`, `L2-037`, `L2-038`, `L2-040`, `L2-049`, `L2-054` |
| Team (`team`) | [✅](pages/team/default.html) | [✅](pages/team/loading.html) | [✅](pages/team/empty.html) | [✅](pages/team/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/team/hundreds.html) |  |  |  |  |  | [✅](pages/team/weather-unavailable.html) | [✅](pages/team/working.html) | [✅](pages/team/asleep.html) | [✅](pages/team/no-results.html) | [✅](pages/team/edge.html) | [✅](pages/team/hundreds-no-match.html) |  |  | `L2-007`, `L2-014`, `L2-015`, `L2-016`, `L2-018`, `L2-019`, `L2-026`, `L2-027`, `L2-028`, `L2-037`, `L2-038`, `L2-044`, `L2-047`, `L2-049`, `L2-054`, `L2-056` |
| Moments (`moments`) | [✅](pages/moments/default.html) | [✅](pages/moments/loading.html) | [✅](pages/moments/empty.html) | [✅](pages/moments/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/moments/no-results.html) |  |  | [✅](pages/moments/filtered.html) |  | `L2-007`, `L2-020`, `L2-029`, `L2-030`, `L2-037`, `L2-038`, `L2-049`, `L2-054` |
| Profile & Settings (`profile`) | [✅](pages/profile/default.html) | [✅](pages/profile/loading.html) | ➖ | [✅](pages/profile/error.html) | [✅](pages/profile/locating.html) |  |  | [✅](pages/profile/lookup-unavailable.html) |  | [✅](pages/profile/invalid.html) |  |  | [✅](pages/profile/rate-limited.html) |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/profile/sharing-off.html) |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/profile/location-found.html) | `L2-007`, `L2-019`, `L2-022`, `L2-031`, `L2-032`, `L2-033`, `L2-034`, `L2-035`, `L2-036`, `L2-037`, `L2-038`, `L2-049`, `L2-054` |
| Left Team (`left-team`) | [✅](pages/left-team/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-036`, `L2-052`, `L2-053` |
| Not Found (`not-found`) | [✅](pages/not-found/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-038` |
| Brand: Logo & Wordmark (`brand`) | [✅](pages/brand/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-038`, `L2-041` |

### Dialogs

| Screen | default | busy | invalid | copy-failed | failed | Requirements |
|---|---|---|---|---|---|---|
| Invite teammates (`invite`) | [✅](dialogs/invite/default.html) | ➖ | ➖ | [✅](dialogs/invite/copy-failed.html) |  | `L2-039`, `L2-054`, `L2-055` |
| Leave the team (`leave-team`) | [✅](dialogs/leave-team/default.html) | [✅](dialogs/leave-team/busy.html) | ➖ |  | [✅](dialogs/leave-team/failed.html) | `L2-036`, `L2-039` |
| Leave without saving (`unsaved-changes`) | [✅](dialogs/unsaved-changes/default.html) | ➖ | ➖ |  |  | `L2-035`, `L2-039` |

### Notifications

| Screen | info | success | warning | danger | saving | Requirements |
|---|---|---|---|---|---|---|
| Save bar (`settings-bar`) | [✅](notifications/settings-bar/info.html) | [✅](notifications/settings-bar/success.html) | ➖ | [✅](notifications/settings-bar/danger.html) | [✅](notifications/settings-bar/saving.html) | `L2-035` |
| Invite link toast (`invite-link`) | ➖ | [✅](notifications/invite-link/success.html) | ➖ | [✅](notifications/invite-link/danger.html) |  | `L2-054` |
| Could not refresh (`refresh-banner`) | ➖ | ➖ | [✅](notifications/refresh-banner/warning.html) | ➖ |  | `L2-048`, `L2-049` |

<!-- coverage:end -->

## Checking and looking

```sh
python .claude/skills/writing-html-mocks/scripts/check_mocks.py docs/mocks --write   # regenerates index.html and the coverage above, then checks
python .claude/skills/writing-html-mocks/scripts/screenshot_mocks.py docs/mocks      # every mock at 360, 768 and 1280 px, light and dark, into docs/mocks/.cache/
```

The design system extracted from these mocks is in [`docs/design-system/`](../design-system/README.md). The mocks render through its tokens and component CSS, so a token changed there changes every mock.
