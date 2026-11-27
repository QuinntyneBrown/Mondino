# 0029: The Globe announces a selection in its own live region, motion is read where it moves, and the specs measure what a sweep would

**Status:** Accepted (journey 28, Make accessible). Replaces the `LiveAnnouncer` and the
`MotionPreference` contract that `make-accessible` drew.

## Context

`make-accessible` drew two parts that were never built, because the screens built before it
did the same thing another way:

- `GlobePage` was to announce a selection through the CDK `LiveAnnouncer`. The mocks
  (`pages/globe/default`, `selected`) draw the announcement as the page's own
  `p.visually-hidden[role=status][aria-live=polite]`, empty until something is selected and
  then "Tomás Herrera, Mexico City, selected.", and journey 14 built it that way.
- `GlobeView` was to read a `MotionPreference` signal from a token in `api`, bound to a
  `BrowserMotionPreference` in `domain`. `GlobeView` reads
  `matchMedia('(prefers-reduced-motion: reduce)')` itself, gives it to `GlobeMotion` and follows
  its `change` event until it is destroyed (journey 9). Every other motion is CSS: the tokens
  set every `--duration-*` to 0.01 ms under `prefers-reduced-motion: reduce`, and each
  animation that repeats or pulses is set to `none` there in its own stylesheet.

L2-039 to L2-042 also ask for measurements a person usually makes with a tool: focus rings
and text against their backgrounds, 200% text, touch targets on every screen. AGENTS.md runs
the axe sweep only when a person asks.

## Decision

- **The page's live region announces a selection.** It is in the page before anything is
  selected, so the first change is read; its text changes only with the selection (or the
  group, or "Loading your team…"), never with the minute. `LiveAnnouncer` is not used: its
  region is made on the first call, outside `main`, and a first announcement can be lost.
- **No `MOTION_PREFERENCE` token.** The globe is the only code that moves something with
  script, so it reads the media query where it moves; CSS follows the setting by itself, live.
  A second consumer in script would bring the token.
- **Reduced motion is expressed once in the tokens and once per repeating animation.** A
  transition or one-off animation reads a `--duration-*` token and so lasts 0.01 ms under
  reduced motion; an animation that repeats or pulses (the new pin's pulse, the shimmer of a
  skeleton or the globe's placeholder) is `animation: none` in a
  `@media (prefers-reduced-motion: reduce)` block in its component's stylesheet.
- **A live region holds only what it announces.** The refresh banner was one `role="status"`
  with its "Try again" button inside, so each automatic retry ("Trying…", then "Try again")
  announced the whole banner again. The status is now its words alone. A failed refresh is
  announced politely, as the mock draws it: the screen keeps what it shows, so nothing has to
  stop the person (L2-040 criterion 8 says so).
- **No text on the globe fades under 4.5:1.** The mocks faded every pin with its depth, so a
  labelled pin near the rim drew its initials and its label under AA. A labelled pin is now
  drawn at full strength; a far pin (ADR 0014) still fades, unlabelled, and draws no initials
  until it lifts. Its name is read in full from its button.
- **A target is measured as the browser lays it out.** A transparent `::before` or `::after`
  that grows a control to 44 px is placed inside the control's border, so its inset counts the
  border too; the header's "Invite teammate" and the Moments chips were 42 px. Links in a line
  of text (the footers of Join and Sign In) and the Team ribbon's markers grow the same way.
- **The behaviour specs measure every screen.** One spec walks each screen with Tab and
  measures the focus ring's contrast, the touch targets, the contrast of each line of text
  and the figures of each time and temperature, in light and dark, and reads the motion under
  each setting. Browser text at 200% is the browser's own default font size set from 16 to
  32 px (Chromium's `Page.setFontSizes`), so every size and every breakpoint in `rem` follows,
  as they do for a person who changes the setting. The axe sweep stays written for
  every screen in every state and runs when a person asks.

## Consequences

- The announcement is the mocks' element and its words, and a spec reads it directly.
- A spec proves reduced motion by reading the computed durations and the running animations
  of each screen, which is what a person would see; a new animation that ignores the tokens
  fails it.
- The contrast a spec measures is the text's colour over the nearest painted background; text
  over a picture or a gradient is left to the sweep and to the design system's contrast pairs.
- Rejected: `LiveAnnouncer` beside the page's region (two regions could read the same change
  twice), and a token with one consumer.
