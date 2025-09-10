// Global setup for Playwright E2E (ESM)
// Database initialization and seeding for E2E tests
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('@playwright/test').FullConfig} */
export default async function globalSetup() {
  try {
    console.log('🚀 Starting E2E global setup...');
    
    // Database initialization is handled by the E2E server startup script
    console.log('📊 Database initialization delegated to server startup script');
    
    // Run E2E seed script to populate test data
    console.log('🌱 Seeding E2E test data...');
    const seedScript = resolve(__dirname, '../../scripts/e2e-seed-data.mjs');
    
    await new Promise((resolve, reject) => {
      const seedProcess = spawn('node', [seedScript], {
        env: { ...process.env, NODE_ENV: 'e2e' },
        stdio: 'inherit'
      });
      
      seedProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ E2E test data seeded successfully');
          resolve();
        } else {
          reject(new Error(`E2E seed script failed with code ${code}`));
        }
      });
      
      seedProcess.on('error', (error) => {
        reject(new Error(`Failed to run E2E seed script: ${error.message}`));
      });
    });
    
    console.log('✅ E2E global setup completed');
  } catch (error) {
    console.error('❌ E2E global setup failed:', error);
    throw error;
  }
}
