#!/usr/bin/env node
// Save the screenshots of a video: run <folder>/shots.ts in Chromium against the built app.
//
//   node tools/video-record/record.mjs docs/videos/NN-topic
//
// Not a test and not a sweep (docs/videos/README.md): it compares nothing. The production build in
// frontend/dist is served on :4310 by frontend/e2e/support/serve.mjs (run `npx ng build` in
// frontend/ first); shots.ts imports the shared fixture of frontend/e2e/fixtures/test.ts, as every
// spec does, so the API is answered from fixtures and the clock is the mocks' "now".
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const folder = path.resolve(process.argv[2] ?? '');
if (!process.argv[2] || !fs.existsSync(path.join(folder, 'shots.ts'))) {
  console.error('usage: node tools/video-record/record.mjs <video folder with a shots.ts>');
  process.exit(2);
}
const modules = path.join(root, 'frontend', 'node_modules');
const env = { ...process.env, MO_VIDEO_DIR: folder, NODE_PATH: modules };

const run = spawnSync(
  process.execPath,
  [path.join(modules, '@playwright', 'test', 'cli.js'), 'test', '-c', path.join(root, 'tools', 'video-record', 'playwright.config.ts'), '--trace', 'off', ...process.argv.slice(3)],
  { cwd: path.join(root, 'frontend'), env, stdio: 'inherit' },
);
if (run.status === 0) {
  const shots = path.join(folder, 'shots');
  const saved = fs.existsSync(shots) ? fs.readdirSync(shots).filter((f) => f.endsWith('.png')) : [];
  console.log(`${saved.length} PNG in ${shots}`);
}
process.exit(run.status ?? 1);
