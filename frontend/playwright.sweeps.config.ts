import { defineConfig } from '@playwright/test';
import { shared } from './playwright.shared';

// The sweeps. They are written and kept current, and run only when a person asks:
//   npm run e2e:visual | e2e:responsive | e2e:accessibility
// Baselines are updated only for an intentional design change, after its mock has changed.
export default defineConfig({
  ...shared,
  testDir: './e2e/sweeps',
  projects: [
    { name: 'visual', testMatch: /.*\.visual\.ts/ },
    { name: 'responsive', testMatch: /.*\.responsive\.ts/ },
    { name: 'accessibility', testMatch: /.*\.accessibility\.ts/ },
  ],
});
