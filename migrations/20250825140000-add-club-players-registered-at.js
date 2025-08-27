'use strict';

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface, Sequelize) => {
  // Add the missing registeredAt field to club_players table
  await queryInterface.addColumn('club_players', 'registeredAt', {
    type: Sequelize.DATE,
    allowNull: true,
    comment: 'When the player was registered with the club'
  });
};

export const down = async (queryInterface, Sequelize) => {
  // Remove the registeredAt field
  await queryInterface.removeColumn('club_players', 'registeredAt');
};
