/**
 * Playwright Configuration for Old Man Footy (ESM)
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'test-results/playwright-report' }],
    ['json', { outputFile: 'test-results/test-results.json' }],
    ['line']
  ],
  use: {
    baseURL: process.env.APP_URL || 'http://localhost:3056',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    actionTimeout: 30000,
    navigationTimeout: 60000,
  },
  globalSetup: './tests/e2e/global-setup.mjs',
  globalTeardown: './tests/e2e/global-teardown.mjs',
  projects: [
    {
      name: 'chromium-debug',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { slowMo: 1000 },
      },
    },
  ],
  webServer: {
    command: 'node scripts/start-e2e-server-isolated.mjs',
    url: 'http://localhost:3056',
    reuseExistingServer: false,
    timeout: 120 * 1000,
    env: {
      NODE_ENV: 'e2e',
      PORT: '3056',
      SESSION_SECRET: 'test-session-secret-32-characters-min',
      FEATURE_COMING_SOON_MODE: 'false',
      FEATURE_MAINTENANCE_MODE: 'false',
    },
  },
  timeout: 30 * 1000,
  expect: { timeout: 5 * 1000 },
  outputDir: 'test-results/playwright-output',
});
