#!/usr/bin/env node
/**
 * Carnival Analysis Script
 * 
 * Analyze all carnivals in the database to understand the current state
 */

import { sequelize } from '/config/database.mjs';
import { Carnival, User } from '/models/index.mjs';

async function analyzeCarnivalsDatabase() {
    try {
        console.log('🔄 Analyzing carnival database...');
        
        // Get all carnivals (active and inactive)
        const allCarnivals = await Carnival.findAll({
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['firstName', 'lastName', 'email'],
                    required: false
                }
            ],
            order: [['date', 'ASC']]
        });
        
        console.log(`📊 TOTAL CARNIVALS: ${allCarnivals.length}\n`);
        
        allCarnivals.forEach((carnival, index) => {
            const creatorName = carnival.creator 
                ? `${carnival.creator.firstName} ${carnival.creator.lastName}` 
                : 'No creator';
            
            const dateStr = carnival.date ? new Date(carnival.date).toLocaleDateString() : 'No date';
            const status = carnival.isActive ? '✅ ACTIVE' : '❌ INACTIVE';
            const mysideline = carnival.lastMySidelineSync ? '🔗 MySideline' : '👤 Manual';
            
            console.log(`${index + 1}. ${carnival.title}`);
            console.log(`   📅 Date: ${dateStr}`);
            console.log(`   🏠 Creator: ${creatorName}`);
            console.log(`   📍 Location: ${carnival.locationAddress || 'No location'}`);
            console.log(`   🏷️  State: ${carnival.state || 'No state'}`);
            console.log(`   📊 Status: ${status}`);
            console.log(`   🔧 Type: ${mysideline}`);
            console.log(`   🆔 ID: ${carnival.id}`);
            console.log('');
        });
        
        // Summary statistics
        const activeCount = allCarnivals.filter(c => c.isActive).length;
        const inactiveCount = allCarnivals.filter(c => !c.isActive).length;
        const mysidelineCount = allCarnivals.filter(c => c.lastMySidelineSync).length;
        const manualCount = allCarnivals.filter(c => !c.lastMySidelineSync).length;
        const upcomingCount = allCarnivals.filter(c => c.isActive && c.date && new Date(c.date) >= new Date()).length;
        
        console.log('📊 SUMMARY:');
        console.log(`   Active carnivals: ${activeCount}`);
        console.log(`   Inactive carnivals: ${inactiveCount}`);
        console.log(`   MySideline imports: ${mysidelineCount}`);
        console.log(`   Manual entries: ${manualCount}`);
        console.log(`   Upcoming active carnivals: ${upcomingCount}`);
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Analysis failed:', error.message);
        process.exit(1);
    }
}

// Run the analysis
analyzeCarnivalsDatabase();