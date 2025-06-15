'use strict';

/**
 * Add lastLoginAt field to users table for tracking login activity
 * This enables proper site interaction statistics in admin reports
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add lastLoginAt column to track when users actually log into the system
     * This will provide meaningful "active user" statistics based on actual usage
     */
    await queryInterface.addColumn('users', 'lastLoginAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp of user\'s last successful login for activity tracking'
    });

    // Add index for performance when querying recent login activity
    await queryInterface.addIndex('users', ['lastLoginAt'], {
      name: 'users_last_login_at_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Remove the lastLoginAt column and its index if rolling back
     */
    await queryInterface.removeIndex('users', 'users_last_login_at_idx');
    await queryInterface.removeColumn('users', 'lastLoginAt');
  }
};
