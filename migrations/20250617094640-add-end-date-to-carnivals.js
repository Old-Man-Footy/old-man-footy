'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
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
