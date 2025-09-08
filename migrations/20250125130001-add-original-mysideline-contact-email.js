'use strict';

/**
 * Add originalMySidelineContactEmail column to carnivals table
 * This column preserves the original organiser contact email from MySideline
 * before it gets overwritten when a carnival is claimed
 */

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface, Sequelize) => {
  try {
    // Check if carnivals table exists first
    const tables = await queryInterface.showAllTables();
    const carnivalsTableExists = tables.includes('carnivals');
    
    if (!carnivalsTableExists) {
      console.log('ℹ️  carnivals table does not exist yet, skipping originalMySidelineContactEmail column addition');
      return;
    }
    
    // Check if carnivals table exists and get current columns
    const carnivalCols = await queryInterface.describeTable('carnivals');
    
    // Add originalMySidelineContactEmail column if it doesn't exist
    if (!carnivalCols.originalMySidelineContactEmail) {
      await queryInterface.addColumn('carnivals', 'originalMySidelineContactEmail', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Original organiser contact email from MySideline import, preserved when carnival is claimed'
      });
      
      console.log('✅ Added originalMySidelineContactEmail column to carnivals table');
    } else {
      console.log('ℹ️  originalMySidelineContactEmail column already exists in carnivals table');
    }
  } catch (error) {
    console.log('⚠️  Could not add originalMySidelineContactEmail column:', error.message);
    // Don't throw - this allows the migration to succeed even if the table doesn't exist yet
  }
};

export const down = async (queryInterface, Sequelize) => {
  try {
    // Check if carnivals table exists first
    const tables = await queryInterface.showAllTables();
    const carnivalsTableExists = tables.includes('carnivals');
    
    if (!carnivalsTableExists) {
      console.log('ℹ️  carnivals table does not exist, skipping originalMySidelineContactEmail column removal');
      return;
    }
    
    // Check if the column exists before trying to remove it
    const carnivalCols = await queryInterface.describeTable('carnivals');
    
    if (carnivalCols.originalMySidelineContactEmail) {
      await queryInterface.removeColumn('carnivals', 'originalMySidelineContactEmail');
      console.log('✅ Removed originalMySidelineContactEmail column from carnivals table');
    } else {
      console.log('ℹ️  originalMySidelineContactEmail column does not exist in carnivals table');
    }
  } catch (error) {
    console.log('⚠️  Could not remove originalMySidelineContactEmail column:', error.message);
    // Don't throw - this allows the migration rollback to succeed even if issues occur
  }
};
