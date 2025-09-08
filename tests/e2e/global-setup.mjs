// Global setup for Playwright E2E (ESM)
// Resets E2E database before test run for consistent state

import { resetE2EDatabase } from '../../scripts/reset-e2e-database.mjs';

/** @type {import('@playwright/test').FullConfig} */
export default async function globalSetup() {
  try {
    console.log('🚀 Starting E2E global setup...');
    
    // Reset E2E database to ensure clean state
    await resetE2EDatabase();
    
    console.log('✅ E2E global setup completed');
  } catch (error) {
    console.error('❌ E2E global setup failed:', error);
    throw error;
  }
}
