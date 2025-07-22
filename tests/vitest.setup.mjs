/**
 * Vitest Setup
 * 
 * Runs before each test file.
 * Sets up environment variables and test configuration.
 */

import { afterEach } from 'vitest';

// Set NODE_ENV to test to ensure tests use the test database
process.env.NODE_ENV = 'test';

// Set test-specific environment variables
process.env.SESSION_SECRET = 'test-session-secret-32-characters-min';
process.env.BCRYPT_ROUNDS = '1'; // Faster hashing for tests

// Only disable console.log for general test output, but allow database connection info
if (!process.env.VITEST_VERBOSE) {
  const originalConsoleLog = console.log;
  console.log = (...args) => {
    // Allow database connection information to be displayed
    const message = args.join(' ');
    if (message.includes('Database Connection Information') || 
        message.includes('Environment:') || 
        message.includes('Database File:') || 
        message.includes('Full Path:') ||
        message.includes('✅') ||
        message.includes('❌') ||
        message.includes('🗄️')) {
      originalConsoleLog(...args);
    }
    // Otherwise suppress console.log for cleaner test output
  };
}
