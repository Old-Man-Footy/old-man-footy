import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for E2E Testing
 * 
 * Simple configuration that expects the server to be started manually
 * before running tests. This avoids the infinite loop issues we've been
 * experiencing with automatic server startup.
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  
  // Timeout for each test
  timeout: 30000,
  
  // Global timeout
  globalTimeout: 300000,
  
  // Expect timeout
  expect: {
    timeout: 5000,
  },
  
  // Fail fast on CI
  fullyParallel: false,
  
  // Forbid test.only on CI
  forbidOnly: !!process.env.CI,
  
  // Number of retries
  retries: process.env.CI ? 2 : 0,
  
  // Run tests in parallel (disabled for database consistency)
  workers: 1,
  
  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: 'http://localhost:3050',
    
    // Capture screenshot on failure
    screenshot: 'only-on-failure',
    
    // Capture video on failure
    video: 'retain-on-failure',
    
    // Capture trace on failure
    trace: 'retain-on-failure',
    
    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // Increase timeouts for navigation
    actionTimeout: 10000,
    navigationTimeout: 10000,
  },
  
  // Test projects
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Add extra time for slow operations
        actionTimeout: 15000,
        navigationTimeout: 15000,
      },
    },
  ],
  
  // Output directory
  outputDir: 'test-results/',
  
  // Global setup and teardown
  globalSetup: './tests/e2e/global-setup-simple.mjs',
  
  // Note: No webServer configuration - server must be started manually
  // This avoids the infinite loop issues we've been experiencing
});
