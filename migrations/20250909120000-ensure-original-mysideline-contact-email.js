'use strict';

/**
 * Ensure originalMySidelineContactEmail column exists in carnivals table
 * This migration runs after the initial database setup to fix E2E testing issues
 * where the original migration runs before the carnivals table is created
 */

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface, Sequelize) => {
  try {
    // Check if carnivals table exists
    const tables = await queryInterface.showAllTables();
    const carnivalsTableExists = tables.includes('carnivals');
    
    if (!carnivalsTableExists) {
      console.log('⚠️  carnivals table does not exist, cannot add originalMySidelineContactEmail column');
      return;
    }
    
    // Get current columns in carnivals table
    const carnivalCols = await queryInterface.describeTable('carnivals');
    
    // Add originalMySidelineContactEmail column if it doesn't exist
    if (!carnivalCols.originalMySidelineContactEmail) {
      await queryInterface.addColumn('carnivals', 'originalMySidelineContactEmail', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Original organiser contact email from MySideline import, preserved when carnival is claimed'
      });
      
      console.log('✅ Added originalMySidelineContactEmail column to carnivals table (post-setup)');
    } else {
      console.log('ℹ️  originalMySidelineContactEmail column already exists in carnivals table');
    }
  } catch (error) {
    console.error('❌ Failed to add originalMySidelineContactEmail column:', error.message);
    throw error; // This migration must succeed
  }
};

export const down = async (queryInterface, Sequelize) => {
  try {
    // Check if carnivals table exists
    const tables = await queryInterface.showAllTables();
    const carnivalsTableExists = tables.includes('carnivals');
    
    if (!carnivalsTableExists) {
      console.log('ℹ️  carnivals table does not exist, nothing to rollback');
      return;
    }
    
    // Check if column exists before trying to remove it
    const carnivalCols = await queryInterface.describeTable('carnivals');
    
    if (carnivalCols.originalMySidelineContactEmail) {
      await queryInterface.removeColumn('carnivals', 'originalMySidelineContactEmail');
      console.log('✅ Removed originalMySidelineContactEmail column from carnivals table');
    }
  } catch (error) {
    console.error('❌ Failed to remove originalMySidelineContactEmail column:', error.message);
    throw error;
  }
};
