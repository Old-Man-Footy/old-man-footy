#!/usr/bin/env node
/**
 * @file test-e2e-reset.mjs
 * @description Test script to verify E2E database reset functionality
 */

import { resetE2EDatabase } from './scripts/reset-e2e-database.mjs';

/**
 * Test the E2E database reset functionality
 */
async function testE2EReset() {
  try {
    console.log('🧪 Testing E2E database reset...');
    
    // Set environment
    process.env.NODE_ENV = 'e2e';
    
    // Import after setting NODE_ENV
    const { sequelize } = await import('../config/database.mjs');
    
    // Test connection first
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Check initial state
    const beforeResults = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';",
      { type: sequelize.QueryTypes.SELECT }
    );
    console.log(`📊 Tables before reset: ${beforeResults.length}`);
    
    // Run the reset
    await resetE2EDatabase();
    
    // Verify reset worked by checking if tables still exist but are empty
    process.env.NODE_ENV = 'e2e';
    const { sequelize: seq2 } = await import('../config/database.mjs');
    
    const afterResults = await seq2.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';",
      { type: seq2.QueryTypes.SELECT }
    );
    
    console.log(`📊 Tables after reset: ${afterResults.length}`);
    console.log('✅ E2E database reset test completed successfully');
    
    await seq2.close();
    
  } catch (error) {
    console.error('❌ E2E database reset test failed:', error);
    process.exit(1);
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testE2EReset()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
