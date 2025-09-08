/**
 * E2E Server Startup Script with Database Initialization
 * Ensures E2E database is properly initialized before starting the server
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Set E2E environment IMMEDIATELY at the top of the script
process.env.NODE_ENV = 'e2e';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const E2E_DB_PATH = path.join(__dirname, '..', 'data', 'e2e-old-man-footy.db');

/**
 * Initialize E2E database with proper schema
 */
async function initializeE2EDatabase() {
  console.log('🔧 Initializing E2E database...');
  console.log('🌍 Environment:', process.env.NODE_ENV);
  
  try {
    // Remove existing E2E database if it exists
    if (fs.existsSync(E2E_DB_PATH)) {
      fs.unlinkSync(E2E_DB_PATH);
      console.log('🗑️ Removed existing E2E database');
    }

    // Run migrations to create proper schema
    console.log('📊 Running database migrations...');
    execSync('npm run migrate', {
      env: { ...process.env, NODE_ENV: 'e2e' },
      stdio: 'inherit'
    });

    console.log('✅ E2E database initialization completed');
  } catch (error) {
    console.error('❌ E2E database initialization failed:', error);
    throw error;
  }
}

/**
 * Start the application server
 */
function startServer() {
  console.log('🚀 Starting E2E application server...');
  console.log('🌍 Server starting with NODE_ENV:', process.env.NODE_ENV);
  
  // Set additional E2E environment variables
  process.env.PORT = '3056';
  process.env.SESSION_SECRET = 'test-session-secret-32-characters-min';
  process.env.FEATURE_COMING_SOON_MODE = 'false';
  process.env.FEATURE_MAINTENANCE_MODE = 'false';
  
  // Import and start the application
  import('../app.mjs').then(() => {
    console.log('✅ E2E server started successfully');
  }).catch(error => {
    console.error('❌ Failed to start E2E server:', error);
    process.exit(1);
  });
}

/**
 * Main function to initialize database and start server
 */
async function main() {
  try {
    console.log('🎯 Starting E2E environment setup...');
    console.log('🌍 NODE_ENV confirmed as:', process.env.NODE_ENV);
    
    // First, initialize the database
    await initializeE2EDatabase();
    
    // Then start the server
    startServer();
  } catch (error) {
    console.error('❌ E2E startup failed:', error);
    process.exit(1);
  }
}

// Run the main function
main();
