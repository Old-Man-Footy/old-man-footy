/**
 * Vitest Setup
 * 
 * Runs before each test file.
 * Sets up environment variables and test configuration.
 */

import { afterEach } from 'vitest';
import { sequelize } from '/models/index.mjs';

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

// Clean up between each test
afterEach(async () => {
  if (sequelize?.connectionManager?.pool) {
    try {
      const models = sequelize.models;
      
      // Disable foreign key constraints during cleanup
      await sequelize.query('PRAGMA foreign_keys = OFF;');
      
      // Delete in reverse dependency order to avoid foreign key conflicts
      const modelsToClean = [
        'AuditLog',           // Audit logs first as they reference users
        'CarnivalClubPlayer', // Junction tables first
        'ClubPlayer',
        'CarnivalClub',
        'CarnivalSponsor',
        'ClubSponsor',
        'ClubAlternateName',
        'SyncLog',           // System logs
        'Carnival',          // Main entities
        'Club',
        'User',
        'Sponsor',
        'EmailSubscription'
      ];
      
      for (const modelName of modelsToClean) {
        if (models[modelName]) {
          try {
            await models[modelName].destroy({ 
              where: {},
              truncate: false,  // Use delete instead of truncate to avoid FK issues
              cascade: false,
              force: true
            });
          } catch (cleanupError) {
            // Ignore cleanup errors - table might not exist or have dependencies
          }
        }
      }
      
      // Re-enable foreign key constraints
      await sequelize.query('PRAGMA foreign_keys = ON;');
      
    } catch (error) {
      // Ignore cleanup warnings
    }
  }
});