# 0007: Join's form brings Angular's runtime for outputs and render effects into the initial bundle

**Status:** Accepted (journey 3, Place a pin from a postal code)

## Context

The Join form is the first screen with components that emit (`output()`), that move focus after
they are drawn (`afterRenderEffect`), and that keep a value linked to an input (`linkedSignal`).
Join is loaded lazily, and the components are in its chunk. Angular's runtime for those
features is part of `@angular/core`, which is one module in the initial chunk, so the first
screen that uses them puts that runtime there, wherever the screen is loaded (as ADR 0005 found
for `@for`, `@switch` and `effect`).

Measured with `ng build`: the initial bundle went from 252.5 kB to 257.5 kB (raw). A signal view
query (`viewChild`) would have added 7.4 kB more, so the error summary moves focus to itself
from an `afterRenderEffect` keyed by a counter the screen raises, and holds no query.

## Decision

- **The initial budget warns at 260 kB** (it was 255 kB) and still fails at 265 kB.
- Components avoid signal queries (`viewChild`, `contentChild`) where an element can be reached
  from the component's own host, until a screen needs one for something else.

## Consequences

- The next screen that uses a core feature for the first time is measured the same way, and the
  budget moves only with a record like this one.
