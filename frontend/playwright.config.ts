import { defineConfig } from '@playwright/test';
import { shared } from './playwright.shared';

// The behaviour specs: what runs by default, locally and in CI.
// The visual, responsive and accessibility sweeps are in playwright.sweeps.config.ts and run
// only when a person asks for them.
export default defineConfig({
  ...shared,
  testDir: './e2e/specs',
  projects: [{ name: 'behaviour' }],
});
