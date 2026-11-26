# Mondino design system

Extracted from [docs/mocks](../mocks/README.md) on 26 November 2026, as the mocks were transcribed again from the second pass of the Mondino App prototype in Magic Patterns. Open [index.html](index.html) locally; nothing needs a server or a network.

The mocks are the design and the source of truth. This system is what they already decided, written down once: the tokens, the component CSS, and a page for every foundation, component and pattern. The mocks render through this system's `tokens.css` and `components.css`, so the two cannot drift apart.

It holds 12 foundations, 38 components and 8 patterns, extracted from 82 mocks of 17 screens. Light and dark are both designed: dark is the prototype's own dark theme, and in it the globe is the same picture a little deeper, with a light outline.

## Foundations

| Page | Covers |
|---|---|
| [Colour](foundations/color.html) | Paper, ink, pin, sun, leaf, the globe in light and in dark; 13 teammate colours; both themes; contrast |
| [Typography](foundations/typography.html) | Gabarito and Inter, the roles, tabular figures |
| [Spacing](foundations/spacing.html) | The 4 px scale and component sizes |
| [Layout](foundations/layout.html) | Breakpoints, the grid, each screen’s template |
| [Elevation](foundations/elevation.html) | Shadows, surfaces, layers |
| [Shape](foundations/shape.html) | Radii and borders |
| [Motion](foundations/motion.html) | Durations, the globe, reduced motion |
| [Iconography](foundations/iconography.html) | Weather, moments, interface icons |
| [Theming](foundations/theming.html) | Token tiers, light and the prototype’s own dark, tokens.json |
| [Responsive](foundations/responsive.html) | What each component does at each width |
| [Accessibility](foundations/accessibility.html) | The WCAG 2.2 AA commitments |
| [Content](foundations/content.html) | Vocabulary, style, numbers, microcopy |

## Components

| Component | Variants | States | Source mocks |
|---|---|---|---|
| [Button](components/button.html) | Primary, secondary, danger, link-style, icon-only; On inverse, on the save bar; Block: the full width of its container | Default, Hover, Focus, Active, Disabled, Busy | `pages/join/found`, `pages/sign-in/default`, `pages/globe/error`, `pages/globe/selected`, `dialogs/leave-team/default`, `dialogs/invite/default`, `pages/profile/default`, `notifications/settings-bar/info` |
| [Link](components/link.html) | Inline: the other way in, under a form, and “Choose moments” in a note. Standalone with an arrow: “All moments”, “2 more on the Team page”. | Default, Hover, Focus | `pages/globe/default`, `pages/globe/quiet`, `pages/join/default`, `pages/sign-in/default` |
| [Segmented control](components/segmented-control.html) | Navigation: links with aria-current="page"; Filter: tabs with counts; Setting: radios. The chosen one carries a tick as well as the fill. | Default, Hover, Focus, Chosen | `pages/team/default`, `pages/profile/default`, `pages/globe/default` |
| [Text field](components/text-field.html) | Text, and a postal code with tabular figures; An email: type="email", with the email keyboard on a phone; With an icon at its start (.input-wrap): a city search; Search (.input--search): a pill, 44 px tall, above a large team | Default, Focus, Invalid, Read-only | `pages/join/default`, `pages/join/invalid`, `pages/join/submitting`, `pages/join/lookup-unavailable`, `pages/profile/default`, `pages/sign-in/default`, `pages/create-team/default`, `pages/team/hundreds` |
| [Select](components/select.html) | One | Default, Focus, Invalid, Disabled | `pages/join/default`, `pages/profile/locating` |
| [Form field](components/form-field.html) | Field row: country and postal code share a row from 576 px; With an error; Field row with an action: “Look up” beside the postal code, on Profile & Settings; With help: a line under the control; With an icon at the start of the control (.input-wrap): “Your city”, which takes the postal code’s place on Join while the lookup is down | Default, Invalid | `pages/join/invalid`, `pages/join/default`, `pages/profile/default`, `pages/create-team/default`, `pages/join/lookup-unavailable` |
| [Lookup message](components/lookup-message.html) | On Join and Create Team: private, finding, found, not found; On Profile & Settings: found, and not found. Both say what happens to the pin. | — | `pages/join/default`, `pages/join/locating`, `pages/join/found`, `pages/join/not-found`, `pages/create-team/default`, `pages/profile/location-found`, `pages/profile/invalid` |
| [Copy field](components/copy-field.html) | In the invite dialog: with a visible label, on the canvas colour; On Create Team: named by aria-label, on the surface colour | Default, Copying was refused: the link selected and focused | `dialogs/invite/default`, `dialogs/invite/copy-failed`, `pages/create-team/created` |
| [Switch](components/switch.html) | With a moment’s emblem (on, and off), and with a hint: the two things a teammate shares; Off: the hint changes to say what teammates see instead | Off, On, Focus | `pages/profile/default`, `pages/profile/sharing-off`, `pages/globe/sharing-off` |
| [Chip](components/chip.html) | The Moments filter | Default, Hover, Focus, Pressed | `pages/moments/default`, `pages/moments/filtered`, `pages/moments/no-results` |
| [Avatar](components/avatar.html) | Single, and a group with rings | — | `pages/team/default`, `pages/globe/selected`, `pages/join/default`, `pages/moments/default` |
| [Status](components/status.html) | Early morning 07:00–08:59, Working hours 09:00–17:59, Evening 18:00–22:59, Probably asleep 23:00–06:59; Dot beside a local time: always with the status in words nearby | — | `pages/globe/selected`, `pages/globe/selected-asleep`, `pages/team/default`, `pages/globe/sharing-off`, `pages/profile/sharing-off` |
| [Emblem](components/emblem.html) | The four kinds on soft sun; solid for today or a card; plain when a kind is switched off | — | `pages/globe/default`, `pages/moments/default`, `pages/profile/default`, `pages/brand/default` |
| [Card](components/card.html) | Invite card: raised, over the globe; Pin card: flat, with a small globe | — | `pages/globe/empty`, `pages/profile/default`, `pages/team/empty` |
| [Dialog](components/dialog.html) | Invite: a close button, the invite link in a copy field, and a foot with the team’s count and “Reset link”; Destructive, an alert dialog: a danger button, focus on “Stay”; Confirm, an alert dialog: the safe choice is primary and takes focus | Default, Busy, Failed, Copying was refused | `dialogs/invite/default`, `dialogs/invite/copy-failed`, `dialogs/leave-team/default`, `dialogs/leave-team/busy`, `dialogs/leave-team/failed`, `dialogs/unsaved-changes/default` |
| [Toast](components/toast.html) | Success (the invite link was copied; you have just joined), and failure | — | `notifications/invite-link/success`, `notifications/invite-link/danger`, `dialogs/invite/copy-failed`, `pages/globe/just-joined` |
| [Alert](components/alert.html) | Warning with an action; warning with a countdown; danger; and a form’s error summary; Banner: across the top of a screen | — | `pages/profile/lookup-unavailable`, `pages/join/rate-limited`, `pages/profile/rate-limited`, `pages/join/join-failed`, `pages/join/invalid`, `pages/sign-in/error`, `pages/create-team/error`, `dialogs/leave-team/failed`, `pages/team/weather-unavailable`, `notifications/refresh-banner/warning` |
| [Save bar](components/save-bar.html) | Unsaved, saving, saved, could not save | — | `notifications/settings-bar/info`, `notifications/settings-bar/saving`, `notifications/settings-bar/success`, `notifications/settings-bar/danger` |
| [Skeleton](components/skeleton.html) | Title, text, pill, control, and a composed row | — | `pages/globe/loading`, `pages/team/loading`, `pages/moments/loading`, `pages/profile/loading`, `pages/join/loading` |
| [Spinner](components/spinner.html) | In a message, and in a busy button | — | `pages/join/locating`, `pages/join/submitting`, `notifications/settings-bar/saving`, `dialogs/leave-team/busy` |
| [Empty state](components/empty-state.html) | Nothing yet: Moments with nothing in the next 90 days; Could not load: the Globe; A filter or a search found nothing: a title, a line and a button that clears it, with the filter still in view; A team of one, on Team: a card that asks for one thing; In the Globe’s panel, when every kind of moment is switched off: a note with a way to turn some back on | — | `pages/globe/error`, `pages/team/error`, `pages/moments/error`, `pages/profile/error`, `pages/moments/empty`, `pages/moments/no-results`, `pages/team/no-results`, `pages/team/hundreds-no-match`, `pages/team/empty`, `pages/globe/quiet` |
| [Skip link](components/skip-link.html) | One | Hidden, Focused | `pages/globe/default` |
| [App header](components/app-header.html) | A tab current; Profile & Settings current: the avatar is ringed; On a phone, drawn at 360 px: the mark without the wordmark, and “Invite teammate” as an icon with the same accessible name | — | `pages/globe/default`, `pages/profile/default`, `pages/globe/hundreds`, `dialogs/invite/default` |
| [Auth](components/auth.html) | Sign In: one field and one button, beside a globe with no pins; Create Team: the form column, with five fields, help under the email and the privacy line under the postal code; Create Team, once the team is made: a kicker, a title, the invite link in a copy field, and one action; A notice in the form’s place: a link was sent; the invite link no longer works; the invite could not be opened; the team is full | — | `pages/sign-in/default`, `pages/sign-in/invalid`, `pages/sign-in/submitting`, `pages/sign-in/error`, `pages/sign-in/sent`, `pages/create-team/default`, `pages/create-team/invalid`, `pages/create-team/submitting`, `pages/create-team/error`, `pages/create-team/created`, `pages/join/default`, `pages/join/invite-unusable`, `pages/join/error`, `pages/join/team-full` |
| [Notice page](components/notice-page.html) | Left Team, Invite Needed and Not Found. Each has the small globe above its title, as under Anatomy; it is left out here. | — | `pages/left-team/default`, `pages/invite-needed/default`, `pages/not-found/default` |
| [Logo](components/logo.html) | On paper; On ink; App icon: the mark reversed out of ink, and on pin | — | `pages/brand/default`, `pages/join/default`, `pages/globe/default` |
| [Globe](components/globe.html) | With the team’s pins: Globe; Nameless pins on Join; one pin on Profile & Settings; the placeholder while it loads; The legend: the night side, a moment this week, teammates close together (a group pin), and how to turn it | Turning, Holding on a pin, Loading, Still picture | `pages/globe/default`, `pages/globe/selected`, `pages/globe/group`, `pages/globe/hundreds`, `pages/globe/loading`, `pages/globe/globe-unavailable`, `pages/join/default`, `pages/sign-in/default`, `pages/profile/default`, `pages/invite-needed/default` |
| [Pin](components/pin.html) | A teammate; you (an ink ring); with today’s moment; a group pin (two teammates in one city, and 68 across three cities); a nameless pin on Join; your pin on Join | At rest, Pointed at, Focused, Selected, New | `pages/globe/default`, `pages/globe/pin-lifted`, `pages/globe/selected`, `pages/globe/just-joined`, `pages/globe/group`, `pages/globe/hundreds`, `pages/join/found` |
| [Pin label](components/pin-label.html) | At rest by day; at night (the night icon); time only, when weather is not shared or unavailable; lifted | At rest, Lifted | `pages/globe/default`, `pages/globe/pin-lifted`, `pages/globe/weather-unavailable`, `pages/globe/fahrenheit-12-hour`, `pages/globe/hundreds` |
| [Moment marker](components/moment-marker.html) | The four kinds, this week; today; and a count, when a pin has two or more moments this week | — | `pages/globe/default`, `pages/globe/pin-lifted`, `pages/globe/quiet` |
| [Panel row](components/panel-row.html) | A moment (solid emblem when it is today), and a teammate with their local time | Default, Hover, Focus | `pages/globe/default`, `pages/globe/group`, `pages/globe/hundreds`, `pages/globe/quiet` |
| [Teammate panel](components/person-panel.html) | On the night side: Melbourne’s own day, the night form of the weather, and no shared working hours; Your own panel: “(you)”, and no offset or overlap; A group pin selected: the count, where they are, a close button, then a block per city with its local time and its teammates | Shares everything, Weather unavailable, Shares neither | `pages/globe/selected`, `pages/globe/selected-self`, `pages/globe/selected-asleep`, `pages/globe/sharing-off`, `pages/globe/weather-unavailable`, `pages/globe/group` |
| [Moment card](components/moment-card.html) | Cards, stacked in a panel; Pills, in the Team table | — | `pages/globe/selected`, `pages/globe/sharing-off`, `pages/team/default` |
| [Moment row](components/moment-row.html) | Today’s moment; Rows in a group | Default, Hover, Focus | `pages/moments/default`, `pages/moments/filtered`, `pages/moments/loading` |
| [Overlap bar](components/overlap-bar.html) | Two hours shared; No shared working hours | — | `pages/globe/selected`, `pages/globe/selected-asleep`, `pages/globe/fahrenheit-12-hour` |
| [Day ribbon](components/day-ribbon.html) | A small team: each teammate is a marker, and one row is enough; A large team, past 40 teammates: a bar for each half hour, the count over the tallest, and how many are in working hours | Marker, Marker, hover, Marker, focus | `pages/team/default`, `pages/team/edge`, `pages/team/empty`, `pages/team/hundreds` |
| [Team table](components/team-table.html) | Rows: a teammate, you, and someone asleep (night icon); Weather unavailable: the cell says so; times and status stay; A large team: the search beside the filter, the column headings once, and a section per city (two of Honolulu’s four rows shown here) | Default, Hover | `pages/team/default`, `pages/team/working`, `pages/team/asleep`, `pages/team/weather-unavailable`, `pages/team/edge`, `pages/team/hundreds`, `pages/team/hundreds-no-match` |
| [City section](components/city-section.html) | Under the shared column headings: a city open (two of Honolulu’s four rows shown here), and two closed | Closed, Open, Hover, Focus | `pages/team/hundreds`, `pages/team/hundreds-no-match` |

Components from the skill's core set that Mondino does not have, and so are not documented: menu, textarea, checkbox, slider, date picker, file upload, sidebar, breadcrumb, pagination, stepper, drawer, popover, tooltip, progress bar. None appears in a mock, and the product stays small on purpose. One is added here when a mock first needs it. Two that the mocks now draw have no page of their own: the combobox (“Your city”, on Join while the postal code lookup is down) is documented on [Text field](components/text-field.html) and [Form field](components/form-field.html), and the disclosure that the core set calls an accordion is the [City section](components/city-section.html).

## Patterns

| Pattern | Covers |
|---|---|
| [Forms](patterns/forms.html) | Mondino has four forms: joining a team, signing in, making a team, and your own settings. All ask for very little and lose nothing. |
| [Feedback and loading](patterns/feedback-and-loading.html) | Every action answers at once, where the teammate is looking, and waiting always says what it is waiting for. |
| [Empty and error states](patterns/empty-and-error-states.html) | What Mondino says when there is nothing to show, when a filter or a search found nothing, when it could not load, and when a screen is not for this person. |
| [Navigation and page structure](patterns/navigation-and-page-structure.html) | A handful of screens and one header. The whole app stays this small. |
| [Dialogs and overlays](patterns/dialogs-and-overlays.html) | Mondino interrupts three times only. Everything else happens in place. |
| [Data tables and lists](patterns/data-tables-and-lists.html) | How Mondino lists teammates and moments: in an order that means something, with a row that opens the globe, at any size of team. |
| [Notifications](patterns/notifications.html) | Mondino sends one thing, the sign-in link a teammate asks for. Everything else it tells you on the screen you are looking at. |
| [Content and tone](patterns/content-and-tone.html) | A small, warm product about people far apart. It speaks plainly and never claims to know more than a clock and a calendar can tell. |

## Tokens

- `tokens/tokens.css` is the source of truth: primitives, semantic tokens, light and dark.
- `tokens/tokens.json` is the same tokens in the W3C Design Tokens format, generated from it.
- `tokens/contrast-pairs.json` lists every foreground and background pairing a component relies on; all are checked in both themes.
- `assets/components.css` is the component CSS, with component tokens (`--btn-*`, `--field-*`, `--pin-*`, `--dialog-*`, `--toast-*`) that alias semantic ones.
- `assets/fonts/` holds Gabarito and Inter (SIL Open Font License).
- A teammate's own colour is one of 13 (`--palette-teammate-1` to `-13`, set by `.hue-1` to `.hue-13`); each holds 4.5:1 under white initials.

## Changelog

### 26 November 2026: the mocks transcribed again from the prototype's second pass

Page URLs and existing token names are unchanged. Values are in `tokens/tokens.css`.

**Tokens changed (dark theme).** Dark was this system's own; it is now the prototype's.

| Token | Change |
|---|---|
| `--palette-night-surface`, `-raised`, `-line`, `-line-strong`, `-muted`, `-fg` | New values: the prototype's dark surface, hairline, control edge, muted text and ink. `-raised` stays the mocks' own step. |
| `--palette-night-canvas` | New: the prototype's dark paper. In dark, `--color-bg-canvas` and `--color-bg-surface-sunken` point at it; they pointed at `--palette-night`. |
| `--palette-pin-light`, `--palette-pin-deep`, `--palette-sun-deep`, `--palette-leaf-light`, `--palette-leaf-deep` | New values: the prototype's dark pin-ink, pin-soft, sun-soft, leaf and leaf-soft. |
| `--palette-pin-dark`, `--palette-sun-dark` | New. In dark, `--color-people` and `--color-moment` point at them, a step brighter than in light. |
| `--color-working` (dark) | Points at `--palette-leaf-light`; it pointed at `--palette-leaf`. |
| `--palette-ocean-dark`, `-ocean-deep-dark`, `-grass-dark`, `-grass-deep-dark`, `-sand-dark`, `-ice-dark`, `-cloud-dark`, `-dusk-dark` | New: the globe in dark. Every `--color-globe-*` role points at them in dark; the globe was the same in both themes. |
| `--color-globe-outline`, `--color-globe-shadow` (dark) | The outline is the dark ink, a light line; it was night. The shadow is softer. |

**Tokens added.** `--palette-teammate-13` (with `.hue-13`), `--layout-notice-art`, `--layout-search-width`, `--ribbon-density-height`.

**Components added.** [Auth](components/auth.html), [Notice page](components/notice-page.html), [Copy field](components/copy-field.html), [City section](components/city-section.html).

**Components changed.**

| Component | Change |
|---|---|
| App header | “Invite teammate” opens the invite dialog, and is an icon alone under 768 px with the same accessible name. The header tightens under 416 px and again under 360 px. The bare header is in no mock. |
| Dialog | A third dialog, the invite dialog, with a close button, a label and a foot (`dialog__close`, `dialog__label`, `dialog__meta`). Leaving the team and leaving unsaved changes are `role="alertdialog"`. New copy throughout. |
| Toast | A failure (`toast--danger`) is a raised surface with a pin edge and a danger icon, not ink. One paragraph in place of a title and a line. A third toast, “You’re on the map.” |
| Pin, Pin label, Globe | Pins that would cover each other are one group pin with a count at every globe size; nothing fans out. The legend gains “Teammates close together” (`legend-swatch--group`). The still picture keeps its pins (`globe-screen__still`). The globe has dark colours. |
| Moment marker | Two or more moments this week show their count (`moment-marker--count`). |
| Teammate panel, Panel row | A selected group pin lists its teammates by city, with a close button (`panel__head`, `panel__city`). A teammate who shares neither weather nor status has a private note (`panel__note`) and no working-hours overlap. Lists stop at six, with a count beside “In working hours now” (`panel__count`). The “Message” button, which was never in the mocks, is gone from the page. |
| Day ribbon | Past 40 teammates it is a bar chart of how many teammates are at each half hour (`day-ribbon__track--density`, `__bars`, `__bar`, `__bar-count`, `__summary`, `__scroll`). |
| Team table | The offset column is “Compared to you”. A large team has a search and a section per city (`team-head`, `section-head__tools`, `input--search`). |
| Empty state | A filter or search that found nothing has a title, a line and a button (`list-note__title`). A team of one on Team has a card (`invite-prompt`). The pages that say one thing moved to Notice page. |
| Form field, Text field, Lookup message | Help under a field; “Look up” at the end of the postal code’s row on Profile & Settings (`field-row__action`); a field with an icon at its start (`input-wrap`); “Your city” while the lookup is down; a work email. |
| Alert, Save bar, Switch, Status, Link, Card, Button | New copy. The second sharing switch is “Share whether I’m working or asleep”; off, it hides status at every hour. No mock uses the information alert. |

**Copy.** An offset reads “7h behind”, “4h 30m ahead”, “Same time”. An error's title names what did not load: “The globe didn’t load”. The cast is 13: “13 teammates”, “12 time zones · 8 working · 2 asleep”.

**Contrast pairs added.** Initials on teammate colour 13; the icon and the pin edge of a failure toast; text and band labels on the day ribbon's working-hours band; the globe's outline against the page.

## Drift found in the mocks

| Mock | Issue | Resolution |
|---|---|---|
| `notifications/invite-link/*`, `notifications/settings-bar/*` (dark) | The sun icon on a toast and the save bar fell to 1.7:1 on the paper surface they have in dark. | New token `--color-fg-inverse-accent`: sun in light, a deeper sun in dark. |
| `assets/ui.css` | 11 px and 10 px text written as raw sizes in seven places. | Tokens `--font-size-2xs` and `--font-size-3xs`, kept for a pin's initials, a pin label and marks under a bar. |
| `assets/ui.css` | Icon sizes of 14 px, 12 px and 10 px written raw. | Tokens `--icon-size-xs` and `--icon-size-2xs`; 12 px snapped to `--space-3`. |
| `assets/ui.css` | A 2 px radius used four times beside the 4 px one. | Folded into `--radius-sm`; the scale is five radii and full. |
| `assets/ui.css` | Widths written raw: the short field (11 rem), dialog and save bar (28 rem), toast (26 rem), invite card (20 rem), a notice (30 rem). | Tokens `--layout-field-short`, `--layout-overlay-max` (toast snapped to it), `--layout-invite-card-width`; the notice uses `--layout-container-message`. |
| `assets/ui.css` | The danger button had no hover state for a still page, and buttons no active state. | `data-state` hooks and an active style added. |
| `assets/tokens.css` | Light values applied only at `:root`, so a light sample inside a dark page stayed dark. | The light block is `:root, [data-theme="light"]`. |
| `pages/brand/default` | The brand sheet's layout lived in the component kit. | It stays in `docs/mocks/assets/ui.css` as that page's own layout; mark sizes, the app icon and still pins moved into the system. |
| `assets/components.css` | Component tokens (`--btn-*`, `--toast-*`, `--dialog-*`, …) were declared at `:root` only, so a dark sample inside a light page kept the light values: in the side-by-side theme panels a primary button and a toast were drawn in the wrong theme. | They are declared at `:root, [data-theme]`, so they resolve again inside any themed scope. |
| `components/person-panel`, `components/button` (this system) | Both pages showed the prototype's “Message” button, which no mock has drawn. | Removed from both; the button page shows buttons the mocks draw. |
| `assets/components.css` | `.app-header--bare` and `.empty--left` are in no mock since the pages before a team and the pages that say one thing were redrawn. | Left in the stylesheet, undocumented; remove them when the mocks' kit drops them. |
| `pages/team/hundreds` | The line under a city's 50th teammate (`.city-section__more`) is styled and described in the mock's note, but no mock draws it. | Documented as a class on City section, without a specimen. |
| `pages/globe/selected`, `pages/moments/default` | The sport moment “Clásico Nacional” is drawn with a trophy on its moment card and its Moments row, and with the sport kind's own icon on the Globe's panel row. | Not resolved here. A kind has one icon; Iconography lists the kind's own. |

Drift between the Magic Patterns prototype and the mocks (a postal code on another teammate's panel, pin as text under 4.5:1, hairline input edges, a status shown by a dot alone, the prototype's “No Mondino account uses…” on Sign In, its plans and admins, and so on) was corrected when the mocks were written and is listed in [the mocks' README](../mocks/README.md).

Found while documenting and left as it is: a selected pin's ring (pin) is low in contrast against the globe's ocean. Selection does not depend on it: the pin is larger, lifted, shadowed and labelled, and exposes `aria-pressed`. The day ribbon's bars are ink at three-quarter strength; over every band they stay well above 3:1 in both themes.

Still open, carried from the mocks: what “Reset link” asks before it acts; what an emailed sign-in link shows once it has expired or been used; how a teammate who joined by invite link, and so gave no email, signs in again. None is documented here before its design exists.

## Verification

Run on 26 November 2026:

| Check | Command | Result |
|---|---|---|
| Contrast, both themes | `python .claude/skills/extracting-design-systems/scripts/check_contrast.py docs/design-system/tokens/tokens.css --pairs docs/design-system/tokens/contrast-pairs.json` | 128 passed, 0 failed, 0 unresolved |
| Structure, sections, tokens-only colour, links | `python .claude/skills/extracting-design-systems/scripts/check_design_system.py docs/design-system` | 59 pages (38 components, 8 patterns), 0 errors, 0 warnings |
| Mocks, rendering through this system | `python .claude/skills/writing-html-mocks/scripts/check_mocks.py docs/mocks` | 17 screens, 82 mocks, 0 errors, 0 warnings |
| `tokens.json` | Generated again from `tokens.css` and compared | Identical |
| Pages in a browser | Headless Chromium at 320, 360, 768 and 1280 px, light and dark | All 59 pages opened at the four widths in both themes: no page error, no failed request, no sideways scroll, no token without a value, and every live contrast ratio on the pages passes. Looked at by eye: Auth, City section, App header and Day ribbon (light), Notice page (dark), Toast (both). |

To regenerate `tokens.json` after changing a token:

```sh
python .claude/skills/extracting-design-systems/scripts/tokens_to_json.py docs/design-system/tokens/tokens.css
```
