# Mondino design system

Extracted from [docs/mocks](../mocks/README.md) on 26 November 2026. Open [index.html](index.html) locally; nothing needs a server or a network.

The mocks are the design and the source of truth. This system is what they already decided, written down once: the tokens, the component CSS, and a page for every foundation, component and pattern. The mocks render through this system's `tokens.css` and `components.css`, so the two cannot drift apart.

## Foundations

| Page | Covers |
|---|---|
| [Colour](foundations/color.html) | Paper, ink, pin, sun, leaf, the globe; both themes; contrast |
| [Typography](foundations/typography.html) | Gabarito and Inter, the roles, tabular figures |
| [Spacing](foundations/spacing.html) | The 4 px scale and component sizes |
| [Layout](foundations/layout.html) | Breakpoints, the grid, each screen’s template |
| [Elevation](foundations/elevation.html) | Shadows, surfaces, layers |
| [Shape](foundations/shape.html) | Radii and borders |
| [Motion](foundations/motion.html) | Durations, the globe, reduced motion |
| [Iconography](foundations/iconography.html) | Weather, moments, interface icons |
| [Theming](foundations/theming.html) | Token tiers, light and dark, tokens.json |
| [Responsive](foundations/responsive.html) | What each component does at each width |
| [Accessibility](foundations/accessibility.html) | The WCAG 2.2 AA commitments |
| [Content](foundations/content.html) | Vocabulary, style, numbers, microcopy |

## Components

| Component | Variants | States | Source mocks |
|---|---|---|---|
| [Button](components/button.html) | Primary, secondary, danger, link-style, icon-only; On inverse, on the save bar; Block: the full width of its container | Default, Hover, Focus, Active, Disabled, Busy | `pages/join/found`, `pages/globe/selected`, `dialogs/leave-team/default`, `notifications/settings-bar/info` |
| [Link](components/link.html) | Inline, and standalone with an arrow | Default, Hover, Focus | `pages/globe/default`, `pages/globe/quiet`, `pages/globe/globe-unavailable` |
| [Segmented control](components/segmented-control.html) | Navigation: links with aria-current="page"; Filter: tabs with counts; Setting: radios. The chosen one carries a tick as well as the fill. | Default, Hover, Focus, Chosen | `pages/team/default`, `pages/profile/default`, `pages/globe/default` |
| [Text field](components/text-field.html) | Text, and a postal code with tabular figures | Default, Focus, Invalid, Read-only | `pages/join/default`, `pages/join/invalid`, `pages/join/submitting`, `pages/profile/default` |
| [Select](components/select.html) | One | Default, Focus, Invalid, Disabled | `pages/join/default`, `pages/profile/locating` |
| [Form field](components/form-field.html) | Field row: country and postal code share a row from 576 px; With an error | Default, Invalid | `pages/join/invalid`, `pages/join/default`, `pages/profile/default` |
| [Lookup message](components/lookup-message.html) | Private, finding, found, not found | — | `pages/join/default`, `pages/join/locating`, `pages/join/found`, `pages/join/not-found`, `pages/profile/location-found` |
| [Switch](components/switch.html) | With a moment’s emblem, and with a hint | Off, On, Focus | `pages/profile/default`, `pages/profile/sharing-off` |
| [Chip](components/chip.html) | The Moments filter | Default, Hover, Focus, Pressed | `pages/moments/default`, `pages/moments/filtered`, `pages/moments/no-results` |
| [Avatar](components/avatar.html) | Single, and a group with rings | — | `pages/team/default`, `pages/globe/selected`, `pages/join/default`, `pages/moments/default` |
| [Status](components/status.html) | Early morning 07:00–08:59, Working hours 09:00–17:59, Evening 18:00–22:59, Probably asleep 23:00–06:59; Dot beside a local time: always with the status in words nearby | — | `pages/globe/selected`, `pages/globe/selected-asleep`, `pages/team/default`, `pages/globe/sharing-off` |
| [Emblem](components/emblem.html) | The four kinds on soft sun; solid for today or a card; plain when a kind is switched off | — | `pages/globe/default`, `pages/moments/default`, `pages/profile/default`, `pages/brand/default` |
| [Card](components/card.html) | Invite card: raised, over the globe; Pin card: flat, with a small globe | — | `pages/globe/empty`, `pages/profile/default` |
| [Dialog](components/dialog.html) | Destructive: a danger button, focus on Cancel; Confirm: the safe choice is primary | Default, Busy, Failed | `dialogs/leave-team/default`, `dialogs/leave-team/busy`, `dialogs/leave-team/failed`, `dialogs/unsaved-changes/default` |
| [Toast](components/toast.html) | Success, and failure | — | `notifications/invite-link/success`, `notifications/invite-link/danger` |
| [Alert](components/alert.html) | Information, warning, danger, and a form’s error summary; Banner: across the top of a screen | — | `pages/join/lookup-unavailable`, `pages/join/join-failed`, `pages/join/invalid`, `pages/join/team-full`, `pages/globe/globe-unavailable`, `notifications/refresh-banner/warning` |
| [Save bar](components/save-bar.html) | Unsaved, saving, saved, could not save | — | `notifications/settings-bar/info`, `notifications/settings-bar/saving`, `notifications/settings-bar/success`, `notifications/settings-bar/danger` |
| [Skeleton](components/skeleton.html) | Title, text, pill, control, and a composed row | — | `pages/globe/loading`, `pages/team/loading`, `pages/moments/loading`, `pages/profile/loading`, `pages/join/loading` |
| [Spinner](components/spinner.html) | In a message, and in a busy button | — | `pages/join/locating`, `pages/join/submitting`, `notifications/settings-bar/saving`, `dialogs/leave-team/busy` |
| [Empty state](components/empty-state.html) | Nothing yet; Could not load; A filter found nothing: one line, with the filter still in view | — | `pages/globe/error`, `pages/moments/empty`, `pages/moments/no-results`, `pages/team/no-results`, `pages/no-team/default`, `pages/left-team/default`, `pages/not-found/default`, `pages/join/invite-unusable` |
| [Skip link](components/skip-link.html) | One | Hidden, Focused | `pages/globe/default` |
| [App header](components/app-header.html) | A tab current; Profile & Settings current: the avatar is ringed; Bare: before joining, and for someone in no team | — | `pages/globe/default`, `pages/profile/default`, `pages/no-team/default` |
| [Logo](components/logo.html) | On paper; On ink; App icon: the mark reversed out of ink, and on pin | — | `pages/brand/default`, `pages/join/default`, `pages/globe/default` |
| [Globe](components/globe.html) | With the team’s pins: Globe; Nameless pins on Join; one pin on Profile & Settings; the placeholder while it loads | Turning, Holding on a pin, Loading, Still picture | `pages/globe/default`, `pages/globe/selected`, `pages/globe/loading`, `pages/globe/globe-unavailable`, `pages/join/default`, `pages/profile/default` |
| [Pin](components/pin.html) | A teammate; you (an ink ring); with today’s moment; a group; a nameless pin on Join; your pin on Join | At rest, Pointed at, Focused, Selected, New | `pages/globe/default`, `pages/globe/pin-lifted`, `pages/globe/selected`, `pages/globe/just-joined`, `pages/globe/group`, `pages/join/found` |
| [Pin label](components/pin-label.html) | At rest by day; at night (the night icon); time only, when weather is not shared or unavailable; lifted | At rest, Lifted | `pages/globe/default`, `pages/globe/pin-lifted`, `pages/globe/weather-unavailable`, `pages/globe/fahrenheit-12-hour` |
| [Moment marker](components/moment-marker.html) | The four kinds, this week; and today | — | `pages/globe/default`, `pages/globe/pin-lifted`, `pages/globe/quiet` |
| [Panel row](components/panel-row.html) | A moment (solid emblem when it is today), and a teammate with their local time | Default, Hover, Focus | `pages/globe/default`, `pages/globe/group`, `pages/globe/quiet` |
| [Teammate panel](components/person-panel.html) | On the night side: Melbourne’s own day, the night form of the weather, and no shared working hours | Shares everything, Weather unavailable, Shares neither | `pages/globe/selected`, `pages/globe/selected-self`, `pages/globe/selected-asleep`, `pages/globe/sharing-off`, `pages/globe/weather-unavailable` |
| [Moment card](components/moment-card.html) | Cards, stacked in a panel; Pills, in the Team table | — | `pages/globe/selected`, `pages/globe/sharing-off`, `pages/team/default` |
| [Moment row](components/moment-row.html) | Today’s moment; Rows in a group | Default, Hover, Focus | `pages/moments/default`, `pages/moments/filtered`, `pages/moments/loading` |
| [Overlap bar](components/overlap-bar.html) | Two hours shared; No shared working hours | — | `pages/globe/selected`, `pages/globe/selected-asleep`, `pages/globe/fahrenheit-12-hour` |
| [Day ribbon](components/day-ribbon.html) | A small team: one row is enough | Marker, Marker, hover, Marker, focus | `pages/team/default`, `pages/team/edge`, `pages/team/empty` |
| [Team table](components/team-table.html) | Rows: a teammate, you, and someone asleep (night icon); Weather unavailable: the cell says so; times and status stay | Default, Hover | `pages/team/default`, `pages/team/working`, `pages/team/weather-unavailable`, `pages/team/edge`, `pages/team/empty` |

Components from the skill's core set that Mondino does not have, and so are not documented: menu, textarea, checkbox, combobox, slider, date picker, file upload, sidebar, breadcrumb, pagination, stepper, accordion, drawer, popover, tooltip, progress bar. None appears in a mock, and the product is five screens on purpose. One is added here when a mock first needs it.

## Patterns

| Pattern | Covers |
|---|---|
| [Forms](patterns/forms.html) | Mondino has two forms: joining a team, and your own settings. Both ask for very little and lose nothing. |
| [Feedback and loading](patterns/feedback-and-loading.html) | Every action answers at once, where the teammate is looking, and waiting always says what it is waiting for. |
| [Empty and error states](patterns/empty-and-error-states.html) | What Mondino says when there is nothing to show, when it could not load, and when a screen is not for this person. |
| [Navigation and page structure](patterns/navigation-and-page-structure.html) | Five screens and one header. The whole app stays this small. |
| [Dialogs and overlays](patterns/dialogs-and-overlays.html) | Mondino interrupts twice only. Everything else happens in place. |
| [Data tables and lists](patterns/data-tables-and-lists.html) | How Mondino lists teammates and moments: in an order that means something, with a row that opens the globe. |
| [Notifications](patterns/notifications.html) | Mondino sends nothing: no e-mail, no push, no badge. It only tells you what just happened on the screen you are looking at. |
| [Content and tone](patterns/content-and-tone.html) | A small, warm product about people far apart. It speaks plainly and never claims to know more than a clock and a calendar can tell. |

## Tokens

- `tokens/tokens.css` is the source of truth: primitives, semantic tokens, light and dark.
- `tokens/tokens.json` is the same tokens in the W3C Design Tokens format, generated from it.
- `tokens/contrast-pairs.json` lists every foreground and background pairing a component relies on; all are checked in both themes.
- `assets/components.css` is the component CSS, with component tokens (`--btn-*`, `--field-*`, `--pin-*`, `--dialog-*`, `--toast-*`) that alias semantic ones.
- `assets/fonts/` holds Gabarito and Inter (SIL Open Font License).
- `assets/logo/` holds the logo as standalone SVG files, drawn from the *Mondino Brand* prototype's mark: `mark.svg` and `mark-on-ink.svg`, `lockup.svg` and `lockup-on-ink.svg` (mark and wordmark), `wordmark.svg`, and `app-icon.svg` and `app-icon-pin.svg`. The wordmark is Gabarito bold as outlines, so the files need no font.

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

Drift between the Magic Patterns prototype and the mocks (a postal code on another teammate's panel, pin as text under 4.5:1, hairline input edges, a status shown by a dot alone, and so on) was corrected when the mocks were written and is listed in [the mocks' README](../mocks/README.md).

Found while documenting and left as it is: a selected pin's ring (pin) is 1.4:1 against the globe's ocean. Selection does not depend on it: the pin is larger, lifted, shadowed and labelled, and exposes `aria-pressed`. In dark the globe's outline matches the canvas, and the bright ocean is its edge.

Still open, carried from the mocks: dark is this system's own and the prototype has none; "Invite teammate" and "Message" lead nowhere yet; a team of hundreds is not designed.

## Verification

Run on 26 November 2026:

| Check | Command | Result |
|---|---|---|
| Contrast, both themes | `python .claude/skills/extracting-design-systems/scripts/check_contrast.py docs/design-system/tokens/tokens.css` | 114 passed, 0 failed, 0 unresolved |
| Structure, sections, tokens-only colour, links | `python .claude/skills/extracting-design-systems/scripts/check_design_system.py docs/design-system` | 55 pages (34 components, 8 patterns), 0 errors, 0 warnings |
| Mocks, after pointing them at this system | `python .claude/skills/writing-html-mocks/scripts/check_mocks.py docs/mocks` | 14 screens, 65 mocks, 0 errors, 0 warnings |
| Screenshots | Chromium at 360 and 1280 px, light and dark | All 55 pages opened at 320, 360, 768 and 1280 px in both themes: no page error, no sideways scroll, every live contrast ratio on the pages passes. Looked at by eye: the index, Button, Pin, Team table and Teammate panel (light), Globe and Dialog (dark). All 65 mocks re-rendered through this system at five widths in both themes with no overflow. |

To regenerate `tokens.json` after changing a token:

```sh
python .claude/skills/extracting-design-systems/scripts/tokens_to_json.py docs/design-system/tokens/tokens.css
```
