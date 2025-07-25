/**
 * SyncLog Model - SQLite/Sequelize Implementation
 * 
 * Tracks MySideline sync operations to provide reliable sync status
 * regardless of whether individual events are updated during sync
 */

import { DataTypes, Model, Op } from 'sequelize';
import { sequelize } from '/config/database.mjs';

/**
 * SyncLog model class extending Sequelize Model
 */
class SyncLog extends Model {
  /**
   * Mark sync as completed
   * @param {Object} results - Sync results containing event counts
   */
  async markCompleted(results = {}) {
    return await this.update({
      status: 'completed',
      completedAt: new Date(),
      eventsProcessed: results.eventsProcessed || 0,
      eventsCreated: results.eventsCreated || 0,
      eventsUpdated: results.eventsUpdated || 0
    });
  }

  /**
   * Mark sync as failed
   * @param {string} errorMessage - Error message
   */
  async markFailed(errorMessage) {
    return await this.update({
      status: 'failed',
      completedAt: new Date(),
      errorMessage: errorMessage
    });
  }

  /**
   * Get the last successful sync of a given type
   * @param {string} syncType - Type of sync to check
   * @returns {Promise<SyncLog|null>} Last successful sync or null
   */
  static async getLastSuccessfulSync(syncType) {
    return await this.findOne({
      where: {
        syncType: syncType,
        status: 'completed'
      },
      order: [['completedAt', 'DESC']]
    });
  }

  /**
   * Check if we need to run a sync based on the last successful sync
   * @param {string} syncType - Type of sync to check
   * @param {number} intervalHours - Minimum hours between syncs (default: 24)
   * @returns {Promise<boolean>} True if sync should run
   */
  static async shouldRunSync(syncType, intervalHours = 24) {
    const lastSync = await this.getLastSuccessfulSync(syncType);
    
    if (!lastSync) {
      return true; // No previous sync found, should run
    }

    const now = new Date();
    const lastSyncTime = new Date(lastSync.completedAt);
    const hoursSinceLastSync = (now - lastSyncTime) / (1000 * 60 * 60);

    return hoursSinceLastSync >= intervalHours;
  }

  /**
   * Create a new sync log entry
   * @param {string} syncType - Type of sync
   * @param {Object} metadata - Optional metadata
   * @returns {Promise<SyncLog>} Created sync log
   */
  static async startSync(syncType, metadata = {}) {
    return await this.create({
      syncType: syncType,
      status: 'started',
      startedAt: new Date(),
      metadata: metadata
    });
  }

  /**
   * Get sync statistics for reporting
   * @param {string} syncType - Type of sync to get stats for
   * @param {number} days - Number of days to look back (default: 30)
   * @returns {Promise<Object>} Sync statistics
   */
  static async getSyncStats(syncType, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const syncs = await this.findAll({
      where: {
        syncType: syncType,
        startedAt: {
          [Op.gte]: startDate
        }
      },
      order: [['startedAt', 'DESC']]
    });

    const stats = {
      totalSyncs: syncs.length,
      successfulSyncs: syncs.filter(s => s.status === 'completed').length,
      failedSyncs: syncs.filter(s => s.status === 'failed').length,
      totalEventsProcessed: syncs.reduce((sum, s) => sum + (s.eventsProcessed || 0), 0),
      totalEventsCreated: syncs.reduce((sum, s) => sum + (s.eventsCreated || 0), 0),
      totalEventsUpdated: syncs.reduce((sum, s) => sum + (s.eventsUpdated || 0), 0),
      lastSuccessfulSync: syncs.find(s => s.status === 'completed')?.completedAt || null,
      lastFailedSync: syncs.find(s => s.status === 'failed')?.completedAt || null
    };

    return stats;
  }
}

/**
 * Initialize SyncLog model with schema definition
 */
SyncLog.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  syncType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('started', 'completed', 'failed'),
    allowNull: false,
    defaultValue: 'started'
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  eventsProcessed: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  eventsCreated: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  eventsUpdated: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'SyncLog',
  tableName: 'sync_logs',
  timestamps: true,
  indexes: [
    {
      fields: ['syncType']
    },
    {
      fields: ['status']
    },
    {
      fields: ['startedAt']
    },
    {
      fields: ['syncType', 'status', 'startedAt']
    }
  ]
});

export default SyncLog;