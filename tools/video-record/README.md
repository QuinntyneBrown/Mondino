# video-record

Saves a video's screenshots: runs the folder's `shots.ts` in Chromium against the built app and
writes PNGs at double density into the folder's `shots/`. Standard: `docs/videos/README.md`,
"Screenshots".

```
cd frontend && npx ng build && cd ..
node tools/video-record/record.mjs docs/videos/NN-topic
node tools/video-record/record.mjs docs/videos/NN-topic -g "invite"   # only the shots whose name matches
```

It is not a test and not a sweep. It has its own Playwright config (`playwright.config.ts` here,
matching only `shots.ts` in the given folder), compares nothing, and is not run by `npm run e2e` or
CI. The build in `frontend/dist` is served on `:4310` by `frontend/e2e/support/serve.mjs` (reused
when it is running). `shots.ts` imports the shared fixture of `frontend/e2e/fixtures/test.ts`, as
every spec does: the API is answered from fixtures, the clock is the mocks' "now", and a page
error or a request off this machine fails the run. No backend is involved.

| Helper (`shots.ts` here) | What it does |
|--------|--------------|
| `frame(page, size, theme = 'light')` | Sets the window (`'XS'` 390×780, `'M'` 768×1024, `'L'` 1024×768, `'XL'` 1440×900) and the colour scheme. Call it before opening a screen. |
| `shot(page, name)` | Saves the window as `shots/<name>.png`, once the fonts have settled. |
| `detail(locator, name, pad = 16)` | Saves one region with `pad` CSS pixels of air around it: the close-up of a scene. |
| `detailAll(locators, name, pad = 16)` | The same for the smallest region holding several. |
| `bringToTop(locator, offset = 96)` | Scrolls a region to the top of the window before a shot. |
| `pictures(page)` | Waits until every picture on the page has arrived. |

Selectors stay in the page objects of `frontend/e2e/pages/`; `shots.ts` names regions, as a spec
does.
