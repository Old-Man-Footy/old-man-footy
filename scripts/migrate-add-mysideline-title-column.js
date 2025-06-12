/**
 * Migration Script: Add MySidelineTitle Column to Carnivals Table
 * 
 * This script adds a new column 'mySidelineTitle' to the carnivals table.
 * This field will store the original MySideline title for matching purposes
 * and should never change once set.
 * 
 * Run with: node scripts/migrate-add-mysideline-title-column.js
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
 * Add the mySidelineTitle column to the carnivals table
 */
async function addMySidelineTitleColumn() {
  try {
    const exists = await columnExists('carnivals', 'mySidelineTitle');
    
    if (exists) {
      console.log('✓ Column mySidelineTitle already exists in carnivals table');
      return;
    }
    
    console.log('Adding mySidelineTitle column to carnivals table...');
    
    // Add the new column
    await sequelize.query(`
      ALTER TABLE carnivals 
      ADD COLUMN mySidelineTitle VARCHAR(255) NULL
    `);
    
    console.log('✓ Successfully added mySidelineTitle column to carnivals table');
    
    // For existing MySideline events (where isManuallyEntered = false),
    // populate mySidelineTitle with the current title value
    console.log('Populating mySidelineTitle for existing MySideline events...');
    
    const [updatedRows] = await sequelize.query(`
      UPDATE carnivals 
      SET mySidelineTitle = title 
      WHERE isManuallyEntered = 0 AND mySidelineTitle IS NULL
    `);
    
    console.log(`✓ Updated ${updatedRows.changes || 0} existing MySideline events with mySidelineTitle`);
    
  } catch (error) {
    console.error('✗ Error adding mySidelineTitle column:', error.message);
    throw error;
  }
}

/**
 * Add an index on the mySidelineTitle column for better query performance
 */
async function addMySidelineTitleIndex() {
  try {
    console.log('Adding index on mySidelineTitle column...');
    
    // Check if index already exists
    const [indexes] = await sequelize.query(`
      PRAGMA index_list(carnivals)
    `);
    
    const indexExists = indexes.some(index => 
      index.name.includes('mySidelineTitle') || index.name.includes('mysideline_title')
    );
    
    if (!indexExists) {
      await sequelize.query(`
        CREATE INDEX idx_carnivals_mysideline_title ON carnivals(mySidelineTitle)
      `);
      
      console.log('✓ Successfully added index on mySidelineTitle column');
    } else {
      console.log('✓ Index on mySidelineTitle already exists');
    }
    
  } catch (error) {
    console.error('✗ Error adding index on mySidelineTitle:', error.message);
    // Don't throw here as this is not critical - the column addition is more important
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Starting migration: Add mySidelineTitle column to carnivals table');
  console.log('=================================================================');
  
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✓ Database connection established');
    
    // Backup recommendation
    console.log('\n⚠️  IMPORTANT: Make sure you have a backup of your database before proceeding!');
    console.log('   Database files to backup:');
    console.log(`   - ${path.join(__dirname, '../data/dev-old-man-footy.db')}`);
    console.log(`   - ${path.join(__dirname, '../data/test-old-man-footy.db')}`);
    
    console.log('\n🔄 Processing migration...');
    
    // Add the column
    await addMySidelineTitleColumn();
    
    // Add index for performance
    await addMySidelineTitleIndex();
    
    // Verify the changes
    console.log('\n🔍 Verifying table structure after migration...');
    const [tableInfo] = await sequelize.query('PRAGMA table_info(carnivals)');
    const columnNames = tableInfo.map(col => col.name);
    
    if (columnNames.includes('mySidelineTitle')) {
      console.log('✅ mySidelineTitle column successfully added to carnivals table');
    } else {
      console.log('❌ mySidelineTitle column was not found after migration');
    }
    
    // Show some statistics
    const [countResult] = await sequelize.query(`
      SELECT 
        COUNT(*) as totalCarnivals,
        COUNT(CASE WHEN mySidelineTitle IS NOT NULL THEN 1 END) as carnivalsWithMySidelineTitle,
        COUNT(CASE WHEN isManuallyEntered = 0 THEN 1 END) as mySidelineEvents
      FROM carnivals
    `);
    
    if (countResult.length > 0) {
      const stats = countResult[0];
      console.log('\n📊 Migration Statistics:');
      console.log(`   - Total carnivals: ${stats.totalCarnivals}`);
      console.log(`   - Carnivals with mySidelineTitle: ${stats.carnivalsWithMySidelineTitle}`);
      console.log(`   - MySideline events: ${stats.mySidelineEvents}`);
    }
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('\n👋 Migration script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runMigration,
  addMySidelineTitleColumn,
  addMySidelineTitleIndex,
  columnExists
};