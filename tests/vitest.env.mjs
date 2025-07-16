/**
 * Vitest Environment Setup
 * 
 * Sets up the correct environment variables before running tests.
 * This file runs before any test files are loaded.
 */

// Set NODE_ENV to test to ensure tests use the test database
process.env.NODE_ENV = 'test';

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
        message.includes('🗄️') ||
        message.includes('🧹') ||
        message.includes('🔌') ||
        message.includes('ℹ️')) {
      originalConsoleLog(...args);
    }
    // Otherwise suppress console.log for cleaner test output
  };
}

// Set test-specific environment variables
process.env.SESSION_SECRET = 'test-session-secret-32-characters-min';
process.env.BCRYPT_ROUNDS = '1'; // Faster hashing for tests

// Set default feature flags for testing
process.env.FEATURE_COMING_SOON_MODE = process.env.FEATURE_COMING_SOON_MODE || 'false';
process.env.FEATURE_MAINTENANCE_MODE = process.env.FEATURE_MAINTENANCE_MODE || 'false';
process.env.FEATURE_MYSIDELINE_SYNC = process.env.FEATURE_MYSIDELINE_SYNC || 'false';

// Set default MySideline URL for testing (used by capture script tests)
process.env.MYSIDELINE_URL = process.env.MYSIDELINE_URL || 'https://mysideline.com.au';

// Set encryption key for testing
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-encryption-key-32-characters-min';

// Console log configuration for tests
console.log('🧪 Vitest environment configuration loaded');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   BCRYPT_ROUNDS: ${process.env.BCRYPT_ROUNDS}`);
console.log(`   Database optimizations: Enabled for testing`);
console.log('');