# 0016: Making a team has no rate limit

**Status:** Accepted (asked for by the product owner). Supersedes the part of
[0009](0009-making-a-team.md) that limited `POST /api/teams` with the `create-team` policy, 5 an
hour, and that showed Join's countdown for a request to make a team refused with 429.

## Context

Making a team (`POST /api/teams`, L2-053) is open to anyone at all: the person making a team has
no session and no invite link yet. ADR 0009 held it to the `create-team` policy, 5 teams an hour
for one client, and Create Team showed Join's countdown when it was refused with 429. The product
owner has asked for that limit to be removed completely: not raised, not made a setting, and not
replaced by another limit. No reason was given, and none is recorded here.

The rule in `AGENTS.md` (Backend) and L2-045, which follow the platform's best practice, is that
everything open to anyone is rate limited. This record is the one departure from it.

## Decision

- **`POST /api/teams` has no rate limit.** The `create-team` policy is removed from
  `RateLimitPolicies`, and `TeamCreationController.Create` names no policy. The request is never
  refused for coming too often, and Create Team treats a 429 from it, should one ever arrive, as
  any failed request (L2-053 criterion 12): the failure alert, "Try again", and what was typed
  kept.
- **Nothing else changes.** The endpoint stays `[AllowAnonymous]` and `[SameSiteOnly]`
  (ADR 0008), its validation stays (L2-044), and one `createRequestId` still makes one team. Every
  other policy stays as it is: `invite` (30 a minute), `lookup` (10 a minute), `city-search` (30 a
  minute), `join` (5 a minute), `sign-in-link` (5 in 15 minutes, and 3 per email) and
  `sign-in-redemption` (10 a minute). Create Team's postal code lookup and city search stay
  limited, and a lookup refused with 429 still shows Join's countdown
  (`create-team/rate-limited`).
- **No other protection takes the limit's place.** No captcha, email confirmation, quota or proxy
  rule is added. The exception is for making a team only; it does not widen to any other open
  endpoint.

## Consequences

- **Stored data grows with every request.** One client can make any number of teams, and each
  stores a team, its invite token, one teammate with a pin, and that teammate's email
  fingerprint (ADR 0009), and adds a city the first time a pin is placed there. Nothing bounds
  how many a client makes or removes the ones it made; each also issues a session.
- **The postal code source on this path.** `CreateTeamCommand` places the maker's pin through
  `PinCities.FindAsync`, which calls `IPostalCodeLookup`. The `lookup` policy covers
  `POST /api/postal-code-lookups`, not `POST /api/teams`, so the 5 an hour limit was what bounded
  GeoNames calls from this path. What still protects the shared GeoNames account here
  (ADR 0006): a postal code whose form is wrong for its country is refused before the source is
  asked; Ghana and the United Arab Emirates, and a deployment with no account, never call it; a
  city chosen from "Your city" (`cityId`) calls no source; `CachedPostalCodeLookup` answers a
  postal code already found (30 days) or not found (1 day) from its cache, by country and
  postal code, at most 10,000 entries; each call has 5 seconds; and after 5 failures in a row
  the breaker leaves the source alone for 30 seconds. What does not: nothing limits how many
  different postal codes one client sends to `POST /api/teams`. Each one the cache does not hold
  is a call that spends the account's credits (10,000 a day, 1,000 an hour on the free account),
  so one client can use them up for every team. When the source then fails, the lookup answers
  `Unavailable`, and anyone joining or making a team picks their city from "Your city" (L2-004)
  until the credits come back; no pin's local time is lost.
- `docs/adr/0010-protecting-team-data.md` says each open action names a rate limit policy, and
  that a new open endpoint must be given one. That stays true of every open action but making a
  team.
- A later decision to limit making a team again, or to protect it another way, needs its own
  record.
