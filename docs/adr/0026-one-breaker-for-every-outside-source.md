# 0026: Every outside source has one kind of breaker, an older answer is given while it fails, and two sources in a row share one 6-second deadline

**Status:** Accepted (journey 26, Survive a source failure). Completes what
[ADR 0015](0015-weather-source.md) and [ADR 0019](0019-moment-calendars.md) left to this journey;
keeps the values [ADR 0006](0006-postal-code-source.md) and [ADR 0011](0011-signing-in-with-an-emailed-link.md)
chose, as settings.

## Context

L2-049 asks that a failing or slow outside source costs only what depends on it: a 5-second
timeout, a cache, a pause after repeated failures with no unbounded queue, weather up to 3 hours
old given while the weather source fails, the last cached moments of a failing calendar, and no
response to a browser waiting longer than 6 seconds on outside sources. `survive-source-failure`
left the breaker's threshold and pause `<TO SUPPLY>` and drew a `SourceResilience` pipeline built
with `Microsoft.Extensions.Resilience`. What was built before this journey is different: the
postal code source (ADR 0006), the holiday source (ADR 0019) and the email source (ADR 0011) each
hold a hand-written breaker (5 failures in a row, then 30 seconds without a call), the weather
source (ADR 0015) has none, and the decorators read `TimeProvider`, which the tests advance.
The lookup on Join and Create Team, a teammate's own lookup and saving a new location ask the
postal code source and then the weather source, one after the other: 5 seconds each, 10 in all.

## Decision

- **One breaker, `SourceBreaker`, for every outside source.** Each source's decorator holds its
  own instance: `CachedPostalCodeLookup`, `CachedWeatherSource`, `CachedOpenHolidays` and
  `PostmarkSignInEmailSender`. After `FailuresToOpen` failures in a row (an error, an answer that
  is not usable, or no answer in 5 seconds) it opens for `BreakerOpenFor`, and the source is not
  called until then; one success closes the count. Both values are settings,
  `OutsideSources:FailuresToOpen` (5) and `OutsideSources:BreakerOpenFor` (00:00:30), shared by
  every source: the values the three breakers already had, so nothing changes for them. Five
  keeps a stray failure from stopping a source, and one failed read of a team in more than five
  cities opens it; thirty seconds is short against the 15-minute refresh, so a source back within
  the minute is asked again at the next read.
- **No queue.** No source is retried, and one call per place is in flight at a time: concurrent
  reads of one city's weather, or one country's year of holidays, share one call. While a breaker
  is open nothing is called. Calls in flight are then bounded by the distinct places of the
  requests being served, each ending within 5 seconds; there is no further concurrency limit.
- **Weather up to 3 hours old while the source fails.** `CachedWeatherSource` keeps each city's
  last good answer beside its 15-minute fresh entry. When a call fails, times out or is not made
  because the breaker is open, the last good answer is given if it was read under 3 hours ago
  (`ServedFor`), as `Available` with its own `observedAt`; otherwise there is none, and the pin is
  `Unavailable`. A city whose last answer is older than 3 hours and not fresh is the first to go
  when the 10,000 cities are full.
- **The last year of holidays while the holiday source fails.** `CachedOpenHolidays` keeps a
  country's year after its 24 hours and gives it whenever a call fails, times out or is not made,
  whatever its age: a year's public holidays rarely change. Entries go only for room, oldest
  read first, at most 1,000. Formula 1, local events and sport come from Mondino's own calendar
  (ADR 0019) and never fail.
- **Two sources in a row share one 6-second deadline.** `LookUpPostalCodeQueryHandler` and
  `UpdateProfileCommandHandler` start `SourceDeadline` (6 seconds, by `TimeProvider`) before the
  postal code lookup and pass it to the weather source after it, so the weather waits only what
  is left; when it runs out, the answer is given without weather. `CachedWeatherSource` stops a
  caller's wait when that caller's token is cancelled, and leaves the shared call running for
  the others. A read that asks one source, or several at once (the pins' weather, the moments'
  holidays), is already under 5 seconds.

## Settings

| Setting | Meaning | Default |
|---|---|---|
| `OutsideSources:FailuresToOpen` | Failures in a row after which a source's breaker opens. | `5` |
| `OutsideSources:BreakerOpenFor` | How long an open breaker leaves its source alone. | `00:00:30` |

## Consequences

- The four breakers behave as before; the weather source gains one, and the hand-written copies
  become one class with one test of its own through each source.
- An answer given from the older cache is not marked as old: a pin shows weather up to 3 hours
  old as it would a fresh one, with its observation time. No mock draws an "as of" for it.
- The deadline is per request. A request that asks one source and then reads the database is not
  bounded by it; none does today.
- Rejected: `Microsoft.Extensions.Resilience` pipelines, as the design drew. Its breaker samples
  failures over a window rather than in a row, its timeout reads `TimeProvider` only through its
  own options, and it would replace four tested decorators for no behaviour L2-049 asks. The
  design is brought in line with `SourceBreaker`.
- Rejected: one breaker shared by every source. A failing weather source would stop postal code
  lookups.
