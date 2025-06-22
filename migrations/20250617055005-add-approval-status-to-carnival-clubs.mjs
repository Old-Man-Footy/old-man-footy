'use strict';

/**
 * Add Approval Status to Carnival Clubs Migration
 * Adds approval workflow fields to carnival_clubs table
 * @type {import('sequelize-cli').Migration}
 */
export default {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('carnival_clubs', 'approvalStatus', {
      type: Sequelize.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Approval status for carnival registration'
    });

    await queryInterface.addColumn('carnival_clubs', 'approvedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'When the registration was approved'
    });

    await queryInterface.addColumn('carnival_clubs', 'approvedByUserId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'User who approved the registration'
    });

    await queryInterface.addColumn('carnival_clubs', 'rejectionReason', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Reason for rejection if status is rejected'
    });

    // Update existing registrations to be approved by default (backward compatibility)
    await queryInterface.sequelize.query(`
      UPDATE carnival_clubs 
      SET approvalStatus = 'approved', approvedAt = createdAt 
      WHERE isActive = 1
    `);

    // Add index for performance
    await queryInterface.addIndex('carnival_clubs', ['approvalStatus']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeIndex('carnival_clubs', ['approvalStatus']);
    await queryInterface.removeColumn('carnival_clubs', 'rejectionReason');
    await queryInterface.removeColumn('carnival_clubs', 'approvedByUserId');
    await queryInterface.removeColumn('carnival_clubs', 'approvedAt');
    await queryInterface.removeColumn('carnival_clubs', 'approvalStatus');
  }
};
