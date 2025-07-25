/**
 * Vitest Global Teardown
 * 
 * Runs once after all test files have completed.
 * Handles final cleanup and database connection closure.
 */

import { sequelize } from '/models/index.mjs';

/**
 * Global teardown function for Vitest
 * Ensures proper cleanup after all tests are complete
 */
export default async function teardown() {
  try {
    console.log('🧹 Starting global test teardown...');
    
    // Clear any global timeouts or intervals that might have been set during tests
    if (global.mySidelineInitTimeout) {
      clearTimeout(global.mySidelineInitTimeout);
      global.mySidelineInitTimeout = null;
    }
    
    // Clear subscription attempts cache if it exists
    if (global.subscriptionAttempts) {
      global.subscriptionAttempts.clear();
      global.subscriptionAttempts = null;
    }
    
    // Clean up any other global test artifacts
    if (global.testArtifacts) {
      global.testArtifacts = null;
    }
    
    // Close database connection if it's still open
    if (sequelize && sequelize.connectionManager) {
      try {
        // Check if connection is still active
        if (sequelize.connectionManager.pool && 
            !sequelize.connectionManager.pool._draining &&
            !sequelize.connectionManager.pool.destroyed) {
          
          console.log('🔌 Closing database connection...');
          await sequelize.close();
          console.log('✅ Test database connection closed.');
        } else {
          console.log('ℹ️  Database connection already closed.');
        }
      } catch (error) {
        // Only log actual errors, not "already closed" situations
        if (error.code !== 'SQLITE_MISUSE' && 
            !error.message.includes('Database is closed') &&
            !error.message.includes('already closed')) {
          console.error('❌ Error closing test database connection:', error.message);
        } else {
          console.log('ℹ️  Database connection already closed.');
        }
      }
    }
    
    // Reset environment variables to prevent test pollution
    const testEnvVars = [
      'FEATURE_COMING_SOON_MODE',
      'FEATURE_MAINTENANCE_MODE', 
      'FEATURE_MYSIDELINE_SYNC',
      'MYSIDELINE_URL'
    ];
    
    testEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        delete process.env[envVar];
      }
    });
    
    console.log('✅ Global test teardown completed successfully.');
    
  } catch (error) {
    console.error('❌ Error during global teardown:', error);
    // Don't throw the error to avoid breaking the test process
  }
}
