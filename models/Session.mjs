/**
 * Session Model - SQLite/Sequelize Implementation
 * 
 * Manages user sessions for the Old Man Footy platform.
 * This model provides architectural consistency with other tables
 * while working alongside connect-session-sequelize's SequelizeStore.
 */

import { DataTypes, Model, Op } from 'sequelize';
import { sequelize } from '../config/database.mjs';

/**
 * Session model class extending Sequelize Model
 */
class Session extends Model {
  /**
   * Check if session has expired
   * @returns {boolean} True if session is expired
   */
  isExpired() {
    if (!this.expires) return false;
    return new Date() > new Date(this.expires);
  }

  /**
   * Get parsed session data
   * @returns {Object|null} Parsed session data or null if invalid
   */
  getParsedData() {
    if (!this.data) return null;
    try {
      return JSON.parse(this.data);
    } catch (error) {
      console.warn('Failed to parse session data:', error.message);
      return null;
    }
  }

  /**
   * Get user ID from session data
   * @returns {number|null} User ID if available in session
   */
  getUserId() {
    const data = this.getParsedData();
    return data?.passport?.user || data?.userId || null;
  }

  /**
   * Static method to clean up expired sessions
   * @returns {Promise<number>} Number of sessions deleted
   */
  static async cleanupExpired() {
    const count = await this.destroy({
      where: {
        expires: {
          [Op.lt]: new Date()
        }
      }
    });
    return count;
  }

  /**
   * Static method to get active session count
   * @returns {Promise<number>} Number of active sessions
   */
  static async getActiveCount() {
    return await this.count({
      where: {
        [Op.or]: [
          { expires: null },
          {
            expires: {
              [Op.gt]: new Date()
            }
          }
        ]
      }
    });
  }
}

// Initialize Session model
Session.init({
  sid: {
    type: DataTypes.STRING(32),
    primaryKey: true,
    allowNull: false,
    comment: 'Session identifier'
  },
  expires: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Session expiration time'
  },
  data: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Serialized session data'
  }
}, {
  sequelize,
  modelName: 'Session',
  tableName: 'sessions',
  timestamps: true, // Uses createdAt and updatedAt
  
  // Important: Don't sync this model automatically as connect-session-sequelize handles it
  sync: false,
  
  indexes: [
    {
      fields: ['expires'],
      name: 'sessions_expires_idx'
    }
  ],
  
  comment: 'User session storage managed by connect-session-sequelize'
});

export default Session;
