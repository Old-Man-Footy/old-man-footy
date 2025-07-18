#!/usr/bin/env node
/**
 * Debug script for MySideline sync status checker
 * Tests each import and connection step individually
 */

console.log('🔍 Starting debug check...');

// Test 1: Basic imports
try {
    console.log('✅ Step 1: Basic Node.js imports successful');
    
    const { fileURLToPath } = await import('url');
    const path = await import('path');
    console.log('✅ Step 2: URL and path imports successful');
    
    // Test 2: Models import
    console.log('🔄 Step 3: Attempting to import models...');
    const modelsModule = await import('/models/index.mjs');
    console.log('✅ Step 3: Models import successful');
    
    const { sequelize, SyncLog } = modelsModule;
    console.log('✅ Step 4: Destructured sequelize and SyncLog');
    
    if (!sequelize) {
        throw new Error('sequelize is undefined');
    }
    if (!SyncLog) {
        throw new Error('SyncLog is undefined');
    }
    
    console.log('✅ Step 5: Models are properly defined');
    
    // Test 3: Database connection
    console.log('🔄 Step 6: Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Step 6: Database connection successful');
    
    // Test 4: Check database path
    const dbPath = sequelize.options.storage;
    console.log(`✅ Step 7: Database path: ${dbPath}`);
    
    // Test 5: Check if SyncLog table exists
    const tables = await sequelize.getQueryInterface().showAllTables();
    const hasSyncLogTable = tables.includes('sync_logs');
    console.log(`✅ Step 8: SyncLog table exists: ${hasSyncLogTable}`);
    
    // Test 6: Try to query SyncLog
    if (hasSyncLogTable) {
        const count = await SyncLog.count();
        console.log(`✅ Step 9: SyncLog table has ${count} records`);
    } else {
        console.log('⚠️  Step 9: Skipped - SyncLog table does not exist');
    }
    
    // Test 7: Environment variables
    console.log('\n📋 Environment Variables:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    console.log(`   MYSIDELINE_SYNC_ENABLED: ${process.env.MYSIDELINE_SYNC_ENABLED || 'undefined'}`);
    
    // Close connection
    await sequelize.close();
    console.log('✅ Step 10: Database connection closed');
    
    console.log('\n🎉 All diagnostic checks passed! The sync status script should work.');
    
} catch (error) {
    console.error('❌ Debug check failed at step:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
}