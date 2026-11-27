#!/usr/bin/env node
// Runs every CI check and the unit tests locally, on any OS: node tools/verify/verify.mjs
// The frontend and the backend run side by side; inside each, the steps run in order and stop
// at the first failure. Run it before pushing.
//
// It runs only the behaviour specs. The visual, responsive, accessibility and performance sweeps
// run when a person asks for them (frontend/package.json: e2e:visual, e2e:responsive,
// e2e:accessibility, e2e:performance).

import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const tracks = [
  {
    name: 'frontend',
    cwd: resolve(root, 'frontend'),
    steps: [
      ['format', 'npm run format:check'],
      ['lint', 'npm run lint'],
      ['unit tests', 'npm test'],
      ['build', 'npm run build'],
      ['e2e type check', 'npm run e2e:typecheck'],
      ['behaviour specs', 'npm run e2e:only'],
    ],
  },
  {
    name: 'backend',
    cwd: resolve(root, 'backend'),
    steps: [
      ['format', 'dotnet format --verify-no-changes'],
      ['build', 'dotnet build --nologo'],
      ['tests', 'dotnet test --no-build --nologo --filter "Category!=Performance"'],
    ],
  },
];

function run(command, cwd) {
  return new Promise((done) => {
    const child = spawn(command, { cwd, shell: true, env: { ...process.env, CI: process.env.CI ?? '' } });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    child.on('error', (error) => done({ code: 1, output: `${output}\n${error.message}` }));
    child.on('close', (code) => done({ code: code ?? 1, output }));
  });
}

async function runTrack(track) {
  for (const [label, command] of track.steps) {
    const started = Date.now();
    const { code, output } = await run(command, track.cwd);
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    if (code !== 0) {
      console.log(`✗ ${track.name}: ${label} (${seconds}s)  ${command}\n${output.trimEnd()}\n`);
      return false;
    }
    console.log(`✓ ${track.name}: ${label} (${seconds}s)`);
  }
  return true;
}

const started = Date.now();
const results = await Promise.all(tracks.map(runTrack));
const seconds = ((Date.now() - started) / 1000).toFixed(1);
if (results.every(Boolean)) {
  console.log(`\nEvery check passed in ${seconds}s.`);
} else {
  console.log(`\nA check failed after ${seconds}s. Fix it before pushing.`);
  process.exitCode = 1;
}
