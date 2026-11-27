# 0027: The layouts change where the mocks do, at breakpoints one Sass module names, and the Globe's globe fills its stage

**Status:** Accepted (journey 27, Adapt to every width). Brings L2-037 criteria 2 and 4 and the
design system's pages to the CSS the mocks render through.

## Context

L2-037 put the Globe's panel and Profile & Settings' pin card beside their screens from 992 px,
and the Globe's heading over its corner from 576 px; so did the design system's layout,
responsive, panel and card pages. The CSS the mocks render through
(`docs/design-system/assets/components.css`) does it at `64rem` (1024 px) and `40rem` (640 px):
the prototype's own widths. The code had followed the CSS, so a spec written from the
requirement would have measured a layout no mock draws.

The breakpoints were repeated as literal rem values in eighteen stylesheets (`36rem`, `40rem`,
`48rem`, `62rem`, `64rem`, and `35.99rem`, `25.99rem` and `22.49rem` for the `max-width` side),
and the design (`adapt-to-every-width`) named Sass variables that were never written. The tokens
named four of the six widths.

The Globe's globe had a maximum width of 40 rem since journey 4, so from 1200 px it stopped
growing where L2-037 criterion 5 and the mock have it fill the space beside the panel.

## Decision

- **The mock's widths are the breakpoints.** 576 px (`sm`: the wordmark, a dialog in the
  middle), 640 px (`stage`: the Globe's 4:3 stage with its heading, legend and invite card over
  the globe), 768 px (`md`: the Team table, "Invite teammate" in words), 992 px (`lg`: the form
  beside the globe on Join, Sign In and Create Team), 1024 px (`wide`: the panel beside the
  globe, the pin card beside the settings). From 1200 px (`xl`) no query is needed: the
  containers' maximum widths (`--layout-container-*`) keep the text's measure. The header alone
  also tightens under 416 px and 360 px. L2-037 criteria 2 and 4 and the design system's pages
  say 640 px and 1024 px, and `--layout-breakpoint-stage` and `--layout-breakpoint-wide` join the
  tokens.
- **One Sass module names them.** `frontend/projects/components/src/styles/_breakpoints.scss`
  holds `$sm`, `$stage`, `$md`, `$lg`, `$wide`, `$xl`, `$header-tight` and `$header-tighter`, the
  same values as the tokens (a media query cannot read a custom property). Every component's
  stylesheet, in `components` and in `mondino`, reads it with `@use 'breakpoints' as bp`, found
  through `stylePreprocessorOptions.includePaths` in `angular.json`. A `min-width` query is
  `bp.$md`; a `max-width` one is `bp.$md - 0.01rem`, so the two sides never overlap. It emits no
  CSS, and no component reads the width in TypeScript.
- **The Globe's globe fills its stage, as the mock draws it.** Under 640 px it is a square the
  width of the screen; from 640 px the stage is 4:3 and the globe fills its height; from 1024 px
  the stage fills the window's height beside the panel. It has no maximum width, so it grows
  from 1200 px while the text keeps its measure.

## Consequences

- A layout changes at one width in the design system, the mocks, the requirement and the code.
  A new breakpoint is a token, a line in the module and a sentence in the layout page.
- From 1024 px the globe is drawn at the window's height less the header: 1016 px on a
  1920 × 1080 display. The canvas keeps ADR 0012's two detail steps (a pixel ratio up to 2, or 1
  when frames are slow), so a large display costs more pixels, not more model.
- Between 640 and 1023 px the globe is three quarters of the stage's width tall, as the mock
  draws it, where it was a square up to 640 px.
- Rejected: changing the CSS to 992 px to keep the requirement's number. The mocks are the
  source of truth, and the prototype breaks at 1024 px.
- Rejected: CSS custom media (`@custom-media`). Angular's build does not support it without a
  PostCSS plugin, and Sass already reads a variable in a query.
