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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load environment variables from .env.development
 */
function loadEnvironmentVariables() {
    const envPath = path.join(__dirname, '..', '.env.development');
    
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        
        envContent.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#') && line.includes('=')) {
                const [key, ...valueParts] = line.split('=');
                const value = valueParts.join('=');
                
                // Only set if not already defined
                if (!process.env[key.trim()]) {
                    process.env[key.trim()] = value.trim();
                }
            }
        });
        
        console.log('✅ Environment variables loaded from .env.development');
    } else {
        console.log('⚠️  No .env.development file found, using system environment variables');
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
        const useMock = process.env.MYSIDELINE_USE_MOCK === 'true';
        
        console.log(`📋 Configuration:`);
        console.log(`   Sync Enabled: ${syncEnabled ? '✅ Yes' : '❌ No'}`);
        console.log(`   Using Mock Data: ${useMock ? '⚠️  Yes' : '✅ No'}`);
        
        if (!syncEnabled) {
            console.log('\n❌ MySideline sync is disabled via MYSIDELINE_SYNC_ENABLED=false');
            console.log('📝 To enable: Set MYSIDELINE_SYNC_ENABLED=true in .env.development');
            return;
        }
        
        console.log('🚀 Starting sync operation...\n');
        
        // Trigger the sync
        const result = await mySidelineService.syncMySidelineEvents();
        
        console.log('\n' + '='.repeat(50));
        console.log('📊 Sync Results:');
        
        if (result && result.success) {
            console.log(`✅ Sync completed successfully!`);
            console.log(`   Events Processed: ${result.eventsProcessed || 0}`);
            console.log(`   Events Created: ${result.eventsCreated || 0}`);
            console.log(`   Events Updated: ${result.eventsUpdated || 0}`);
            console.log(`   Last Sync: ${result.lastSync || 'Now'}`);
            
            if (useMock) {
                console.log('\n⚠️  Note: This sync used MOCK data, not live MySideline data');
                console.log('📝 To use live data: Set MYSIDELINE_USE_MOCK=false in .env.development');
            }
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