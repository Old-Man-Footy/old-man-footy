'use strict';

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface, Sequelize) => {
  // Add team registration fee and per-player fee fields to carnivals table
  await queryInterface.addColumn('carnivals', 'teamRegistrationFee', {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00,
    comment: 'Standard team registration fee for this carnival'
  });

  await queryInterface.addColumn('carnivals', 'perPlayerFee', {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00,
    comment: 'Fee charged per player participating in this carnival'
  });
};

export const down = async (queryInterface, Sequelize) => {
  // Remove the fee fields
  await queryInterface.removeColumn('carnivals', 'teamRegistrationFee');
  await queryInterface.removeColumn('carnivals', 'perPlayerFee');
};
