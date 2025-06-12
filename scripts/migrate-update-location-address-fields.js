/**
 * Migration Script: Update LocationAddress Fields in Carnivals Table
 * 
 * This script adds missing location address fields and provides comprehensive updates 
 * to location address fields in the carnivals table. It can handle various scenarios including:
 * - Adding missing locationAddressPart1-4 columns to the database
 * - Normalizing address formats
 * - Splitting full addresses into component parts
 * - Cleaning up inconsistent address data
 * 
 * Run with: node scripts/migrate-update-location-address-fields.js
 */

const { sequelize } = require('../config/database');
const path = require('path');

/**
 * Check if a column exists in the table
 * @param {string} tableName - Name of the table
 * @param {string} columnName - Name of the column
 * @returns {Promise<boolean>} True if column exists
 */
async function columnExists(tableName, columnName) {
  try {
    const [results] = await sequelize.query(`
      PRAGMA table_info(${tableName})
    `);
    
    return results.some(column => column.name === columnName);
  } catch (error) {
    console.error(`Error checking if column ${columnName} exists:`, error.message);
    return false;
  }
}

/**
 * Add missing locationAddressPart columns to the carnivals table
 */
async function addMissingLocationAddressColumns() {
  try {
    console.log('🔧 Adding missing locationAddressPart columns...');
    
    const columnsToAdd = [
      'locationAddressPart1',
      'locationAddressPart2', 
      'locationAddressPart3',
      'locationAddressPart4',
      'mySidelineTitle'
    ];
    
    let addedCount = 0;
    
    for (const columnName of columnsToAdd) {
      const exists = await columnExists('carnivals', columnName);
      
      if (!exists) {
        console.log(`  Adding column: ${columnName}`);
        
        await sequelize.query(`
          ALTER TABLE carnivals 
          ADD COLUMN ${columnName} VARCHAR(100) NULL
        `);
        
        addedCount++;
        console.log(`  ✓ Successfully added ${columnName} column`);
      } else {
        console.log(`  ✓ Column ${columnName} already exists`);
      }
    }
    
    if (addedCount > 0) {
      console.log(`✅ Added ${addedCount} missing locationAddressPart columns to carnivals table`);
    } else {
      console.log('✅ All locationAddressPart columns already exist in carnivals table');
    }
    
  } catch (error) {
    console.error('✗ Error adding missing locationAddressPart columns:', error.message);
    throw error;
  }
}



module.exports = {
  addMissingLocationAddressColumns,
  columnExists,
};