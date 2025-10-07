'use strict';

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface, Sequelize) => {
  // Check if phoneNumber column already exists
  const tableDescription = await queryInterface.describeTable('club_players');
  
  if (!tableDescription.phoneNumber) {
    await queryInterface.addColumn('club_players', 'phoneNumber', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'email' // SQLite doesn't support AFTER, but it's good to document intent
    });
    console.log('✅ Added phoneNumber column to club_players table');
  } else {
    console.log('ℹ️ phoneNumber column already exists in club_players table');
  }
};

export const down = async (queryInterface, Sequelize) => {
  // Remove the phoneNumber column
  const tableDescription = await queryInterface.describeTable('club_players');
  
  if (tableDescription.phoneNumber) {
    await queryInterface.removeColumn('club_players', 'phoneNumber');
    console.log('✅ Removed phoneNumber column from club_players table');
  } else {
    console.log('ℹ️ phoneNumber column does not exist in club_players table');
  }
};
