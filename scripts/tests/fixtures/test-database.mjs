#!/usr/bin/env node
/**
 * Database Test Script
 * 
 * Test database connectivity and carnival queries to diagnose the issue
 */

import { sequelize } from '../../../config/database.mjs';
import { Carnival, User } from '../../../models/index.mjs';

async function testDatabase() {
    try {
        console.log('🔄 Testing database connectivity...');
        
        // Test basic connection
        await sequelize.authenticate();
        console.log('✅ Database connection successful');
        
        // Test the specific query that's failing in main controller
        console.log('🔄 Testing Carnival.findAll query...');
        const testCarnivals = await Carnival.findAll({
            where: {
                isActive: true,
            },
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['firstName', 'lastName'],
                    required: false
                }
            ],
            order: [['date', 'ASC']],
            limit: 5
        });
        
        console.log(`✅ Carnival query successful - Found ${testCarnivals.length} active carnivals`);
        
        if (testCarnivals.length > 0) {
            console.log('📋 Sample carnival data:');
            testCarnivals.forEach((carnival, index) => {
                console.log(`  ${index + 1}. ${carnival.title} - ${carnival.date ? new Date(carnival.date).toLocaleDateString() : 'No date'}`);
            });
        } else {
            console.log('⚠️  No active carnivals found in database');
        }
        
        // Test count query to see total carnivals
        const totalCount = await Carnival.count();
        console.log(`📊 Total carnivals in database: ${totalCount}`);
        
        const activeCount = await Carnival.count({ where: { isActive: true } });
        console.log(`📊 Active carnivals: ${activeCount}`);
        
        console.log('🎉 Database test completed successfully!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Database test failed:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    }
}

// Run the test
testDatabase();