#!/usr/bin/env node
/**
 * MySideline Sync Status Checker
 * 
 * Command-line utility to check if MySideline sync is properly configured
 * and view recent sync activity from the database.
 * 
 * Usage: node scripts/check-sync-status.js [--detailed]
 */

const path = require('path');
const { sequelize } = require('../models');
const { SyncLog } = require('../models');

/**
 * Check MySideline sync configuration
 * @returns {Object} Configuration status
 */
function checkSyncConfiguration() {
    const config = {
        enabled: process.env.MYSIDELINE_SYNC_ENABLED !== 'false',
        useMock: process.env.MYSIDELINE_USE_MOCK === 'true',
        enableScraping: process.env.MYSIDELINE_ENABLE_SCRAPING !== 'false',
        url: process.env.MYSIDELINE_URL || 'Not configured',
        timeout: process.env.MYSIDELINE_REQUEST_TIMEOUT || '60000',
        retryAttempts: process.env.MYSIDELINE_RETRY_ATTEMPTS || '3'
    };

    return config;
}

/**
 * Get recent sync logs from database
 * @param {boolean} detailed - Whether to show detailed information
 * @returns {Promise<Array>} Recent sync logs
 */
async function getRecentSyncLogs(detailed = false) {
    try {
        const logs = await SyncLog.findAll({
            where: {
                syncType: 'mysideline'
            },
            order: [['startedAt', 'DESC']],
            limit: detailed ? 20 : 10
        });

        return logs;
    } catch (error) {
        console.error('❌ Error fetching sync logs:', error.message);
        return [];
    }
}

/**
 * Get sync statistics
 * @returns {Promise<Object>} Sync statistics
 */
async function getSyncStatistics() {
    try {
        const stats = await SyncLog.getSyncStats('mysideline', 30);
        return stats;
    } catch (error) {
        console.error('❌ Error fetching sync statistics:', error.message);
        return null;
    }
}

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
    if (!date) return 'Never';
    return new Date(date).toLocaleString('en-AU', {
        timeZone: 'Australia/Sydney',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * Display sync status information
 */
async function displaySyncStatus() {
    const detailed = process.argv.includes('--detailed');
    
    console.log('='.repeat(60));
    console.log('🔄 MySideline Sync Status Check');
    console.log('='.repeat(60));
    
    // Check configuration
    console.log('\n📋 Configuration:');
    const config = checkSyncConfiguration();
    console.log(`   Sync Enabled: ${config.enabled ? '✅ Yes' : '❌ No'}`);
    console.log(`   Scraping Enabled: ${config.enableScraping ? '✅ Yes' : '❌ No'}`);
    console.log(`   Using Mock Data: ${config.useMock ? '⚠️  Yes' : '✅ No'}`);
    console.log(`   MySideline URL: ${config.url}`);
    console.log(`   Request Timeout: ${config.timeout}ms`);
    console.log(`   Retry Attempts: ${config.retryAttempts}`);
    
    // Check database connection
    console.log('\n🗄️  Database:');
    try {
        await sequelize.authenticate();
        console.log('   Connection: ✅ Connected');
        
        const dbPath = sequelize.options.storage;
        console.log(`   Database Path: ${dbPath}`);
        
        // Check if SyncLog table exists
        const tables = await sequelize.getQueryInterface().showAllTables();
        const hasSyncLogTable = tables.includes('sync_logs');
        console.log(`   SyncLog Table: ${hasSyncLogTable ? '✅ Exists' : '❌ Missing'}`);
        
        if (hasSyncLogTable) {
            // Get recent logs
            console.log('\n📊 Recent Sync Activity:');
            const logs = await getRecentSyncLogs(detailed);
            
            if (logs.length === 0) {
                console.log('   ⚠️  No sync logs found - sync may never have run');
            } else {
                console.log(`   Showing last ${logs.length} sync attempts:\n`);
                
                logs.forEach((log, index) => {
                    const statusIcon = log.status === 'completed' ? '✅' : 
                                     log.status === 'failed' ? '❌' : '⏳';
                    const duration = log.completedAt ? 
                        Math.round((new Date(log.completedAt) - new Date(log.startedAt)) / 1000) : 
                        'N/A';
                    
                    console.log(`   ${index + 1}. ${statusIcon} ${log.status.toUpperCase()}`);
                    console.log(`      Started: ${formatDate(log.startedAt)}`);
                    console.log(`      Completed: ${formatDate(log.completedAt)}`);
                    console.log(`      Duration: ${duration}s`);
                    console.log(`      Events Processed: ${log.eventsProcessed || 0}`);
                    console.log(`      Events Created: ${log.eventsCreated || 0}`);
                    console.log(`      Events Updated: ${log.eventsUpdated || 0}`);
                    
                    if (log.errorMessage) {
                        console.log(`      Error: ${log.errorMessage}`);
                    }
                    
                    if (detailed && log.metadata) {
                        console.log(`      Metadata: ${JSON.stringify(log.metadata, null, 6)}`);
                    }
                    
                    console.log('');
                });
            }
            
            // Get statistics
            console.log('📈 Statistics (Last 30 Days):');
            const stats = await getSyncStatistics();
            if (stats) {
                console.log(`   Total Syncs: ${stats.totalSyncs}`);
                console.log(`   Successful: ${stats.successfulSyncs}`);
                console.log(`   Failed: ${stats.failedSyncs}`);
                console.log(`   Success Rate: ${stats.totalSyncs > 0 ? Math.round((stats.successfulSyncs / stats.totalSyncs) * 100) : 0}%`);
                console.log(`   Total Events Processed: ${stats.totalEventsProcessed}`);
                console.log(`   Total Events Created: ${stats.totalEventsCreated}`);
                console.log(`   Total Events Updated: ${stats.totalEventsUpdated}`);
                console.log(`   Last Successful Sync: ${formatDate(stats.lastSuccessfulSync)}`);
                console.log(`   Last Failed Sync: ${formatDate(stats.lastFailedSync)}`);
            }
        }
        
    } catch (error) {
        console.log(`   Connection: ❌ Failed - ${error.message}`);
    }
    
    // Schedule information
    console.log('\n⏰ Schedule Information:');
    console.log('   Cron Schedule: Daily at 3:00 AM (0 3 * * *)');
    console.log('   Startup Check: Runs 2 seconds after application startup');
    console.log('   Manual Trigger: Available via admin panel');
    
    // Next steps
    console.log('\n💡 What This Means:');
    if (!config.enabled) {
        console.log('   ⚠️  MySideline sync is DISABLED via MYSIDELINE_SYNC_ENABLED=false');
        console.log('   📝 To enable: Set MYSIDELINE_SYNC_ENABLED=true in environment');
    } else if (config.useMock) {
        console.log('   ⚠️  Using MOCK data instead of live MySideline scraping');
        console.log('   📝 To use live data: Set MYSIDELINE_USE_MOCK=false');
    } else if (!config.enableScraping) {
        console.log('   ⚠️  MySideline scraping is DISABLED');
        console.log('   📝 To enable: Set MYSIDELINE_ENABLE_SCRAPING=true');
    } else {
        console.log('   ✅ MySideline sync appears to be properly configured');
        console.log('   📝 Sync will run automatically at 3 AM daily');
        console.log('   📝 You can trigger manual sync from the admin panel');
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('   • Check Docker logs: docker logs old-man-footy-prod');
    console.log('   • Manual trigger: Admin Panel > System > Sync MySideline');
    console.log('   • Detailed view: node scripts/check-sync-status.js --detailed');
    
    console.log('\n' + '='.repeat(60));
}

/**
 * Main execution
 */
async function main() {
    try {
        await displaySyncStatus();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error checking sync status:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = {
    checkSyncConfiguration,
    getRecentSyncLogs,
    getSyncStatistics,
    displaySyncStatus
};