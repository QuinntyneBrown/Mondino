# 0009: Making a team keeps only a keyed fingerprint of the email, and reuses Join's lookup

**Status:** Accepted (journey 5, Create a team)

## Context

Create Team (`/new`, L2-053) is the first screen open to anyone at all, and the only one that
asks for an email. `make-team` and L2-053 left open: what Create Team does with an email that is
already a teammate's on another team; the longest name a team may have; what the screen shows
when a request is refused with 429 (L2-045); how the email is kept; and, in `docs/mocks/README.md`
(open question 9), what the screen shows when a postal code cannot be found or the lookup is
down. The design also had Create Team read the countries from a new `GET /api/countries`, while
the mocks' manifest says Create Team reads nothing before it is shown and draws no loading state.

The email is used for one thing: sending that teammate's sign-in links (L2-052, journey 7). A
sign-in request carries the address itself, so Mondino needs to recognise an address it is given,
never to read one back.

## Decision

- **An email already on another team makes a team like any other.** Nothing is looked up by
  email when a team is made, and the answer is the same, so Create Team says nothing of which
  emails Mondino knows (L2-043). One email may belong to teammates of several teams; which team
  a sign-in link then opens is decided with journey 7.
- **A team's name has at most 60 characters**, as a teammate's name and as the mock's field
  (`maxlength="60"`). It is cleaned as a name is (`NameNormaliser`), and refused with
  `validation_failed` when empty or longer.
- **The email is kept only as a keyed fingerprint.** `EmailAddress` (Domain) trims and
  lower-cases it and checks its form (one `@`, a dot in the domain, no space, at most 254
  characters). `IEmailFingerprints` (Application) turns it into
  `HMAC-SHA256(key, address)`, hex encoded; `HmacEmailFingerprints` (Infrastructure) reads the key
  from `EmailProtection:Key`. `Teammate.EmailFingerprint` is stored, with an index, and the
  address itself is stored nowhere, logged nowhere and returned to no one, the maker included.
  A database read on its own cannot give the addresses back, and a guess cannot be tested
  without the key. Sign-in (journey 7) fingerprints the address it is given and finds the
  teammates who have it. When the key is not set, making a team fails as an unexpected error
  (500) and nothing is stored; everything else runs, as the postal code source does without its
  account. Changing the key orphans the fingerprints already kept.
- **Create Team looks its postal code up as Join does** (L2-003, L2-004), with Join's words and
  `LookupState`, drawn in `create-team/locating`, `found`, `not-found` and
  `lookup-unavailable`; its button keeps reading "Create team" and waits while the lookup runs.
  The found city's pin, "You · Milan", is on the still globe before the team is made, as on Join.
- **A 429 on Create Team shows Join's countdown** (`create-team/rate-limited`): a postal code
  lookup or a request to make the team refused with 429 shows "Too many tries from this device."
  with the time left, and keeps what was typed.
- **The countries are bundled with Create Team**, in `@mondino/domain` (`countries/`), so the
  screen shows at once with no loading state the mocks do not draw. The backend's
  `PostalCodeFormats` stays the authority and checks every request; a change to the supported
  countries changes both, and the e2e fixture, in one change. There is no `GET /api/countries`.
- **The endpoints** are on `TeamCreationController`, each marked open to anyone (`[AllowAnonymous]`)
  and rate limited for one client: `POST /api/postal-code-lookups` (the `lookup` policy, 10 a
  minute, shared with Join's lookups), `POST /api/city-searches` (the `city-search` policy, 30 a
  minute, shared with Join's) and `POST /api/teams` (the new `create-team` policy, 5 an hour).
  `POST /api/teams` carries `[SameSiteOnly]` (ADR 0008).
- **The invite token** is 16 bytes from `RandomNumberGenerator` (128 bits), base64url without
  padding: 22 characters.
- **"Copy link" writes with `navigator.clipboard.writeText`**, behind the `CLIPBOARD` token in
  `@mondino/api` (`NavigatorClipboard` in `@mondino/domain`). The CDK is not yet a dependency,
  and its `Clipboard` copies through the deprecated `document.execCommand('copy')`; the
  asynchronous API is the platform's way, and its refusal is what shows the toast.
- **Create Team draws the `auth` block itself**, as Join draws `join`. `AuthLayout` (`mo-auth`)
  moves into `@mondino/components` when Sign In (journey 7) is the second screen to use it.

| Setting | Meaning | Default |
|---|---|---|
| `EmailProtection:Key` | The secret key of the email fingerprint: at least 32 bytes, base64. Every instance must share it, and it must not change, or a teammate's email is no longer recognised. | none: making a team fails until it is set |

## Consequences

- No one, Mondino included, can list the teammates' emails or send them anything but the sign-in
  link they ask for. A teammate who mistypes their email at Create Team cannot be told so later.
- The supported countries are written in two places, kept together by review.
- A deployment must set `EmailProtection:Key` before Create Team works.
