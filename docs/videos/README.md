# Mondino videos

One folder per video. The text files are the source; the media is generated from them. Where this
page differs from the defaults of the `creating-videos` skill (edge-tts, burned-in captions, a
slide per cue), this page wins: the films follow the standard of the owner's sibling repository
`wattzup` (its `docs/videos/README.md`), with the same tools, voice, music, effects, transitions
and motion, in Mondino's own brand.

| Video | Runtime | What it is |
|-------|---------|------------|
| [Meet Mondino](00-meet-mondino/README.md) | 3:32 | The explainer: every feature mondino.world serves. The question; Create Team, Join and Sign In; only the city is shown; the 3D globe; pins; a teammate's panel with offset, status, weather and overlap; who is in working hours; the Team page and its day ribbon; a team of 500; the invite link; every screen in light and dark; what comes next; and what Mondino is |

## A video folder

```
docs/videos/NN-topic/
  narration.json    the voice, the grid, the scenes and their lines      (you write)
  film.js           one Film.scene(...) per scene of narration.json       (you write)
  shots.ts          which states of the app to photograph                 (you write)
  slides.html       links the tokens, film.css, timing.js, the runtime    (you write; copy one)
  README.md         what the film is, its run sheet, how to build it      (you write)
  script.md         the transcript, scene by scene                        (from narration.json)
  shots/            the screenshots, at double density                    (tools/video-record)
  timing.js         the grid, the spoken lines and the captions           (tools/video-audio)
  captions.vtt      captions in film time                                 (tools/video-audio)
  NN-topic.mp3      the voice over the ducked music                       (tools/video-audio)
  NN-topic.mp4      1920×1080, 30 fps, no captions in the picture         (tools/video-build)
```

## The standard

- **Narration.** Kokoro-82M, voice `af_heart`, run locally. A line is spoken at the slowest speed
  from 1.0 to 1.8 that fits its window; shorten a line or add a bar before letting it speed up.
- **Music.** *Beautiful Boom Bap* ([credits](assets/music/CREDITS.md)), 92.99 BPM, 16 dB under the
  voice while a line is spoken and 5 dB under it between lines. Scenes are whole bars, so every
  cut falls on the beat; nothing is spoken in the first bar or the last three seconds.
- **Captions.** Off in the picture by default; `captions.vtt` is beside the film, and
  `build.mjs --captions` burns them in.
- **Slides and motion.** A 1920×1080 stage drawn by `assets/film-runtime.js` and
  `assets/film-kit.js`. Every pixel is a pure function of film time: no CSS animation, transition,
  timer or `Math.random`. A scene opens with a kicker and a headline whose words rise one by one,
  some in the accent colour; screenshots arrive in a phone, a tablet or a browser window; a
  close-up pops in with a ring; numbered cards rise on the beat of the word they illustrate. A
  change of act is a wipe in a brand colour or a zoom; inside an act the cuts are hard. The mark
  sits in the corner between the opening and the close, which quotes the Purpose of `AGENTS.md`.
- **Brand.** `assets/film.css` reads `docs/design-system/tokens/tokens.css`: paper and ink carry
  the frame, pin marks people, sun marks moments, the globe keeps colours of its own. Gabarito
  for the wordmark, headlines and numbers; Inter for what is read. The wordmark is lowercase
  **mondino**.
- **Screenshots.** Of the built app only, never of `docs/mocks/`, through `shots.ts` with the e2e
  fixture and page objects: the mocks' cast at the mocks' "now", so no real teammate is on screen.
  A film shows as built only what is built, and names the rest as coming next.

## Tools

| Tool | What it does |
|------|--------------|
| [`tools/video-record`](../../tools/video-record/README.md) | Saves `shots/` from `shots.ts` |
| [`tools/video-audio`](../../tools/video-audio/README.md) | Speaks `narration.json`, mixes the music, writes the MP3, `captions.vtt` and `timing.js` |
| [`tools/video-build`](../../tools/video-build/README.md) | Renders `slides.html` frame by frame and encodes the MP4 |
