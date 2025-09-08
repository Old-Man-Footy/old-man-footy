#!/usr/bin/env node

/**
 * @file simple-e2e-reset.mjs
 * @description Simple E2E database reset script for test preparation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Reset E2E database by deleting the database file
 */
async function resetE2EDatabase() {
    console.log('🚀 Starting simple E2E database reset...');
    
    // Set environment to E2E
    process.env.NODE_ENV = 'e2e';
    
    // Path to E2E database
    const e2eDbPath = path.join(projectRoot, 'data', 'e2e-old-man-footy.db');
    
    try {
        // Delete E2E database file if it exists
        if (fs.existsSync(e2eDbPath)) {
            fs.unlinkSync(e2eDbPath);
            console.log('🗑️ Deleted existing E2E database file');
        } else {
            console.log('ℹ️ No existing E2E database file to delete');
        }
        
        console.log('✅ E2E database reset complete');
        console.log('💡 Database will be recreated automatically on next E2E test run');
        
    } catch (error) {
        console.error('❌ Error during E2E database reset:', error);
        process.exit(1);
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    await resetE2EDatabase();
}

export { resetE2EDatabase };
