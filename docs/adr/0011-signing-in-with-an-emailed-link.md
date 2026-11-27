# 0011: Sign-in links are mailed by Postmark from an outbox, and the link keeps its token in the fragment

**Status:** Accepted (journey 7, Sign in with an emailed link). Builds on
[ADR 0008](0008-session-and-cross-site-requests.md), [ADR 0009](0009-making-a-team.md) and
[ADR 0010](0010-protecting-team-data.md).

## Context

Sign In (`/sign-in`, L2-052) emails a link that signs a teammate in once, within 15 minutes.
`joining/sign-in` and `docs/detailed-designs/README.md` left open: the provider of the Email
source, the address the link is built on, how the email is kept while a link is alive (ADR 0009
keeps a teammate's email only as a keyed fingerprint), which team a link opens when one email is
on more than one team, the words of the email, and what the screen shows while a link is being
opened and when it can no longer be used.

The design had the handler send the mail before answering, and refuse with 503
(`sign_in_email_unavailable`) when the Email source did not take it. Mail is sent only for an
email that is on a team (the journey's "Done means": an unknown email gets the same answer and
no mail), so a 503, or the seconds a call to the Email source takes, would come only for a known
email, and would tell anyone which emails Mondino knows (L2-043 criterion 9).

## Decision

- **The Email source is Postmark**, through its HTTP API (`POST https://api.postmarkapp.com/email`,
  the server token in `X-Postmark-Server-Token`), on the transactional `outbound` stream, with
  open tracking off and link tracking `None`, so Postmark never rewrites the link through its own
  domain. Postmark sends transactional mail only, publishes its delivery figures, signs a data
  processing agreement, and is paid by volume (a free developer allowance, then from about USD 15
  a month for 10,000 messages). It keeps a copy of each message for its retention period; the
  link in a kept copy is dead after 15 minutes and once used. `PostmarkSignInEmailSender`
  (Infrastructure) implements `ISignInEmailSender`; its `HttpClient` has its loggers removed
  (journey 3, lesson 4) and each call has the 5-second timeout and the breaker the postal code
  source has (5 failures in a row open it for 30 seconds). Another provider is one class behind
  the same interface.
- **Postmark is given the address and the link and nothing else** (L2-050, L2-052 criterion 13):
  no name, team, city or postal code. The message is plain text, in the screen's own words:
  the subject "Your Mondino sign-in link" and the body "Here is your link to sign in to Mondino.
  It works once, for the next 15 minutes." with the link, and "If you didn’t ask for it, you can
  ignore this email." How the email looks beyond that is not designed.
- **Mail leaves through an outbox.** `RequestSignInLinkCommandHandler` runs the same steps for
  every email, answers 202 with no body, and hands a mail to `ISignInMailOutbox` only when the
  email is a teammate's and under its limit. `SignInMailOutbox` (Infrastructure) is a bounded
  in-memory channel (1,000 mails; a full outbox drops the newest) that a hosted
  `SignInMailDispatcher` drains into `ISignInEmailSender`. A mail the Email source refuses is
  dropped; the teammate asks again. So neither the answer nor its time depends on the email, or
  on whether Postmark is up, and `sign_in_email_unavailable` is not used. Mails waiting when the
  process stops are lost, which costs a teammate one more request.
- **The link is `{SignInEmail:AppAddress}/sign-in#{token}`.** The address is a setting, never the
  request's `Host`, so a forged `Host` cannot make Mondino mail a teammate a link to another
  site. The token is in the fragment, so the browser sends it to no server when the link is
  opened, and the page sends it to the API in a request body and takes it out of the address
  with `replaceUrl`.
- **The token** is 32 random bytes (256 bits) from `RandomNumberGenerator`, base64url without
  padding (43 characters). The database keeps its SHA-256 hash (`SignInLink.TokenHash`, unique),
  never the token.
- **The email is kept with the link only sealed by the link's own token.** `SignInLink` holds the
  email's fingerprint (ADR 0009), to count and to find the teammate, and `SealedEmail`: the
  address encrypted with AES-GCM under a key derived from the token
  (`HMAC-SHA256(token, "mondino sign-in email")`), so only the holder of the link can read it
  back. Opening a good link whose email is on no team (the teammate left after asking) names the
  email on "You need an invite link" (L2-052 criterion 10) from it. A database read on its own
  gives no address, as ADR 0009 requires.
- **The limits.** One client may ask for 5 links in 15 minutes (`sign-in-link`) and open 10 a
  minute (`sign-in-redemption`), then 429 with `Retry-After` (L2-045 criteria 7 and 9). Every
  request, known email or not, stores a `SignInLink`; past 3 stored in the last 15 minutes for
  one fingerprint, by `TimeProvider`, nothing more is stored or mailed, and the answer is the same
  202 (criterion 8). Links past their expiry are deleted by the next request for the same email;
  no timer runs. Both actions carry `[SameSiteOnly]` (ADR 0008).
- **Opening a link uses it once.** `SignInLink.TryUse(now)` sets `UsedAt` when the link is unused
  and not expired; `UsedAt` is a concurrency token, and one instance lets one redemption of a
  token run at a time, so two requests with one token start one session. A link that is unknown,
  used or expired is refused with 410 and `sign_in_link_unusable`, all three alike.
- **An email on several teams opens the team its teammate joined or made last** (the greatest
  `JoinedAt`). Choosing between teams is not designed; the most recent team is the one the
  teammate most likely means, and the choice is one query to change.
- **While a link is being opened, and when it cannot be used, Sign In shows its default form**
  (`sign-in/default`). Neither state is drawn (`docs/mocks/README.md`, open question 2), so no
  screen of their own is built; the form is the designed way to ask for a new link. A 429 on
  asking for a link shows the error state (`sign-in/error`), Sign In's drawn failure, until its
  own state is drawn (L2-045).
- **Sign In draws the `auth` block itself, as Create Team does.** ADR 0009 expected `AuthLayout`
  in `@mondino/components` once a second screen used it; but the block's elements inside the body
  (the title, the lead, the fields) would then be styled by the page across a component boundary,
  which `AGENTS.md` forbids (journey 1, lesson 3). The two pages share the block's styles through
  one Sass partial in the app, each in its own encapsulated stylesheet.

| Setting | Meaning | Default |
|---|---|---|
| `SignInEmail:ServerToken` | The Postmark server token the Email source is called with. A secret. | none: no mail is sent, and Sign In still answers "Check your inbox" |
| `SignInEmail:From` | The sender's address, a sender signature or a verified domain in Postmark (for example `Mondino <signin@mondino.app>`). | none: no mail is sent |
| `SignInEmail:AppAddress` | The app's own address, the start of every link (for example `https://mondino.app`). | none: no mail is sent |
| `SignInEmail:BaseAddress` | Postmark's API. | `https://api.postmarkapp.com/` |

## Consequences

- A deployment sets `SignInEmail:ServerToken`, `SignInEmail:From` and `SignInEmail:AppAddress`
  before anyone can sign in; without them the screen behaves as designed and no mail leaves.
- A refused or lost mail is not reported to the teammate: the screen cannot say so without
  saying the email is known. They ask again, within the limits.
- A teammate who joined by invite link has no email, so Sign In sends them nothing; that is open
  question 1 of the mocks, not built here.
- The sealed email is readable only with the token and is deleted with the link once it expires.
