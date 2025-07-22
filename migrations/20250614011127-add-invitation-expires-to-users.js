'use strict';

/**
 * Add Invitation Expires to Users Migration
 * Adds invitationExpires column to users table for better token management
 * @type {import('sequelize-cli').Migration}
 */
export default {
  async up (queryInterface, Sequelize) {
    /**
     * Add the missing invitationExpires column to the users table.
     * The User model expects this column but it wasn't created in the initial migration.
     */
    await queryInterface.addColumn('users', 'invitationExpires', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Expiration date for invitation tokens'
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Remove the invitationExpires column if rolling back
     */
    await queryInterface.removeColumn('users', 'invitationExpires');
  }
};
