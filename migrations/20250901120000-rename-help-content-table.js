/**
 * Migration: Rename HelpContent table to help_content for consistency
 * @description Renames the HelpContent table to follow snake_case naming convention like all other tables.
 */

export async function up(queryInterface, Sequelize) {
  // Check if the old table exists and new table doesn't exist
  const [oldTable] = await queryInterface.sequelize.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='HelpContent';"
  );
  const [newTable] = await queryInterface.sequelize.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='help_content';"
  );
  
  // Only proceed if old table exists and new table doesn't
  if (oldTable.length > 0 && newTable.length === 0) {
    // Drop the existing index first
    try {
      await queryInterface.removeIndex('HelpContent', 'IX_HelpContent_PageIdentifier');
    } catch (error) {
      // Index might not exist, continue
      console.log('Index IX_HelpContent_PageIdentifier not found, continuing...');
    }
    
    // Rename the table to follow snake_case convention
    await queryInterface.renameTable('HelpContent', 'help_content');
    
    // Recreate the index with new naming convention
    await queryInterface.addIndex('help_content', ['pageIdentifier'], {
      unique: true,
      name: 'IX_help_content_page_identifier',
    });
  } else {
    console.log('Table rename already completed or not needed.');
  }
}

export async function down(queryInterface, Sequelize) {
  // Check if the new table exists and old table doesn't exist
  const [newTable] = await queryInterface.sequelize.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='help_content';"
  );
  const [oldTable] = await queryInterface.sequelize.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='HelpContent';"
  );
  
  // Only proceed if new table exists and old table doesn't
  if (newTable.length > 0 && oldTable.length === 0) {
    // Drop the new index
    try {
      await queryInterface.removeIndex('help_content', 'IX_help_content_page_identifier');
    } catch (error) {
      // Index might not exist, continue
      console.log('Index IX_help_content_page_identifier not found, continuing...');
    }
    
    // Rename back to original table name
    await queryInterface.renameTable('help_content', 'HelpContent');
    
    // Recreate the original index
    await queryInterface.addIndex('HelpContent', ['pageIdentifier'], {
      unique: true,
      name: 'IX_HelpContent_PageIdentifier',
    });
  } else {
    console.log('Table rename rollback already completed or not needed.');
  }
}
