# 00 · Meet Mondino

The explainer. Every feature [mondino.world](https://mondino.world/) serves, in one film: the
question Mondino answers, the three ways in (Create Team, Join, Sign In), the 3D globe, pins, a
teammate's panel, status, who is in working hours, the Team page, a team of hundreds, the invite link, every
screen in light and dark, what comes next, and what Mondino is. It is the film to put in front of
someone who has never heard of Mondino.

- **Film:** [`00-meet-mondino.mp4`](00-meet-mondino.mp4), 1920×1080, 30 fps, 3 min 32 s, H.264 at
  CRF 23 and AAC. No captions in the picture; [`captions.vtt`](captions.vtt) is beside it.
- **Voice:** Kokoro-82M (`af_heart`) from Hugging Face, run locally.
- **Music:** *Beautiful Boom Bap* by Music_Unlimited, from Pixabay
  ([credits](../assets/music/CREDITS.md)). 92.99 BPM; a bar is 2.58 s.
- **Look:** Mondino's own: paper, ink, pin and sun from `docs/design-system/tokens/tokens.css`,
  Gabarito for headlines and the wordmark, Inter for what is read.
- **Tone:** an explainer, so it speaks to what a teammate sees. The close quotes the Purpose of
  `AGENTS.md` word for word.

## Run sheet

| At | Bars | Scene | Picture | Headline |
|---|---|---|---|---|
| 0:00 | 3 | `hook` | The lockup and the Globe over the aurora | What is it like **there, right now?** |
| 0:08 | 3 | `problem` | Three names with their UTC offsets, drawn | Names and time zones **tell you nothing.** |
| 0:15 | 3 | `meet` | The lockup on pin; the Globe on a phone | mondino |
| 0:23 | 5 | `create` | Create Team's form, then "Now bring everyone in." | Start a team. **In a minute.** |
| 0:36 | 5 | `join` | Join before and after the postal code is found | Put yourself **on the map.** |
| 0:49 | 3 | `private` | Join on a phone | Only the city **is shown.** |
| 0:57 | 4 | `signin` | Sign In, then "Check your inbox" | Welcome back. **No password.** |
| 1:07 | 4 | `globe` | The Globe in dark | Lit, shaded, **and turning.** |
| 1:17 | 5 | `pins` | The Globe with a group pin selected, and its panel | A person, a clock **and a sky.** |
| 1:30 | 6 | `panel` | Tomás's pin selected, and his panel | Select a pin. **Meet them.** |
| 1:46 | 4 | `status` | Noah's panel, "Probably asleep" | From the **local hour.** |
| 1:56 | 4 | `week` | The Globe and "In working hours now" | Who is working **right now?** |
| 2:06 | 6 | `team` | Team at 1440 and 390 px, and its day ribbon | Everyone, **through their day.** |
| 2:22 | 4 | `large` | A team of 500 as group pins | Hundreds, **still readable.** |
| 2:32 | 4 | `invite` | The invite dialog, and its sheet on a phone | Bring **everyone in.** |
| 2:43 | 4 | `everywhere` | The Globe growing from 390 to 1440 px, then dark | Every screen, **light and dark.** |
| 2:53 | 4 | `next` | *Coming next:* Moments, Profile & Settings | Coming **next.** |
| 3:03 | 11 | `close` | The lockup and what Mondino is, over the aurora | mondino |

Act changes: a paper wipe into `meet`, a zoom from `signin` into `globe`, a sun wipe into `week`,
and ink wipes into `invite` and `next`. The mark sits in the corner between the opening and the
close.

## Where the pictures come from

Every screenshot is of the built app (`frontend/dist`, the build of `main` that the film was made
from), saved by [`shots.ts`](shots.ts); nothing is taken from `docs/mocks/`. The team is the mocks'
cast, Northwind and its thirteen teammates, answered from the e2e fixtures at the mocks' "now"
(Monday 27 October 2025, 15:05 in Milan), so no real teammate, email or postal code is on screen.
The built app is served on `127.0.0.1:4310`, and makes its invite link from its own origin;
`shots.ts` writes that link with `mondino.world` as its host and changes nothing else.

Only what is built is shown as built. "This week around the world" has no moments yet, so the
film shows "In working hours now" from that panel, and names Moments and Profile & Settings as
coming next.

## Build it again

From the repository root, with the frontend's dependencies installed (`npm ci` in `frontend/`):

```shell
cd frontend && npx ng build && cd ..
node tools/video-record/record.mjs docs/videos/00-meet-mondino
python tools/video-audio/film_audio.py docs/videos/00-meet-mondino
node tools/video-build/build.mjs docs/videos/00-meet-mondino --crf 23
```

`--captions` on the last command burns the captions into the picture.
