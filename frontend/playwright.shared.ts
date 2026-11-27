import type { PlaywrightTestConfig } from '@playwright/test';
import { devices } from '@playwright/test';

export const port = Number(process.env['E2E_PORT'] ?? 4310);
export const baseURL = `http://127.0.0.1:${port}`;

/** What every e2e project shares: Chromium only, the built app on localhost, no retries. */
export const shared: PlaywrightTestConfig = {
  forbidOnly: !!process.env['CI'],
  fullyParallel: true,
  reporter: process.env['CI'] ? [['github'], ['list']] : 'list',
  retries: 0,
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    locale: 'en-GB',
    timezoneId: 'Europe/Rome',
    trace: 'off',
  },
  webServer: {
    command: 'node e2e/support/serve.mjs',
    url: baseURL,
    reuseExistingServer: !process.env['CI'],
    timeout: 30_000,
  },
};
