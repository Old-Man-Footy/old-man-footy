#!/usr/bin/env node
/**
 * Database Schema Sync Script
 * 
 * This script forces Sequelize to synchronize the database schema
 * with the current model definitions to fix any schema mismatches.
 */

import { sequelize } from '../config/database.mjs';
import '../models/index.mjs'; // Import all models

async function syncDatabase() {
    try {
        console.log('🔄 Starting database schema synchronization...');
        
        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connection established');
        
        // Force sync with alter: true to update existing tables
        await sequelize.sync({ alter: true });
        console.log('✅ Database schema synchronized successfully');
        
        // Test a simple query to verify everything works
        const { Carnival } = await import('../models/index.mjs');
        const carnivalCount = await Carnival.count();
        console.log(`✅ Database test query successful - Found ${carnivalCount} carnivals`);
        
        console.log('🎉 Database synchronization completed successfully!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Database synchronization failed:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the sync
syncDatabase();