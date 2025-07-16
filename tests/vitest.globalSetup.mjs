/**
 * Vitest Global Setup
 * 
 * Runs once before all tests start.
 * Sets up the test environment and database.
 */

import { sequelize } from '../models/index.mjs';

export async function setup() {
  try {
    // Set NODE_ENV to test to ensure tests use the test database
    process.env.NODE_ENV = 'test';
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Test database connection established successfully.');
    
    // Disable foreign key constraints for SQLite during setup
    await sequelize.query('PRAGMA foreign_keys = OFF;');
    
    // Drop all tables first to avoid constraint issues
    await sequelize.drop();
    
    // Force sync will recreate all tables based on model definitions
    await sequelize.sync({ force: true });
    
    // Re-enable foreign key constraints
    await sequelize.query('PRAGMA foreign_keys = ON;');
    
    console.log('✅ Test database tables created successfully.');
    
  } catch (error) {
    console.error('❌ Unable to connect to test database:', error);
    throw error;
  }
}

export async function teardown() {
  try {
    if (sequelize?.connectionManager?.pool) {
      await sequelize.close();
      console.log('✅ Test database connection closed.');
    }
  } catch (error) {
    console.error('❌ Error closing test database:', error);
  }
}