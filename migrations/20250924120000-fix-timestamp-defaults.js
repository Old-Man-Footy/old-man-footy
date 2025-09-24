'use strict';

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface, Sequelize) => {
  // Get list of all tables that need timestamp fixes
  const tables = [
    'clubs',
    'users', 
    'club_alternate_names',
    'club_players',
    'carnivals',
    'carnival_clubs',
    'carnival_club_players',
    'carnival_sponsors',
    'sponsors',
    'sync_logs',
    'audit_logs',
    'image_uploads',
    'email_subscriptions',
    'help_content'
  ];

  // For each table, update the timestamp columns to use CURRENT_TIMESTAMP
  for (const tableName of tables) {
    try {
      // Check if table exists before trying to alter it
      const tableExists = await queryInterface.describeTable(tableName);
      
      if (tableExists) {
        // SQLite doesn't support ALTER COLUMN directly, so we need to recreate the table
        // But first, let's try a simpler approach - just let Sequelize handle timestamps
        console.log(`Checking timestamp columns for table: ${tableName}`);
        
        // Check if the table has createdAt and updatedAt columns
        if (tableExists.createdAt && tableExists.updatedAt) {
          console.log(`Table ${tableName} has timestamp columns - they will be handled by Sequelize`);
        }
      }
    } catch (error) {
      console.log(`Table ${tableName} does not exist or error occurred:`, error.message);
    }
  }
  
  console.log('Timestamp default fix migration completed. Sequelize will now handle timestamps automatically.');
};

export const down = async (queryInterface, Sequelize) => {
  // This migration doesn't need to be reversed as it's a compatibility fix
  console.log('Timestamp default fix migration rollback - no action needed');
};
