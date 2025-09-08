#!/usr/bin/env node

/**
 * Simple E2E Database Reset Script
 * 
 * This script provides a clean, straightforward way to reset the E2E database
 * for testing purposes. It handles common issues like locked database files
 * and environment setup.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// E2E database configuration
const E2E_DB_PATH = path.join(projectRoot, 'data', 'e2e-old-man-footy.db');

/**
 * Kill any Node.js processes that might be locking the database
 */
function killNodeProcesses() {
  try {
    console.log('🛑 Stopping any running Node.js processes...');
    execSync('taskkill /F /IM node.exe', { stdio: 'ignore' });
    console.log('✅ Node.js processes stopped');
  } catch (error) {
    console.log('ℹ️ No Node.js processes to stop');
  }
}

/**
 * Wait for processes to fully terminate
 */
function waitForProcessCleanup() {
  console.log('⏳ Waiting for process cleanup...');
  return new Promise(resolve => setTimeout(resolve, 2000));
}

/**
 * Reset the E2E database
 */
function resetE2EDatabase() {
  try {
    console.log('🗑️ Removing existing E2E database...');
    
    // Check if database exists and remove it
    if (fs.existsSync(E2E_DB_PATH)) {
      fs.unlinkSync(E2E_DB_PATH);
      console.log('✅ E2E database removed');
    } else {
      console.log('ℹ️ E2E database did not exist');
    }
    
    // Run migrations to recreate the database
    console.log('🔧 Running migrations to recreate E2E database...');
    execSync('npm run migrate', { 
      env: { ...process.env, NODE_ENV: 'e2e' },
      stdio: 'inherit',
      cwd: projectRoot
    });
    
    console.log('✅ E2E database reset complete');
    
  } catch (error) {
    console.error('❌ Failed to reset E2E database:', error.message);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('🎯 Starting E2E database reset...\n');
    
    // Step 1: Kill processes
    killNodeProcesses();
    
    // Step 2: Wait for cleanup
    await waitForProcessCleanup();
    
    // Step 3: Reset database
    resetE2EDatabase();
    
    console.log('\n🎉 E2E database reset successful!');
    console.log('💡 You can now run your E2E tests with: npm run test:e2e');
    
  } catch (error) {
    console.error('\n💥 E2E database reset failed:', error.message);
    process.exit(1);
  }
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;
