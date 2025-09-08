#!/usr/bin/env node

/**
 * @file setup-e2e-database.mjs
 * @description Complete E2E database setup script that:
 * 1. Deletes existing E2E database
 * 2. Runs all migrations to create proper schema
 * 3. Ready for clean E2E testing
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const e2eDbPath = path.join(projectRoot, 'data', 'e2e-old-man-footy.db');

/**
 * Execute command with proper environment and error handling
 */
function executeCommand(command, description) {
    console.log(`\n🔧 ${description}...`);
    try {
        const result = execSync(command, {
            cwd: projectRoot,
            env: { ...process.env, NODE_ENV: 'e2e' },
            stdio: 'inherit'
        });
        console.log(`✅ ${description} completed successfully`);
        return result;
    } catch (error) {
        console.error(`❌ ${description} failed:`, error.message);
        throw error;
    }
}

/**
 * Setup E2E database from scratch
 */
async function setupE2EDatabase() {
    console.log('🚀 Starting E2E Database Setup...');

    try {
        // Step 1: Remove existing E2E database
        if (fs.existsSync(e2eDbPath)) {
            console.log(`\n🗑️ Removing existing E2E database: ${e2eDbPath}`);
            fs.unlinkSync(e2eDbPath);
            console.log('✅ Existing E2E database removed');
        } else {
            console.log('\n📝 No existing E2E database found');
        }

        // Step 2: Run all migrations to create schema
        executeCommand(
            'npm run migrate',
            'Running migrations to create database schema'
        );

        // Step 3: Verify database exists and has tables
        if (!fs.existsSync(e2eDbPath)) {
            throw new Error('E2E database was not created by migrations');
        }

        console.log('\n🎉 E2E Database setup completed successfully!');
        console.log(`📁 Database location: ${e2eDbPath}`);
        console.log('🧪 Ready for E2E testing');

    } catch (error) {
        console.error('\n💥 E2E Database setup failed:', error.message);
        process.exit(1);
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    setupE2EDatabase();
}

export default setupE2EDatabase;
