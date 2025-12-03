'use strict';

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('Carnivals', 'isDisabled', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Indicates if the carnival has been manually disabled or merged into another carnival'
  });
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.removeColumn('Carnivals', 'isDisabled');
};
