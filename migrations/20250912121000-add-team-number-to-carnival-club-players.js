/**
 * Migration: Add teamNumber to carnival_club_players table
 * Purpose: Enable assigning players to specific teams within a club's carnival registration
 */

export const up = async (queryInterface, Sequelize) => {
  console.log('Adding teamNumber column to carnival_club_players table...');
  
  // Add teamNumber column
  await queryInterface.addColumn('carnival_club_players', 'teamNumber', {
    type: Sequelize.INTEGER,
    allowNull: true, // Allows for unassigned players
    comment: 'Team number (1-N) for multi-team club registrations, null for unassigned players',
    validate: {
      min: 1,
      max: 10 // Match the max numberOfTeams constraint
    }
  });

  // Add index for teamNumber for better query performance
  await queryInterface.addIndex('carnival_club_players', ['teamNumber'], {
    name: 'idx_carnival_club_players_team_number'
  });

  console.log('✅ teamNumber column added successfully');
};

export const down = async (queryInterface, Sequelize) => {
  console.log('Removing teamNumber column from carnival_club_players table...');
  
  // Remove index first
  await queryInterface.removeIndex('carnival_club_players', 'idx_carnival_club_players_team_number');
  
  // Remove column
  await queryInterface.removeColumn('carnival_club_players', 'teamNumber');
  
  console.log('✅ teamNumber column removed successfully');
};
