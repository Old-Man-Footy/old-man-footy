/**
 * Simplified Global Setup for E2E Tests
 * 
 * This setup assumes the E2E database has already been reset
 * and the server is running manually. It just validates the
 * server is accessible.
 */

import { execSync } from 'child_process';

/**
 * Wait for server to be ready
 */
async function waitForServer(url, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log('✅ Server is ready');
        return;
      }
    } catch (error) {
      console.log(`⏳ Waiting for server... (attempt ${i + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  throw new Error(`❌ Server not ready after ${maxAttempts} attempts`);
}

/**
 * Global setup function
 */
export default async function globalSetup() {
  console.log('🎯 Starting E2E test setup...');
  
  try {
    // Check if server is running
    await waitForServer('http://localhost:3050');
    
    console.log('✅ E2E setup complete');
    
  } catch (error) {
    console.error('❌ E2E setup failed:', error.message);
    console.log('\n💡 To fix this:');
    console.log('1. Run: npm run test:e2e:reset');
    console.log('2. Start server: npm run dev');
    console.log('3. Run tests: npm run test:e2e');
    throw error;
  }
}
