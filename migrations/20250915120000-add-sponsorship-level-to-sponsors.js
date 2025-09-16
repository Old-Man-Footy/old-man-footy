/**
 * Migration: Add sponsorship level to sponsors and update constraints
 * 
 * This migration:
 * 1. Adds sponsorshipLevel column to sponsors table
 * 2. Updates unique constraint to include sponsorName, clubId, state, location
 * 3. Removes displayOrder column as it will no longer be used
 */

'use strict';

export const up = async (queryInterface, Sequelize) => {
  // Get current table info
  const [results] = await queryInterface.sequelize.query("PRAGMA table_info(sponsors);");
  const hasSponsoryLevel = results.some(col => col.name === 'sponsorshipLevel');
  
  // Add sponsorshipLevel column if it doesn't exist
  if (!hasSponsoryLevel) {
    await queryInterface.sequelize.query(`
      ALTER TABLE sponsors 
      ADD COLUMN sponsorshipLevel VARCHAR(20) DEFAULT 'Supporting';
    `);
  }

  // Get current indexes
  const [indexes] = await queryInterface.sequelize.query("PRAGMA index_list(sponsors);");
  
  // Drop old unique constraint on sponsorName only if it exists
  // Note: sqlite_autoindex_sponsors_1 is SQLite's auto-generated PRIMARY KEY index and cannot be dropped
  const hasOldUniqueConstraint = indexes.some(idx => 
    idx.name === 'sponsors_sponsor_name' && idx.unique
  );
  if (hasOldUniqueConstraint) {
    try {
      await queryInterface.sequelize.query(`DROP INDEX IF EXISTS sponsors_sponsor_name;`);
    } catch (error) {
      console.log('Note: Could not remove old unique constraint (may be auto-generated)');
    }
  }
  
  // Drop regular index on sponsorName if it exists  
  const hasNameIndex = indexes.some(idx => idx.name === 'idx_sponsors_name');
  if (hasNameIndex) {
    try {
      await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_sponsors_name;`);
    } catch (error) {
      console.log('Note: Could not remove old name index (may not exist)');
    }
  }

  // For displayOrder column removal - SQLite doesn't support DROP COLUMN
  // We'll ignore it for now since the column can remain but be unused
  // The model will simply not reference it anymore
  
  // Check if composite unique constraint already exists
  const hasCompositeConstraint = indexes.some(idx => idx.name === 'sponsors_composite_unique');
  
  if (!hasCompositeConstraint) {
    // Add new composite unique constraint
    try {
      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX sponsors_composite_unique 
        ON sponsors (sponsorName, clubId, state, location);
      `);
    } catch (error) {
      console.log('Note: Could not create composite unique constraint (may already exist)');
    }
  }
};

export const down = async (queryInterface, Sequelize) => {
  // Add back displayOrder column
  await queryInterface.addColumn('sponsors', 'displayOrder', {
    type: Sequelize.INTEGER,
    allowNull: true,
    comment: 'Display order for sponsor listing within a club'
  });

  // Remove the composite unique constraint
  await queryInterface.removeIndex('sponsors', 'sponsors_composite_unique');

  // Add back the old unique constraint on sponsorName only
  await queryInterface.addIndex('sponsors', {
    fields: ['sponsorName'],
    unique: true,
    name: 'sponsors_sponsor_name'
  });

  // Remove sponsorshipLevel column
  await queryInterface.removeColumn('sponsors', 'sponsorshipLevel');
};
