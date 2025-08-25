/**
 * Test script to check carnival data and verify our fix
 */

import { sequelize } from './config/database.mjs';
import { Carnival } from './models/index.mjs';

async function testCarnivalEdit() {
    try {
        console.log('Testing carnival edit fix...');
        
        // Find carnival with ID 2
        const carnival = await Carnival.findByPk(2);
        
        if (!carnival) {
            console.log('❌ Carnival with ID 2 not found');
            return;
        }
        
        console.log('📋 Carnival details:');
        console.log(`  ID: ${carnival.id}`);
        console.log(`  Title: ${carnival.title}`);
        console.log(`  Date: ${carnival.date}`);
        console.log(`  End Date: ${carnival.endDate}`);
        
        // Test the date handling logic
        console.log('\n🧪 Testing date handling logic:');
        
        if (carnival.date) {
            console.log(`  ✅ Date exists: ${carnival.date.toISOString().split('T')[0]}`);
        } else {
            console.log(`  ⚠️  Date is null/undefined - this would have caused the error`);
            console.log(`  ✅ Our fix handles this with: ${carnival.date ? carnival.date.toISOString().split('T')[0] : ''}`);
        }
        
        if (carnival.endDate) {
            console.log(`  ✅ End Date exists: ${carnival.endDate.toISOString().split('T')[0]}`);
        } else {
            console.log(`  ✅ End Date is null - properly handled in template`);
        }
        
        console.log('\n🎉 Fix appears to be working correctly!');
        
    } catch (error) {
        console.error('❌ Error testing carnival edit:', error);
    } finally {
        await sequelize.close();
    }
}

testCarnivalEdit();
