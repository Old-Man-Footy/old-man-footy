/**
 * Migration Script: Remove Deprecated Carnival Columns
 * 
 * This script removes the following deprecated columns from the carnivals table:
 * - mySidelineEventId (TODO: REMOVE AS THIS DOES NOT EXIST IN MYSIDELINE)
 * - mySidelineSourceUrl (TODO: REMOVE THIS FIELD, NO DIRECT URL DUE TO VUE.JS ROUTING)
 * - ageCategories (TODO: REMOVE THIS FIELD, IT'S ALWAYS 35+)
 * - weatherConditions (TODO: REMOVE WEATHER CONDITIONS, NOT NEEDED)
 * 
 * Run with: node scripts/migrate-remove-deprecated-carnival-columns.js
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
 * Drop a column from the table if it exists
 * @param {string} tableName - Name of the table
 * @param {string} columnName - Name of the column to drop
 */
async function dropColumnIfExists(tableName, columnName) {
  try {
    const exists = await columnExists(tableName, columnName);
    
    if (exists) {
      console.log(`Dropping column '${columnName}' from table '${tableName}'...`);
      
      // SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
      // First, get the current table schema
      const [tableInfo] = await sequelize.query(`PRAGMA table_info(${tableName})`);
      const [foreignKeys] = await sequelize.query(`PRAGMA foreign_key_list(${tableName})`);
      const [indexes] = await sequelize.query(`PRAGMA index_list(${tableName})`);
      
      // Filter out the column we want to drop
      const remainingColumns = tableInfo.filter(col => col.name !== columnName);
      
      // Create column definitions for the new table
      const columnDefs = remainingColumns.map(col => {
        let def = `"${col.name}" ${col.type}`;
        if (col.notnull) def += ' NOT NULL';
        if (col.dflt_value !== null) def += ` DEFAULT ${col.dflt_value}`;
        if (col.pk) def += ' PRIMARY KEY';
        return def;
      }).join(', ');
      
      // Start transaction
      await sequelize.transaction(async (transaction) => {
        // Create temporary table with new schema
        await sequelize.query(`
          CREATE TABLE ${tableName}_temp (
            ${columnDefs}
          )
        `, { transaction });
        
        // Copy data from old table to new table (excluding the dropped column)
        const columnNames = remainingColumns.map(col => `"${col.name}"`).join(', ');
        await sequelize.query(`
          INSERT INTO ${tableName}_temp (${columnNames})
          SELECT ${columnNames} FROM ${tableName}
        `, { transaction });
        
        // Drop the old table
        await sequelize.query(`DROP TABLE ${tableName}`, { transaction });
        
        // Rename the temp table to the original name
        await sequelize.query(`ALTER TABLE ${tableName}_temp RENAME TO ${tableName}`, { transaction });
        
        // Recreate indexes (excluding the dropped column)
        for (const index of indexes) {
          if (index.name.startsWith('sqlite_autoindex')) continue; // Skip auto indexes
          
          try {
            const [indexInfo] = await sequelize.query(`PRAGMA index_info("${index.name}")`);
            const indexColumns = indexInfo
              .filter(col => col.name !== columnName)
              .map(col => `"${col.name}"`)
              .join(', ');
            
            if (indexColumns) {
              const uniqueStr = index.unique ? 'UNIQUE' : '';
              await sequelize.query(`
                CREATE ${uniqueStr} INDEX "${index.name}" ON ${tableName} (${indexColumns})
              `, { transaction });
            }
          } catch (indexError) {
            console.warn(`Warning: Could not recreate index ${index.name}:`, indexError.message);
          }
        }
      });
      
      console.log(`✓ Successfully dropped column '${columnName}' from table '${tableName}'`);
    } else {
      console.log(`✓ Column '${columnName}' does not exist in table '${tableName}' (already removed)`);
    }
  } catch (error) {
    console.error(`✗ Error dropping column '${columnName}' from table '${tableName}':`, error.message);
    throw error;
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Starting migration: Remove deprecated carnival columns');
  console.log('=====================================');
  
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✓ Database connection established');
    
    // Backup recommendation
    console.log('\n⚠️  IMPORTANT: Make sure you have a backup of your database before proceeding!');
    console.log('   Database files to backup:');
    console.log(`   - ${path.join(__dirname, '../data/dev-old-man-footy.db')}`);
    console.log(`   - ${path.join(__dirname, '../data/test-old-man-footy.db')}`);
    
    // List of deprecated columns to remove
    const columnsToRemove = [
      'mySidelineEventId',
      'mySidelineSourceUrl', 
      'ageCategories',
      'weatherConditions',
      'GroundConditions'
    ];
    
    console.log('\n📋 Columns to remove:');
    columnsToRemove.forEach(col => console.log(`   - ${col}`));
    
    console.log('\n🔄 Processing column removals...');
    
    // Remove each deprecated column
    for (const columnName of columnsToRemove) {
      await dropColumnIfExists('carnivals', columnName);
    }
    
    // Verify the changes
    console.log('\n🔍 Verifying table structure after migration...');
    const [finalTableInfo] = await sequelize.query('PRAGMA table_info(carnivals)');
    const remainingColumnNames = finalTableInfo.map(col => col.name);
    
    console.log('✓ Current table columns:');
    remainingColumnNames.forEach(col => console.log(`   - ${col}`));
    
    // Check if any deprecated columns still exist
    const stillExists = columnsToRemove.filter(col => remainingColumnNames.includes(col));
    if (stillExists.length > 0) {
      console.log(`\n⚠️  Warning: The following columns still exist: ${stillExists.join(', ')}`);
    } else {
      console.log('\n✅ All deprecated columns have been successfully removed!');
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
  dropColumnIfExists,
  columnExists
};