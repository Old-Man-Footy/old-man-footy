/**
 * Playwright Configuration for Old Man Footy
 * 
 * End-to-end testing configuration following security best practices
 * and project guidelines.
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  
  // Run tests sequentially instead of parallel for easier debugging
  fullyParallel: false,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Run tests one at a time for easier debugging
  workers: 1,
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'test-results/playwright-report' }],
    ['json', { outputFile: 'test-results/test-results.json' }],
    ['line']
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
  baseURL: process.env.APP_URL || 'http://localhost:3055',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
    
    // Viewport size
    viewport: { width: 1280, height: 720 },
    
    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
    
    // Timeout for each action (increased for debugging)
    actionTimeout: 30000,
    
    // Timeout for navigation (increased for debugging)
    navigationTimeout: 60000,
  },
  
  // Global setup and teardown
  globalSetup: './tests/e2e/global-setup.mjs',
  globalTeardown: './tests/e2e/global-teardown.mjs',
  
  // Configure projects for major browsers - run one at a time
  projects: [
    {
      name: 'chromium-debug',
      use: { 
        ...devices['Desktop Chrome'],
        // Slow down for debugging
        launchOptions: {
          slowMo: 1000, // 1 second delay between actions
        }
      },
    },
    
    // Comment out other browsers for now to focus on one at a time
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    
    // Mobile testing - disabled for now
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],
  
  // Use existing server instead of starting our own
  // Comment out webServer config to use external server
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3055',
    reuseExistingServer: false,
    timeout: 120 * 1000,
    env: {
      NODE_ENV: 'test',
      PORT: '3055'
    }
  },
  
  // Test timeout
  timeout: 30 * 1000,
  
  // Expect timeout
  expect: {
    timeout: 5 * 1000
  },
  
  // Output directory
  outputDir: 'test-results/playwright-output',
});