/**
 * Migration: Add numberOfTeams field to carnival_clubs table
 * 
 * This migration adds support for multi-team club registration
 * by allowing clubs to specify how many teams they want to register.
 */

'use strict';

/**
 * Add numberOfTeams column to carnival_clubs table
 */
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('carnival_clubs', 'numberOfTeams', {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Number of teams the club wants to register for this carnival'
  });

  // Add index for better query performance
  await queryInterface.addIndex('carnival_clubs', ['numberOfTeams'], {
    name: 'idx_carnival_clubs_number_of_teams'
  });
};

/**
 * Remove numberOfTeams column from carnival_clubs table
 */
export const down = async (queryInterface, Sequelize) => {
  // Remove index first
  await queryInterface.removeIndex('carnival_clubs', 'idx_carnival_clubs_number_of_teams');
  
  // Remove column
  await queryInterface.removeColumn('carnival_clubs', 'numberOfTeams');
};
