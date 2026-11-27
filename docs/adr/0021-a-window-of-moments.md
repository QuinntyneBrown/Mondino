# 0021: A long Moments list keeps a window of 60 rows in the page, moved by the page itself rather than by CDK virtual scrolling

**Status:** Accepted (journey 21, List moments).

## Context

A moment is listed once for each teammate it belongs to (L2-020), so a team of 500 can have
thousands of moments in the 90 days the Moments screen lists. L2-047 criterion 5 asks that the rows
in the page stay under a fixed limit as Moments is scrolled from top to bottom. The mocks draw
Moments for the cast only, and open question 7 of `docs/mocks/README.md` leaves a team of 500 to
this decision: nothing new is drawn, so whatever bounds the rows must not be seen.

Angular's established way to window a list is the CDK's virtual scrolling
(`cdk-virtual-scroll-viewport`). Its stable strategy needs every item to be one fixed height; a
moment row is not (a long detail wraps, and the row changes shape under 640 px), today's moment is a
card of another height, and the list is in three groups with headings, scrolled by the window
rather than a box of its own. The strategy for items of varying height is in
`@angular/cdk-experimental`, which Mondino does not take.

## Decision

- **Up to 60 moments, every row is in the page**, as the mocks draw them; the cast has 15.
- **Past 60, the page holds a window of 60 rows** (today's cards counted among them), worked out by
  `momentWindow` in `domain`'s `moments/` from the number of moments and where the window starts.
  The page listens to the window's scroll and resize, at most once a frame, works out which moments
  the viewport shows from the measured height of a row, and `followWindow` moves the window once
  they come within 10 moments of either end of it: it then starts 20 moments above the first shown,
  never past either end. A jump of the scroll bar is followed as a step is.
- **The rows out of the window keep their space**, as padding before and after the groups: their
  number times the height of a row in the window, measured as it is drawn, so the scroll bar and the
  position stay true. A group with no row in the window is not drawn.
- The listeners and any pending frame are the page's, removed when the teammate leaves it.

## Consequences

- No row count grows with the team: a team of 500 has at most 60 rows in the page, however far it is
  scrolled (L2-047).
- A heading out of the window is estimated as a row; the scroll position may shift by a few pixels
  as the window moves, which the browser's scroll anchoring absorbs.
- An `IntersectionObserver` on two edges of the window was tried first: once the scroll bar jumps
  into the space kept for the rows out of the window, neither edge is near the viewport and the
  window never moves. Following the scroll position covers both.
- Rejected: CDK virtual scrolling (fixed heights, a scroll box of its own, or an experimental
  package), paging with "Show more" (no mock, and the rows would still grow), and listing a moment
  once per city with a count (a change to L2-020 and to the mocks).
