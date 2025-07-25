/**
 * AuditLog Model - SQLite/Sequelize Implementation
 * 
 * Manages audit trail for all significant actions in the system,
 * providing comprehensive tracking for security and compliance.
 */

import { DataTypes, Model, Op, fn } from 'sequelize';
import { sequelize } from '../config/database.mjs';
import User from './User.mjs';

/**
 * AuditLog model class extending Sequelize Model
 */
class AuditLog extends Model {
  /**
   * Log a user or system action
   * @param {Object} actionData - The action data to log
   * @param {number|null} actionData.userId - User who performed the action (null for system actions)
   * @param {string} actionData.action - Action performed (e.g., CREATE_USER, UPDATE_CARNIVAL)
   * @param {string} actionData.entityType - Type of entity affected (e.g., User, Club, Carnival)
   * @param {number|null} actionData.entityId - ID of the affected entity
   * @param {Object|null} actionData.oldValues - Previous values (for UPDATE/DELETE actions)
   * @param {Object|null} actionData.newValues - New values (for CREATE/UPDATE actions)
   * @param {Object|null} actionData.request - Express request object for extracting IP, user agent, etc.
   * @param {string} actionData.result - SUCCESS or FAILURE
   * @param {string|null} actionData.errorMessage - Error message if action failed
   * @param {Object|null} actionData.metadata - Additional context-specific data
   * @returns {Promise<AuditLog>} Created audit log entry
   */
  static async logAction(actionData) {
    const {
      userId,
      action,
      entityType,
      entityId,
      oldValues,
      newValues,
      request,
      result = 'SUCCESS',
      errorMessage,
      metadata
    } = actionData;

    // Validate result
    if (result !== 'SUCCESS' && result !== 'FAILURE') {
      throw new Error('AuditLog result must be either "SUCCESS" or "FAILURE"');
    }

    // Extract request information if available
    let ipAddress = null;
    let userAgent = null;
    let sessionId = null;

    if (request) {
      // Get IP address from various possible headers
      ipAddress = request.ip || 
                  request.connection?.remoteAddress || 
                  request.socket?.remoteAddress ||
                  (request.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
                  request.headers['x-real-ip'] ||
                  null;

      userAgent = request.headers['user-agent'] || null;
      sessionId = request.sessionID || request.session?.id || null;
    }

    return await this.create({
      userId,
      action,
      entityType,
      entityId,
      oldValues: oldValues || null,
      newValues: newValues || null,
      ipAddress,
      userAgent,
      sessionId,
      result,
      errorMessage,
      metadata: metadata || null
    });
  }

  /**
   * Get audit logs for a specific user
   * @param {number} userId - User ID to get logs for
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of records to return (default: 50)
   * @param {number} options.offset - Number of records to skip (default: 0)
   * @param {Date} options.startDate - Start date filter
   * @param {Date} options.endDate - End date filter
   * @param {string[]} options.actions - Specific actions to filter by
   * @returns {Promise<Object>} Object with rows and count
   */
  static async getUserAuditLogs(userId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      startDate,
      endDate,
      actions
    } = options;

    const whereConditions = { userId };

    if (startDate && endDate) {
      whereConditions.createdAt = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      whereConditions.createdAt = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      whereConditions.createdAt = {
        [Op.lte]: endDate
      };
    }

    if (actions && actions.length > 0) {
      whereConditions.action = {
        [Op.in]: actions
      };
    }

    return await this.findAndCountAll({
      where: whereConditions,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        required: false
      }]
    });
  }

  /**
   * Get audit logs for a specific entity
   * @param {string} entityType - Type of entity (e.g., 'Carnival', 'Club')
   * @param {number} entityId - ID of the entity
   * @param {Object} options - Query options
   * @returns {Promise<AuditLog[]>} Array of audit logs
   */
  static async getEntityAuditLogs(entityType, entityId, options = {}) {
    const { limit = 50, offset = 0 } = options;

    return await this.findAll({
      where: {
        entityType,
        entityId
      },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        required: false
      }]
    });
  }

  /**
   * Get audit log statistics for admin dashboard
   * @param {Object} options - Query options
   * @param {Date} options.startDate - Start date for statistics
   * @param {Date} options.endDate - End date for statistics
   * @returns {Promise<Object>} Statistics object
   */
  static async getAuditStatistics(options = {}) {
    const { startDate, endDate } = options;
    
    const whereConditions = {};
    if (startDate && endDate) {
      whereConditions.createdAt = {
        [Op.between]: [startDate, endDate]
      };
    }

    const [
      totalActions,
      failedActions,
      actionsByType,
      actionsByUser
    ] = await Promise.all([
      this.count({ where: whereConditions }),
      this.count({ where: { ...whereConditions, result: 'FAILURE' } }),
      this.findAll({
        where: whereConditions,
        attributes: [
          'action',
          [fn('COUNT', '*'), 'count']
        ],
        group: ['action'],
        order: [[fn('COUNT', '*'), 'DESC']],
        limit: 10,
        raw: true
      }),
      this.findAll({
        where: { ...whereConditions, userId: { [Op.ne]: null } },
        attributes: [
          'userId',
          [fn('COUNT', '*'), 'count']
        ],
        group: ['userId'],
        order: [[fn('COUNT', '*'), 'DESC']],
        limit: 10,
        raw: true,
        include: [{
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName', 'email'],
          required: false
        }]
      })
    ]);

    return {
      totalActions,
      successfulActions: totalActions - failedActions,
      failedActions,
      successRate: totalActions > 0 ? ((totalActions - failedActions) / totalActions * 100).toFixed(2) : 100,
      actionsByType,
      actionsByUser
    };
  }

  /**
   * Clean up old audit logs based on retention policy
   * @param {number} retentionDays - Number of days to retain logs (default: 365)
   * @returns {Promise<number>} Number of deleted records
   */
  static async cleanupOldLogs(retentionDays = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.destroy({
      where: {
        createdAt: {
          [Op.lt]: cutoffDate
        }
      }
    });

    console.log(`🧹 Cleaned up ${result} audit log entries older than ${retentionDays} days`);
    return result;
  }
}

/**
 * Initialize AuditLog model with schema definition
 */
AuditLog.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  entityType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 50]
    }
  },
  entityId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  oldValues: {
    type: DataTypes.JSON,
    allowNull: true
  },
  newValues: {
    type: DataTypes.JSON,
    allowNull: true
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    validate: {
      isIP: true
    }
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sessionId: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  result: {
    type: DataTypes.ENUM('SUCCESS', 'FAILURE'),
    allowNull: false,
    defaultValue: 'SUCCESS'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'AuditLog',
  tableName: 'audit_logs',
  timestamps: true,
  updatedAt: false, // Only track creation time for audit logs
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['action']
    },
    {
      fields: ['entityType']
    },
    {
      fields: ['entityId']
    },
    {
      fields: ['createdAt']
    },
    {
      fields: ['result']
    },
    {
      fields: ['userId', 'createdAt']
    },
    {
      fields: ['entityType', 'entityId']
    }
  ]
});

export default AuditLog;