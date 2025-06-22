/**
 * Jest Test Setup
 * 
 * Global setup and teardown for Jest tests.
 * Initializes test database and models before running tests.
 */

import { sequelize } from '../models/index.mjs';
import path from 'path';

// Global setup - runs once before all tests
beforeAll(async () => {
  try {
    // Display database connection information
    const dbPath = sequelize.options.storage;
    const dbName = path.basename(dbPath);
    const environment = process.env.NODE_ENV || 'development';
    
    console.log('🗄️  Database Connection Information:');
    console.log(`   Environment: ${environment}`);
    console.log(`   Database File: ${dbName}`);
    console.log(`   Full Path: ${dbPath}`);
    console.log('');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Test database connection established successfully.');
    
    // Disable foreign key constraints for SQLite during setup
    await sequelize.query('PRAGMA foreign_keys = OFF;');
    
    // Drop all tables first to avoid constraint issues
    await sequelize.drop();
    
    // Force sync will recreate all tables based on model definitions
    // This ensures we have all the latest schema changes including audit logs
    await sequelize.sync({ force: true });
    
    // Re-enable foreign key constraints
    await sequelize.query('PRAGMA foreign_keys = ON;');
    
    console.log('✅ Test database tables created successfully.');
    console.log('');
    
  } catch (error) {
    console.error('❌ Unable to connect to test database:', error);
    throw error;
  }
});

// Clean up between each test
afterEach(async () => {
  if (sequelize.connectionManager.pool) {
    try {
      // Only clean up data if connection is still active
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
            // console.warn(`⚠️ Cleanup warning for ${modelName}:`, cleanupError.message);
          }
        }
      }
      
      // Re-enable foreign key constraints
      await sequelize.query('PRAGMA foreign_keys = ON;');
      
    } catch (error) {
      // console.warn('⚠️ Test cleanup warning:', error.message);
    }
  }
});

// Global teardown - runs once after all tests
afterAll(async () => {
  try {
    // Check if connection is still open before attempting to close
    if (sequelize.connectionManager && 
        sequelize.connectionManager.pool && 
        !sequelize.connectionManager.pool._draining) {
      await sequelize.close();
      console.log('✅ Test database connection closed.');
    }
  } catch (error) {
    // Only log actual errors, not "already closed" situations
    if (error.code !== 'SQLITE_MISUSE') {
      console.error('❌ Error closing test database connection:', error);
    }
  }
});