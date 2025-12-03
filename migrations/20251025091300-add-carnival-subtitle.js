'use strict';

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('Carnivals', 'subtitle', {
    type: Sequelize.TEXT,
    allowNull: true,
    comment: 'The subtitle of the carnival'
  });

  await queryInterface.addColumn('Carnivals', 'mySidelineSubtitle', {
    type: Sequelize.TEXT,
    allowNull: true,
    comment: 'The MySideline subtitle of the carnival'
  });

};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.removeColumn('Carnivals', 'subtitle');
  await queryInterface.removeColumn('Carnivals', 'mySidelineSubtitle');
};
