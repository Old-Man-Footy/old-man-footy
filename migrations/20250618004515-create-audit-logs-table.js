'use strict';

/**
 * Create AuditLog table to track key user and system actions
 * This provides comprehensive audit trails for security, compliance, and administrative oversight
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who performed the action (null for system actions)'
      },
      action: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Action performed (e.g., CREATE_USER, UPDATE_CARNIVAL, DELETE_CLUB)'
      },
      entityType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Type of entity affected (e.g., User, Club, Carnival, Player)'
      },
      entityId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'ID of the affected entity'
      },
      oldValues: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Previous values (for UPDATE/DELETE actions)'
      },
      newValues: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'New values (for CREATE/UPDATE actions)'
      },
      ipAddress: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'IP address of the user (supports both IPv4 and IPv6)'
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Browser user agent string'
      },
      sessionId: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Session identifier for tracking user sessions'
      },
      result: {
        type: Sequelize.ENUM('SUCCESS', 'FAILURE'),
        allowNull: false,
        defaultValue: 'SUCCESS',
        comment: 'Whether the action succeeded or failed'
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if action failed'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional context-specific data'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes for efficient querying
    await queryInterface.addIndex('audit_logs', ['userId']);
    await queryInterface.addIndex('audit_logs', ['action']);
    await queryInterface.addIndex('audit_logs', ['entityType']);
    await queryInterface.addIndex('audit_logs', ['entityId']);
    await queryInterface.addIndex('audit_logs', ['createdAt']);
    await queryInterface.addIndex('audit_logs', ['result']);
    await queryInterface.addIndex('audit_logs', ['userId', 'createdAt']);
    await queryInterface.addIndex('audit_logs', ['entityType', 'entityId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('audit_logs');
  }
};
