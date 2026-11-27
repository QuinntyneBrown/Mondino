# 0022: A teammate's own postal code lookup is limited to 10 a minute for the teammate, so the rate limiter runs after the session is read

**Status:** Accepted (journey 22, Change location).

## Context

Profile & Settings lets a teammate look a new postal code up before moving their pin (L2-032),
through `POST /api/teams/{teamId}/me/postal-code-lookups`. Every lookup can reach the postal code
source, GeoNames (ADR 0006), whose free account has a daily allowance, so the lookup needs a
limit like Join's and Create Team's (L2-045 criterion 1: 10 a minute per client). The detailed
design left the number open.

The open lookups are counted by the client's address, because their callers have no session. This
one needs a session, so it can be counted for the teammate. Counted by address, teammates behind
one office's address would share ten lookups a minute; counted by teammate, one teammate moving
between a laptop and a phone still has only ten.

`RateLimitPolicies` partitions in `UseRateLimiter`, which ran before `UseAuthentication`, so a
policy could not see who the session belongs to. ASP.NET Core's guidance for limits by user is to
run the rate limiter after authentication.

## Decision

- **A teammate may look up 10 postal codes a minute on Profile & Settings**, the same number as
  the open lookups, as a fixed window counted for the teammate the session names (the policy
  `own-lookup`). The 11th in the minute is refused with 429, a `Retry-After` header and
  `rate_limited` before any handler runs, so the source is not asked.
- A request without a session is counted by its address under the same policy and refused with
  401 by authorization after it; it never shares a teammate's count.
- **The pipeline is `UseRouting`, `UseAuthentication`, `UseRateLimiter`, `UseAuthorization`.**
  Authentication only reads the session cookie and refuses nothing, so the open endpoints are
  limited as before; their partitions still use the address.
- Saving the new location (`PUT /api/teams/{teamId}/me`) is not limited: it needs a session and
  the antiforgery token, and it finds the city through the lookup's cache.

## Consequences

- L2-032 criterion 7 names the number; the screen shows its own message for `rate_limited` and no
  countdown, as `profile/rate-limited` draws it.
- A limit counted by teammate holds across the teammate's devices; an attacker with one stolen
  session gets ten lookups a minute and no more.
- Rejected: counting by address (shared offices would refuse each other), and a separate,
  larger number (nothing on the screen needs more than one lookup per move).
