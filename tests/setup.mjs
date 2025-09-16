/**
 * Vitest Global Setup
 *
 * Runs once before all test files.
 * Ensures test database schema is up to date by running all migrations.
 */

import { sequelize } from '../config/database.mjs';
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
    
    // Removed migration logic from setup. Migrations should be run outside Vitest, e.g. via pretest script
    
  } catch (error) {
    console.error('❌ Unable to setup test database:', error);
    throw error;
  }
}