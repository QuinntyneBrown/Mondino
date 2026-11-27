# video-build

Opens a video folder's `slides.html` in headless Chromium, seeks it frame by frame and encodes the
MP4 with ffmpeg. Standard: `docs/videos/README.md`, "Slides and motion".

```
node tools/video-build/build.mjs docs/videos/NN-topic --check                # the schedule and how each line fits
node tools/video-build/build.mjs docs/videos/NN-topic --frame 12.5 out.png   # one frame, at film seconds
node tools/video-build/build.mjs docs/videos/NN-topic                        # NN-topic.mp4, no captions in the picture
node tools/video-build/build.mjs docs/videos/NN-topic --captions             # the same, captions burned in
```

`--crf <n>` sets the quality (default 21; 20 to 25). `FFMPEG_PATH` overrides ffmpeg, which needs
libx264. Playwright is the copy in `frontend/node_modules` (found there, or through `NODE_PATH`).
Run `tools/video-audio` first: the build needs `timing.js` and, for the MP4, the MP3.

What it does: 1920×1080 at 30 fps; one `window.seek(seconds)` and one JPEG a frame, piped to
ffmpeg (`libx264 -preset slow -pix_fmt yuv420p -movflags +faststart`, AAC from the MP3); the page
is reopened every 600 frames and a frame is retried after a crash; the film is written to
`name.partial.mp4` and renamed when ffmpeg ends well.

It stops with an error, encoding nothing, when a font is not loaded, a picture is missing, a
request fails, a scene of `narration.json` has no drawing, a token does not exist, a WebGL context
cannot be made or a script throws.

Opened by a person, `slides.html` plays against the MP3: Space plays and pauses, the arrows step a
beat, C shows captions, `?t=12.5` opens on that time. The API a `film.js` is written against is
described at the top of `docs/videos/assets/film-runtime.js` and `docs/videos/assets/film-kit.js`.
