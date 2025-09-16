#!/usr/bin/env node
/**
 * Manual MySideline Sync Trigger
 * 
 * Command-line utility to manually trigger a MySideline sync operation.
 * 
 * Usage: node scripts/manual-mysideline-sync.mjs
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { config as dotenvConfig } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load environment variables from .env files
 */
function loadEnvironmentVariables() {
    const projectRoot = path.join(__dirname, '..');
    
    // Try to load .env first (standard)
    const envPath = path.join(projectRoot, '.env');
    const envDevPath = path.join(projectRoot, '.env.development');
    const envLocalPath = path.join(projectRoot, '.env.local');
    
    let loaded = false;
    
    // Load .env.local if it exists (highest priority)
    if (fs.existsSync(envLocalPath)) {
        dotenvConfig({ path: envLocalPath });
        console.log('✅ Environment variables loaded from .env.local');
        loaded = true;
    }
    
    // Load .env.development if it exists
    if (fs.existsSync(envDevPath)) {
        dotenvConfig({ path: envDevPath, override: false });
        console.log('✅ Environment variables loaded from .env.development');
        loaded = true;
    }
    
    // Load standard .env if it exists
    if (fs.existsSync(envPath)) {
        dotenvConfig({ path: envPath, override: false });
        console.log('✅ Environment variables loaded from .env');
        loaded = true;
    }
    
    if (!loaded) {
        console.log('⚠️  No .env files found, using system environment variables only');
    }
    
    // Validate required environment variables
    const requiredVars = ['NODE_ENV', 'DATABASE_URL'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
    }
}

/**
 * Main execution function
 */
async function main() {
    console.log('🔄 Starting Manual MySideline Sync...');
    console.log('='.repeat(50));
    
    // Load environment variables first
    loadEnvironmentVariables();
    
    try {
        // Import the MySideline integration service
        console.log('📦 Importing MySideline integration service...');
        const { default: mySidelineService } = await import('../services/mySidelineIntegrationService.mjs');
        
        console.log('✅ Service imported successfully');
        
        // Check if sync is enabled
        const syncEnabled = process.env.MYSIDELINE_SYNC_ENABLED !== 'false';
        
        console.log(`📋 Configuration:`);
        console.log(`   Sync Enabled: ${syncEnabled ? '✅ Yes' : '❌ No'}`);
        
        if (!syncEnabled) {
            console.log('\n❌ MySideline sync is disabled via MYSIDELINE_SYNC_ENABLED=false');
            console.log('📝 To enable: Set MYSIDELINE_SYNC_ENABLED=true in .env.development');
            return;
        }
        
        console.log('🚀 Starting sync operation...\n');
        
        // Trigger the sync
        const result = await mySidelineService.syncMySidelineCarnivals();
        
        console.log('\n' + '='.repeat(50));
        console.log('📊 Sync Results:');
        
        if (result && result.success) {
            console.log(`✅ Sync completed successfully!`);
            console.log(`   Carnivals Processed: ${result.eventsProcessed || 0}`);
            console.log(`   Carnivals Created: ${result.eventsCreated || 0}`);
            console.log(`   Carnivals Updated: ${result.eventsUpdated || 0}`);
            console.log(`   Last Sync: ${result.lastSync || 'Now'}`);           
        } else if (result && !result.success) {
            console.log(`❌ Sync failed: ${result.error || 'Unknown error'}`);
        } else {
            console.log(`⚠️  Sync completed but returned no result object`);
        }
        
        console.log('\n💡 To check detailed sync status, run:');
        console.log('   node scripts/check-sync-status.mjs --detailed');
        
    } catch (error) {
        console.error('❌ Manual sync failed:', error.message);
        console.error('\n🔧 Troubleshooting:');
        console.error('   • Check that the application is not already running');
        console.error('   • Verify database is accessible');
        console.error('   • Check internet connection for MySideline access');
        console.error('   • Review application logs for detailed errors');
        
        process.exit(1);
    }
    
    console.log('\n🎉 Manual sync operation completed!');
}

// Execute main function
main().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
});