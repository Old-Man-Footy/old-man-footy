'use strict';

/**
 * Add isPubliclyVisible column to sponsors table
 * This column controls whether a sponsor appears in public listings
 */

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface, Sequelize) => {
  // Check if sponsors table exists and get current columns
  const sponsorCols = await queryInterface.describeTable('sponsors');
  
  // Add isPubliclyVisible column if it doesn't exist
  if (!sponsorCols.isPubliclyVisible) {
    await queryInterface.addColumn('sponsors', 'isPubliclyVisible', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    });
    
    console.log('✅ Added isPubliclyVisible column to sponsors table');
  } else {
    console.log('ℹ️  isPubliclyVisible column already exists in sponsors table');
  }
};

export const down = async (queryInterface, Sequelize) => {
  // Check if the column exists before trying to remove it
  const sponsorCols = await queryInterface.describeTable('sponsors');
  
  if (sponsorCols.isPubliclyVisible) {
    await queryInterface.removeColumn('sponsors', 'isPubliclyVisible');
    console.log('✅ Removed isPubliclyVisible column from sponsors table');
  } else {
    console.log('ℹ️  isPubliclyVisible column does not exist in sponsors table');
  }
};
