/**
 * Vitest Global Setup
 * 
 * Runs once before all test files.
 * Initializes test database and models before running tests.
 */

import { sequelize } from '/models/index.mjs';
import path from 'path';

/**
 * Global setup function for Vitest
 * Runs once before all test files are executed
 */
export default async function setup() {
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
}