/**
 * Migration: Add displayOrder column to sponsors table
 */

'use strict';

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('sponsors', 'displayOrder', {
    type: Sequelize.INTEGER,
    allowNull: true,
    comment: 'Display order for sponsor listing within a club'
  });
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.removeColumn('sponsors', 'displayOrder');
};
