/**
 * Migration: Rename HelpContent table to help_content for consistency
 * @description Renames the HelpContent table to follow snake_case naming convention like all other tables.
 */

export async function up(queryInterface, Sequelize) {
  // Drop the existing index first
  await queryInterface.removeIndex('HelpContent', 'IX_HelpContent_PageIdentifier');
  
  // Rename the table to follow snake_case convention
  await queryInterface.renameTable('HelpContent', 'help_content');
  
  // Recreate the index with new naming convention
  await queryInterface.addIndex('help_content', ['pageIdentifier'], {
    unique: true,
    name: 'IX_help_content_page_identifier',
  });
}

export async function down(queryInterface, Sequelize) {
  // Drop the new index
  await queryInterface.removeIndex('help_content', 'IX_help_content_page_identifier');
  
  // Rename back to original table name
  await queryInterface.renameTable('help_content', 'HelpContent');
  
  // Recreate the original index
  await queryInterface.addIndex('HelpContent', ['pageIdentifier'], {
    unique: true,
    name: 'IX_HelpContent_PageIdentifier',
  });
}
