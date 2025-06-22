/**
 * Jest Environment Setup
 * 
 * Sets up the correct environment variables before running tests.
 * This file runs before any test files are loaded.
 */

// Set NODE_ENV to test to ensure tests use the test database
process.env.NODE_ENV = 'test';

// Only disable console.log for general test output, but allow database connection info
if (!process.env.JEST_VERBOSE) {
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

// Set test-specific environment variables
process.env.SESSION_SECRET = 'test-session-secret';
process.env.BCRYPT_ROUNDS = '1'; // Faster hashing for tests