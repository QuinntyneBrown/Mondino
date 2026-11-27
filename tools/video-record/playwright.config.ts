import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Saves the screenshots of a video (docs/videos/README.md, "Screenshots"). It is not a test run
 * and not a sweep: it borrows Playwright to open the built Angular app and save pictures of it.
 * The video folder's `shots.ts` says which states to open, with the shared fixture and page objects
 * of `frontend/e2e/`, as every spec does. Neither `npm run e2e` nor CI reads this file. Run it with
 * `node tools/video-record/record.mjs <folder>`.
 */
const folder = process.env['MO_VIDEO_DIR'];
if (!folder) throw new Error('Run this through tools/video-record/record.mjs <video folder>.');
const root = path.resolve(__dirname, '..', '..');

export default defineConfig({
  testDir: path.resolve(root, folder),
  testMatch: 'shots.ts',
  outputDir: path.resolve(root, '.cache', 'video-record'),
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 120_000,
  use: {
    baseURL: 'http://127.0.0.1:4310',
    locale: 'en-GB',
    timezoneId: 'Europe/Rome',
    trace: 'off',
  },
  // Chromium only (AGENTS.md), at double density. `frame(page, 'XS')` in shots.ts sets the window.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
    },
  ],
  webServer: {
    command: 'node e2e/support/serve.mjs',
    cwd: path.resolve(root, 'frontend'),
    url: 'http://127.0.0.1:4310',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
