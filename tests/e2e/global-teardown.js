/**
 * Global Teardown for Playwright E2E Tests
 * 
 * This file runs once after all tests to clean up the test environment
 */

async function globalTeardown() {
  console.log('🧹 Starting Playwright E2E Test Teardown...');
  
  try {
    // Import ES modules
    const { sequelize } = await import('../../config/database.mjs');
    
    // Clean up test database
    await sequelize.close();
    console.log('✅ Test database connection closed');
    
    console.log('🎯 Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error to avoid masking test failures
  }
}

export default globalTeardown;