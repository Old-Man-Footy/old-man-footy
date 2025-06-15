'use strict';

/**
 * Add SyncLog table to track MySideline sync operations
 * This solves the issue where sync status was unreliable when no events were updated
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sync_logs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      syncType: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Type of sync (e.g., "mysideline", "manual", "scheduled")'
      },
      status: {
        type: Sequelize.ENUM('started', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'started'
      },
      startedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      eventsProcessed: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Number of events processed during this sync'
      },
      eventsCreated: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Number of new events created during this sync'
      },
      eventsUpdated: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Number of existing events updated during this sync'
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if sync failed'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional sync metadata (trigger source, user, etc.)'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes for efficient querying
    await queryInterface.addIndex('sync_logs', ['syncType']);
    await queryInterface.addIndex('sync_logs', ['status']);
    await queryInterface.addIndex('sync_logs', ['startedAt']);
    await queryInterface.addIndex('sync_logs', ['syncType', 'status', 'startedAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('sync_logs');
  }
};
