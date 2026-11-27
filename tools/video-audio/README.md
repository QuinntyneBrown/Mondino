# video-audio

Speaks a video's `narration.json` with Kokoro-82M, fits each line to its scene, mixes the music
under it, and writes the MP3, `captions.vtt` and `timing.js`. Standard: `docs/videos/README.md`,
"Narration" and "Music".

```
python tools/video-audio/film_audio.py docs/videos/NN-topic          # everything
python tools/video-audio/film_audio.py docs/videos/NN-topic --grid   # timing.js only, nothing spoken
python tools/video-audio/tempo.py docs/videos/assets/music/<slug>.mp3   # the track's BPM and first beat
```

Needs Python 3.10 or later with `pip install kokoro-onnx numpy`, and ffmpeg on the path
(`FFMPEG_PATH` overrides). The model and the voice are taken from `.cache/kokoro` (`KOKORO_DIR`
overrides; `kokoro.onnx` and `af_heart.bin`), else from the Hugging Face cache in the home folder,
else downloaded once from `onnx-community/Kokoro-82M-v1.0-ONNX`. Spoken lines are cached in
`.cache/kokoro/lines` by voice, speed and text. `.cache/` is never committed.

## `narration.json`

| Field | Meaning | Default |
|-------|---------|---------|
| `voice` | A Kokoro voice. | `af_heart` |
| `bpm` | The tempo of the track (`tempo.py` measures it). Required. | |
| `beatsPerBar` | Beats in a bar. | 4 |
| `gapBeats` | Music alone between two lines, and between the last line of a scene and the cut. | 1 |
| `outroSeconds` | Music alone at the end; no line may run into it. | 3 |
| `music.file` | The track, relative to the video folder. | |
| `music.offset` | Seconds of the track to skip, so film time 0 falls on a beat. | 0 |
| `music.duckDb` | How far under the voice the music sits while a line is spoken. | 16 |
| `music.betweenDb` | How far under the voice it sits between lines. | 5 |
| `music.fadeSeconds` | The fade at the very end, inside the outro. | 2 |
| `scenes[].id` | The name `film.js` draws the scene by. Scenes play in order. | |
| `scenes[].bars` or `.seconds` | The scene's length. Use bars, so cuts fall on the grid. | |
| `scenes[].lines[]` | A string, or `{ "text", "at", "caption" }`. `at` is the beat of the scene the line starts on; `caption` replaces the text in `captions.vtt`. | |

Each line is spoken at the slowest speed from 1.0 to 1.8 at which it fits its window; the tool
stops, naming the scene and the line, when 1.8 is not enough. Nothing is spoken in the first bar
of the film. The mix is 44.1 kHz stereo at about −16 LUFS; a track shorter than the film loops on
a whole number of bars. `narration.wav`, the voice alone, is never committed.
