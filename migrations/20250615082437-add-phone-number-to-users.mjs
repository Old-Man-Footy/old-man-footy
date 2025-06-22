'use strict';

/**
 * Add Phone Number to Users Migration
 * Adds phoneNumber column to users table for contact information
 * @type {import('sequelize-cli').Migration}
 */
export default {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn('users', 'phoneNumber', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'User phone number for contact purposes and club auto-population'
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('users', 'phoneNumber');
  }
};
