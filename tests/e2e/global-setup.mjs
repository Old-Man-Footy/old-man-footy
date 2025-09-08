// Global setup for Playwright E2E (ESM)
// Database initialization is now handled by the E2E server startup script

/** @type {import('@playwright/test').FullConfig} */
export default async function globalSetup() {
  try {
    console.log('🚀 Starting E2E global setup...');
    
    // Database initialization is now handled by scripts/start-e2e-server.mjs
    console.log('📊 Database initialization delegated to server startup script');
    
    console.log('✅ E2E global setup completed');
  } catch (error) {
    console.error('❌ E2E global setup failed:', error);
    throw error;
  }
}
