#!/usr/bin/env node

/**
 * @file simple-e2e-setup.mjs
 * @description Simple E2E database reset - just delete and migrate
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const dbPath = 'data/e2e-old-man-footy.db';

console.log('🚀 Simple E2E Database Setup...');

try {
    // Delete existing database if it exists
    if (fs.existsSync(dbPath)) {
        console.log('🗑️ Removing existing E2E database...');
        fs.unlinkSync(dbPath);
        console.log('✅ Existing database removed');
    }

    // Run migrations to create schema
    console.log('🔧 Running migrations...');
    execSync('npm run migrate', {
        env: { ...process.env, NODE_ENV: 'e2e' },
        stdio: 'inherit'
    });
    
    console.log('🎉 E2E Database setup completed!');
    
} catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
}
