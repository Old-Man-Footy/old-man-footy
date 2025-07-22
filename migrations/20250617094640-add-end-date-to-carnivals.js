'use strict';

/**
 * Add End Date to Carnivals Migration
 * Adds endDate column to carnivals table for multi-day carnival support
 * @type {import('sequelize-cli').Migration}
 */
export default {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('carnivals', 'endDate', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'End date for multi-day carnivals. If null, carnival is a single day event.'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('carnivals', 'endDate');
  }
};
