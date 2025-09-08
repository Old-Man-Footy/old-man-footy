/**
 * Complete E2E Database Reset and Server Start
 * This script bypasses all module caching issues by using child processes
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const E2E_DB_PATH = path.join(__dirname, '..', 'data', 'e2e-old-man-footy.db');

console.log('🎯 Starting clean E2E environment setup...');

/**
 * Reset E2E database completely
 */
function resetE2EDatabase() {
    console.log('🔧 Resetting E2E database...');
    
    // Delete existing E2E database
    if (fs.existsSync(E2E_DB_PATH)) {
        fs.unlinkSync(E2E_DB_PATH);
        console.log('🗑️ Deleted existing E2E database');
    }
    
    console.log('✅ E2E database reset complete');
}

/**
 * Run migrations in separate process with E2E environment
 */
function runMigrations() {
    return new Promise((resolve, reject) => {
        console.log('📊 Running database migrations in separate process...');
        
        const migrationProcess = spawn('npm', ['run', 'migrate'], {
            env: { ...process.env, NODE_ENV: 'e2e' },
            stdio: 'inherit',
            shell: true
        });
        
        migrationProcess.on('close', (code) => {
            if (code === 0) {
                console.log('✅ Migrations completed successfully');
                resolve();
            } else {
                console.error('❌ Migration process failed with code:', code);
                reject(new Error(`Migration failed with exit code ${code}`));
            }
        });
        
        migrationProcess.on('error', (error) => {
            console.error('❌ Migration process error:', error);
            reject(error);
        });
    });
}

/**
 * Start server in separate process with E2E environment
 */
function startServer() {
    console.log('🚀 Starting E2E server in separate process...');
    
    const serverProcess = spawn('node', ['app.mjs'], {
        env: { 
            ...process.env, 
            NODE_ENV: 'e2e',
            PORT: '3056',
            SESSION_SECRET: 'test-session-secret-32-characters-min',
            FEATURE_COMING_SOON_MODE: 'false',
            FEATURE_MAINTENANCE_MODE: 'false'
        },
        stdio: 'inherit',
        shell: true
    });
    
    serverProcess.on('close', (code) => {
        console.log(`🏁 Server process exited with code ${code}`);
        process.exit(code);
    });
    
    serverProcess.on('error', (error) => {
        console.error('❌ Server process error:', error);
        process.exit(1);
    });
    
    // Handle shutdown gracefully
    process.on('SIGINT', () => {
        console.log('🛑 Received SIGINT, shutting down server...');
        serverProcess.kill('SIGINT');
    });
    
    process.on('SIGTERM', () => {
        console.log('🛑 Received SIGTERM, shutting down server...');
        serverProcess.kill('SIGTERM');
    });
    
    console.log('✅ E2E server process started');
}

/**
 * Main execution function
 */
async function main() {
    try {
        // Step 1: Reset database
        resetE2EDatabase();
        
        // Step 2: Run migrations in separate process
        await runMigrations();
        
        // Step 3: Start server in separate process
        startServer();
        
    } catch (error) {
        console.error('💥 E2E setup failed:', error.message);
        process.exit(1);
    }
}

main();
