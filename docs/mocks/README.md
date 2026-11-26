# Mondino mocks

Static HTML mocks of every Mondino screen in every state: the five screens (Join, Globe, Team,
Moments, Profile & Settings), the pages that say one thing, the dialogs, the notifications, and
the brand sheet.
They are the design and the ultimate source of truth. `docs/design-system/`, `docs/specs/`, the
ADRs, `docs/detailed-designs/`, `AGENTS.md` and the code follow them.

They are transcribed from the **Mondino App** prototype in Magic Patterns (the *Global Teammate
Globe* OS; frames Join, Globe, Team, Moments and Profile & Settings, and its shared `Globe`,
`AppShell`, `OverlapBar`, pins, team and time code), as it stood on 26 November 2026: the cool
paper palette and the cartoon globe. The brand sheet, `pages/brand`, is the *Mondino Brand*
prototype's frame *Logo & Wordmark*, with the globe's colours added from the app's theme.

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
- **The viewer:** Sofia Bianchi, Milan, Italy (postal code 20121, shown only on her own Join and
  Profile & Settings).
- **Now:** Monday 27 October 2025, 14:05 UTC, which is 15:05 in Milan. Temperatures in °C and a
  24-hour clock unless a mock says otherwise.

| Teammate | City, country | Time zone | Local time | Status | From Sofia | Weather | Moment |
|---|---|---|---|---|---|---|---|
| Tomás Herrera | Mexico City, Mexico | America/Mexico_City | 08:05 | Early morning | 7 h behind | Partly cloudy, 22° | Holiday · Día de Muertos · 1 Nov |
| Jordan Lee | Austin, United States | America/Chicago | 09:05 | Working hours | 6 h behind | Partly cloudy, 24° | Local event · Halloween on 6th Street · 31 Oct |
| Chloé Martin | São Paulo, Brazil | America/Sao_Paulo | 11:05 | Working hours | 4 h behind | Showers, 26° | Formula 1 · São Paulo Grand Prix · 9 Nov |
| Liam O’Connor | Dublin, Ireland | Europe/Dublin | 14:05 | Working hours | 1 h behind | Rainy, 9° | Holiday · October Bank Holiday · today |
| Kwame Mensah | Accra, Ghana | Africa/Accra | 14:05 | Working hours | 1 h behind | Clear, 30° | Holiday · Farmers’ Day · 5 Dec |
| Sofia Bianchi (you) | Milan, Italy | Europe/Rome | 15:05 | Working hours | — | Foggy, 13° | Formula 1 · Monza tickets on sale · 12 Nov |
| Lena Fischer | Berlin, Germany | Europe/Berlin | 15:05 | Working hours | Same time | Cloudy, 8° | Local event · St. Martin’s lantern walk · 11 Nov |
| Mara Lindqvist | Stockholm, Sweden | Europe/Stockholm | 15:05 | Working hours | Same time | Cloudy, 6° | Holiday · Alla helgons dag · 1 Nov |
| Ahmed Al-Sayed | Dubai, United Arab Emirates | Asia/Dubai | 18:05 | Evening | 3 h ahead | Clear, 32° | Holiday · UAE National Day · 2 Dec; Formula 1 · Abu Dhabi Grand Prix · 7 Dec |
| Priya Raman | Bengaluru, India | Asia/Kolkata | 19:35 | Evening | 4 h 30 min ahead | Stormy, 27° | Holiday · Karnataka Rajyotsava · 1 Nov |
| Aiko Tanaka | Tokyo, Japan | Asia/Tokyo | 23:05 | Probably asleep | 8 h ahead | Clear, 14° | Holiday · Culture Day · 3 Nov |
| Noah Williams | Melbourne, Australia | Australia/Melbourne | 01:05 Tue | Probably asleep | 10 h ahead | Windy, 18° | Sport · Melbourne Cup Day · 4 Nov |

So the Globe reads "12 teammates" and "12 time zones · 7 working · 2 asleep", and the Team
filters read "All 12", "Working now 7" and "Asleep 2". Seven moments fall this week: one today
(Dublin) and six in the next seven days. "Today" is the date in the moment's own place, so
Melbourne Cup Day is seven days off in Melbourne although it is eight days off in Milan.

A few states need something the cast cannot give at that hour, and say so in a note:

- **A smaller team** of Sofia, Mara and Liam: `globe/quiet` (23:30 in Milan, nobody in working
  hours, every kind of moment turned off) and `team/no-results` (mid-afternoon, no one asleep).
- **A team of one**, Sofia: `globe/empty`, `team/empty` and the invite link notifications.
- **Edges**, in `team/edge`: three more teammates with a very long name, a one-word name and a
  name typed as markup, on a 12-hour clock in °F.
- **A move**, in `profile/locating`, `location-found`, `invalid`, `lookup-unavailable` and
  `rate-limited`: Sofia types a Toronto postal code, M5V 2T6.
- **°F and the 12-hour clock**, the prototype's own controls, in `globe/fahrenheit-12-hour` and
  `team/edge`.
- **Sharing off**, in `globe/sharing-off`: Ahmed shares neither his weather nor when he is
  outside working hours.

## Where the mocks depart from the prototype, and why

| The prototype | The mocks | Why |
|---|---|---|
| A teammate's panel and the Team table show a postal code. | City and country only. | The design's own privacy copy: only the city is shown (L2-007). |
| A role under each name ("Growth marketer"). | No role. On Team the line under a name is the teammate's status in words. | Join asks for a name, a country and a postal code and nothing else, so there is no role to show; and a status is never given by colour alone (L2-015). |
| Offsets as "−7h", "+4h 30m". | "7 h behind", "4 h 30 min ahead", "Same time". | Read aloud and at a glance without a sign (L2-016). |
| A sun dot on a pin with a moment this week. | A moment marker with the kind's icon, larger and ringed when the moment is today. | A marker shows an emblem for the moment, and today's is stronger by more than colour (L2-021). |
| A selected pin's label is an ink chip with the time and weather. | A lifted pin, pointed at, focused or selected, shows name, city, local time, weather and its moment. | A lifted pin is how a teammate is read on a small globe (L2-012). |
| A "Message" button on a teammate’s panel, and "Schedule a message for Aiko’s morning" when a teammate is asleep. | No message button, in any status. | Mondino has no chat and no scheduler, so the button would lead nowhere. It is not built. |
| Today's moment adds "Liam is probably offline." | The moment's own detail and its teammate. | Mondino infers nothing about presence. |
| The globe fetches its land from a CDN and is drawn live with d3-geo. | A still SVG of the same cartoon globe, drawn into each mock. | Mocks open from disk with no network. |
| Fonts from Google Fonts. | Gabarito and Inter bundled in `assets/fonts/`. | Fonts are self-hosted, never from a CDN. |
| Pin (#e8532f) as text, and white initials on some teammate colours. | A darker pin for text and for the leave button, and seven teammate colours darkened. | 4.5:1 for text (L2-041). The pin itself, on the globe, keeps the brand's colour. |
| Inputs edged with the hairline colour. | A stronger edge on inputs, selects, buttons and chips. | 3:1 for the edge of a control (L2-041). |
| Light only. | Light and dark. Dark turns night into the canvas and paper into the ink; the globe keeps its colours. | Every mock is themed through tokens. Dark is this set's own proposal; see the open questions. |
| Sporting days off by default. | All four kinds of moment on. | All four are on to begin with (L2-022). |
| Tabs, filters and chips drawn about 30 px tall. | The same look, each with a 44 px touch target. | Every touch target is at least 44 × 44 px (L2-039). |

The prototype draws only the happy path of each frame and a few states (Join: default, locating,
found, error; Globe: default, empty; Profile & Settings: default, unsaved, saved). Every other
state here is new: loading, errors, an invite link that cannot be used, a full team, a rate
limit (on Join and on Profile & Settings), a lifted pin, a group pin, weather unavailable, the
still picture where the 3D globe cannot be drawn, the dialogs and the pages that say one thing.
Their copy is written for these mocks from the L2 requirements.

## The globe

The product's globe is a 3D model built in Blender (L2-008). The mocks draw it still, in the
prototype's cartoon look: a blue ocean with a deeper rim, green land with sand and forest, ice
caps, puffy clouds, a glossy shine, a hard drop shadow and an ink outline, with the night side
shaded in dusk from the sun's position at the cast's "now". They design the interface around the
globe and the look it aims for; which renderer draws it is decided in an ADR.

The globe's colours are tokens of their own (`--color-globe-*`, in the design system): ocean, land, sand, ice, cloud
and night. Pins and their labels are HTML over the picture, placed at the positions the
projection gives.

## Open questions and assumptions

1. **The palette.** The Mondino App prototype uses the palette the *Palette Variants* canvas
   calls "Current": navy ink and sea on a cool off-white with a warm orange pin. Fjord, Candy
   Pop and Lagoon are on that canvas as options and none has been applied to the app. The mocks
   use Current. Choosing another changes the primitives at the top of
   `docs/design-system/tokens/tokens.css` and nothing else.
2. **Sea.** Settled. Sea is the brand's navy and the globe has an ocean of its own, a bright
   blue with a deeper rim. L2-008 and the Design section of `AGENTS.md` say the same.
3. **"Invite teammate" and "Message".** Decided. "Invite teammate", in the header, copies the
   team's invite link to the clipboard and shows the same toast as the invite card
   (`notifications/invite-link`: "Invite link copied", or the refused copy); it opens nothing
   else. "Message" is removed from the mocks and is not built: Mondino has no chat.
4. **Dark theme.** Not in the prototype. It is drawn here because the mocks are themed; whether
   Mondino ships it is not decided.
5. **A count on a moment marker** when a teammate has two moments in the week (L2-021) is not
   drawn: no teammate in the cast has two in one week.
6. **A team of hundreds.** How the day ribbon, the globe and the Team list draw 500 teammates is
   not designed (L2-026, L2-047), so there is no `long` state.
7. **Time zones.** The Globe counts distinct IANA time zones, as the prototype does: twelve for
   the cast, worked out at 14:05 UTC. L2-025 and L2-028 use the same numbers.
8. **Sign-in and making a team** are not designed, so there is no screen for either. Someone in
   no team sees `no-team`.
9. **The Team filter** is a tab list and the Moments filter a set of pressed buttons, as L2-028
   and L2-030 word them.
10. **The initials on Join** are those of the five teammates who joined most recently, with
    their colours and nothing else: no name, no city.
11. **The countries on Join** are the supported list to begin with: Australia, Brazil, Canada,
    Germany, Ghana, India, Ireland, Italy, Japan, Mexico, Sweden, United Arab Emirates and the
    United States.
12. **Leaving.** `left-team` takes the team's name from the screen the teammate left from;
    opened or reloaded without it, its title reads "You’ve left the team". Someone with no
    team who opens a screen sees `no-team` in place.
13. **Selecting a teammate** from a row, a ribbon marker or a moment opens the Globe with that
    pin selected. In the mocks those links lead to the nearest drawn state: Tomás, Sofia, Noah
    and Ahmed have their own, and every other teammate leads to Tomás's.

## Coverage

<!-- coverage:start -->

Legend: ✅ mock exists · ➖ not applicable (reason in manifest) · ❌ missing

### Pages

| Screen | default | loading | empty | error | locating | found | not-found | lookup-unavailable | invalid | submitting | join-failed | rate-limited | team-full | invite-unusable | selected | selected-self | selected-asleep | pin-lifted | just-joined | group | sharing-off | quiet | globe-unavailable | fahrenheit-12-hour | weather-unavailable | working | asleep | no-results | edge | filtered | location-found | Requirements |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Join (`join`) | [✅](pages/join/default.html) | [✅](pages/join/loading.html) | ➖ | [✅](pages/join/error.html) | [✅](pages/join/locating.html) | [✅](pages/join/found.html) | [✅](pages/join/not-found.html) | [✅](pages/join/lookup-unavailable.html) | [✅](pages/join/invalid.html) | [✅](pages/join/submitting.html) | [✅](pages/join/join-failed.html) | [✅](pages/join/rate-limited.html) | [✅](pages/join/team-full.html) | [✅](pages/join/invite-unusable.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-001`, `L2-002`, `L2-003`, `L2-004`, `L2-005`, `L2-006`, `L2-037`, `L2-045`, `L2-049` |
| Globe (`globe`) | [✅](pages/globe/default.html) | [✅](pages/globe/loading.html) | [✅](pages/globe/empty.html) | [✅](pages/globe/error.html) |  |  |  |  |  |  |  |  |  |  | [✅](pages/globe/selected.html) | [✅](pages/globe/selected-self.html) | [✅](pages/globe/selected-asleep.html) | [✅](pages/globe/pin-lifted.html) | [✅](pages/globe/just-joined.html) | [✅](pages/globe/group.html) | [✅](pages/globe/sharing-off.html) | [✅](pages/globe/quiet.html) | [✅](pages/globe/globe-unavailable.html) | [✅](pages/globe/fahrenheit-12-hour.html) | [✅](pages/globe/weather-unavailable.html) |  |  |  |  |  |  | `L2-005`, `L2-008`, `L2-009`, `L2-010`, `L2-011`, `L2-012`, `L2-013`, `L2-014`, `L2-015`, `L2-016`, `L2-017`, `L2-018`, `L2-019`, `L2-021`, `L2-022`, `L2-023`, `L2-024`, `L2-025`, `L2-033`, `L2-034`, `L2-037`, `L2-038`, `L2-040`, `L2-049` |
| Team (`team`) | [✅](pages/team/default.html) | [✅](pages/team/loading.html) | [✅](pages/team/empty.html) | [✅](pages/team/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/team/weather-unavailable.html) | [✅](pages/team/working.html) | [✅](pages/team/asleep.html) | [✅](pages/team/no-results.html) | [✅](pages/team/edge.html) |  |  | `L2-007`, `L2-014`, `L2-015`, `L2-016`, `L2-018`, `L2-019`, `L2-026`, `L2-027`, `L2-028`, `L2-037`, `L2-038`, `L2-044`, `L2-049` |
| Moments (`moments`) | [✅](pages/moments/default.html) | [✅](pages/moments/loading.html) | [✅](pages/moments/empty.html) | [✅](pages/moments/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/moments/no-results.html) |  | [✅](pages/moments/filtered.html) |  | `L2-007`, `L2-020`, `L2-029`, `L2-030`, `L2-037`, `L2-038`, `L2-049` |
| Profile & Settings (`profile`) | [✅](pages/profile/default.html) | [✅](pages/profile/loading.html) | ➖ | [✅](pages/profile/error.html) | [✅](pages/profile/locating.html) |  |  | [✅](pages/profile/lookup-unavailable.html) | [✅](pages/profile/invalid.html) |  |  | [✅](pages/profile/rate-limited.html) |  |  |  |  |  |  |  |  | [✅](pages/profile/sharing-off.html) |  |  |  |  |  |  |  |  |  | [✅](pages/profile/location-found.html) | `L2-007`, `L2-019`, `L2-022`, `L2-031`, `L2-032`, `L2-033`, `L2-034`, `L2-035`, `L2-036`, `L2-037`, `L2-038`, `L2-049` |
| Left the team (`left-team`) | [✅](pages/left-team/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-036` |
| Invite link needed (`no-team`) | [✅](pages/no-team/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-038`, `L2-043` |
| Not found (`not-found`) | [✅](pages/not-found/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-038` |
| Brand: Logo & Wordmark (`brand`) | [✅](pages/brand/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-038`, `L2-041` |

### Dialogs

| Screen | default | busy | invalid | failed | Requirements |
|---|---|---|---|---|---|
| Leave the team (`leave-team`) | [✅](dialogs/leave-team/default.html) | [✅](dialogs/leave-team/busy.html) | ➖ | [✅](dialogs/leave-team/failed.html) | `L2-036`, `L2-039` |
| Leave without saving (`unsaved-changes`) | [✅](dialogs/unsaved-changes/default.html) | ➖ | ➖ |  | `L2-035`, `L2-039` |

### Notifications

| Screen | info | success | warning | danger | saving | Requirements |
|---|---|---|---|---|---|---|
| Save bar (`settings-bar`) | [✅](notifications/settings-bar/info.html) | [✅](notifications/settings-bar/success.html) | ➖ | [✅](notifications/settings-bar/danger.html) | [✅](notifications/settings-bar/saving.html) | `L2-035` |
| Invite link copied (`invite-link`) | ➖ | [✅](notifications/invite-link/success.html) | ➖ | [✅](notifications/invite-link/danger.html) |  | `L2-025` |
| Could not refresh (`refresh-banner`) | ➖ | ➖ | [✅](notifications/refresh-banner/warning.html) | ➖ |  | `L2-048`, `L2-049` |

<!-- coverage:end -->

## Checking and looking

```sh
python .claude/skills/writing-html-mocks/scripts/check_mocks.py docs/mocks --write   # regenerates index.html and the coverage above, then checks
python .claude/skills/writing-html-mocks/scripts/screenshot_mocks.py docs/mocks      # every mock at 360, 768 and 1280 px, light and dark, into docs/mocks/.cache/
```

The design system extracted from these mocks is in [`docs/design-system/`](../design-system/README.md). The mocks render through its tokens and component CSS, so a token changed there changes every mock.
