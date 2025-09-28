/**
 * EmailSubscription Model - SQLite/Sequelize Implementation
 * 
 * Manages email subscription preferences for carnival notifications
 * with state-based filtering and unsubscribe functionality.
 */

import { DataTypes, Model, Op } from 'sequelize';
import crypto from 'crypto';
import { sequelize } from '../config/database.mjs';
import { DEFAULT_NOTIFICATION_PREFERENCES, NOTIFICATION_TYPES_ARRAY } from '../config/constants.mjs';

/**
 * EmailSubscription model class extending Sequelize Model
 */
class EmailSubscription extends Model {
  /**
   * Generate secure unsubscribe token
   * @returns {string} Generated unsubscribe token
   */
  generateUnsubscribeToken() {
    this.unsubscribeToken = crypto.randomBytes(32).toString('hex');
    return this.unsubscribeToken;
  }

  /**
   * Generate secure verification token
   * @returns {string} Generated verification token
   */
  generateVerificationToken() {
    this.verificationToken = crypto.randomBytes(32).toString('hex');
    // Set expiry to 7 days from now
    this.verificationTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return this.verificationToken;
  }

  /**
   * Check if verification token is valid and not expired
   * @returns {boolean} Whether verification token is valid
   */
  isVerificationTokenValid() {
    return this.verificationToken && 
           this.verificationTokenExpiresAt && 
           new Date() < this.verificationTokenExpiresAt;
  }

  /**
   * Mark subscription as verified
   */
  verify() {
    this.isActive = true;
    this.verificationToken = null;
    this.verificationTokenExpiresAt = null;
  }

  /**
   * Check if subscription includes a specific notification type
   * @param {string} notificationType - Notification type to check
   * @returns {boolean} Whether subscription includes the notification type
   */
  includesNotification(notificationType) {
    return this.notificationPreferences && this.notificationPreferences.includes(notificationType);
  }

  /**
   * Add notification type to subscription
   * @param {string} notificationType - Notification type to add
   */
  addNotification(notificationType) {
    if (!NOTIFICATION_TYPES_ARRAY.includes(notificationType)) {
      throw new Error(`Invalid notification type: ${notificationType}`);
    }
    if (!this.notificationPreferences) this.notificationPreferences = [];
    if (!this.notificationPreferences.includes(notificationType)) {
      this.notificationPreferences.push(notificationType);
    }
  }

  /**
   * Remove notification type from subscription
   * @param {string} notificationType - Notification type to remove
   */
  removeNotification(notificationType) {
    if (this.notificationPreferences) {
      this.notificationPreferences = this.notificationPreferences.filter(n => n !== notificationType);
    }
  }

  /**
   * Check if subscription includes a specific state (legacy method for backwards compatibility)
   * @param {string} state - State to check
   * @returns {boolean} Whether subscription includes the state
   */
  includesState(state) {
    return this.states && this.states.includes(state);
  }

  /**
   * Add state to subscription (legacy method for backwards compatibility)
   * @param {string} state - State to add
   */
  addState(state) {
    if (!this.states) this.states = [];
    if (!this.states.includes(state)) {
      this.states.push(state);
    }
  }

  /**
   * Remove state from subscription (legacy method for backwards compatibility)
   * @param {string} state - State to remove
   */
  removeState(state) {
    if (this.states) {
      this.states = this.states.filter(s => s !== state);
    }
  }

  /**
   * Find active subscriptions for a specific notification type
   * @param {string} notificationType - Notification type to find subscriptions for
   * @returns {Promise<Array>} Array of active subscriptions
   */
  static async findByNotificationType(notificationType) {
    // Fetch all active subscriptions, then filter in JS for SQLite compatibility
    const allActive = await this.findAll({ where: { isActive: true } });
    return allActive.filter(sub => 
      Array.isArray(sub.notificationPreferences) && 
      sub.notificationPreferences.includes(notificationType)
    );
  }

  /**
   * Find active subscriptions for a specific state (legacy method for backwards compatibility)
   * @param {string} state - State to find subscriptions for
   * @returns {Promise<Array>} Array of active subscriptions
   */
  static async findByState(state) {
    // Fetch all active subscriptions, then filter in JS for SQLite compatibility
    const allActive = await this.findAll({ where: { isActive: true } });
    return allActive.filter(sub => Array.isArray(sub.states) && sub.states.includes(state));
  }

  /**
   * Clean up expired verification tokens
   * @returns {Promise<number>} Number of expired tokens cleaned up
   */
  static async cleanupExpiredTokens() {
    const result = await this.destroy({
      where: {
        isActive: false,
        verificationTokenExpiresAt: {
          [Op.lt]: new Date()
        }
      }
    });
    return result;
  }

  /**
   * Find subscription by verification token
   * @param {string} token - Verification token
   * @returns {Promise<EmailSubscription|null>} Found subscription or null
   */
  static async findByVerificationToken(token) {
    return await this.findOne({
      where: {
        verificationToken: token,
        verificationTokenExpiresAt: {
          [Op.gt]: new Date()
        }
      }
    });
  }
}

/**
 * Initialize EmailSubscription model with schema definition
 */
EmailSubscription.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    set(value) {
      this.setDataValue('email', value.toLowerCase().trim());
    }
  },
  states: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'Legacy field for Australian states (backwards compatibility)'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Whether the email subscription is active (verified)'
  },
  notificationPreferences: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON array of selected notification types',
    get() {
      const value = this.getDataValue('notificationPreferences');
      if (!value) return DEFAULT_NOTIFICATION_PREFERENCES;
      try {
        return JSON.parse(value);
      } catch {
        return DEFAULT_NOTIFICATION_PREFERENCES;
      }
    },
    set(value) {
      if (Array.isArray(value)) {
        // Validate notification types
        const validTypes = value.filter(type => NOTIFICATION_TYPES_ARRAY.includes(type));
        this.setDataValue('notificationPreferences', JSON.stringify(validTypes));
      } else {
        this.setDataValue('notificationPreferences', JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES));
      }
    }
  },
  verificationToken: {
    type: DataTypes.STRING(256),
    allowNull: true,
    comment: 'Token used for email verification'
  },
  verificationTokenExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Expiry date for the verification token'
  },
  unsubscribeToken: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  source: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'homepage',
    comment: 'Source of the subscription (e.g., homepage, contact_form, admin)'
  },
  unsubscribedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
    comment: 'Timestamp when the user unsubscribed from email notifications'
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
  modelName: 'EmailSubscription',
  tableName: 'email_subscriptions',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      fields: ['isActive']
    }
  ],
  hooks: {
    /**
     * Generate unsubscribe token before creating subscription
     */
    beforeCreate: async (subscription, options) => {
      if (!subscription.unsubscribeToken) {
        subscription.generateUnsubscribeToken();
      }
    },

    /**
     * Automatically set unsubscribedAt when isActive changes from true to false
     * This ensures data consistency and audit trail for unsubscribe actions
     */
    beforeUpdate: async (subscription, options) => {
      // Check if isActive is being changed from true to false
      if (subscription.changed('isActive') && 
          subscription.previous('isActive') === true && 
          subscription.isActive === false) {
        // Set unsubscribedAt timestamp if not already set
        if (!subscription.unsubscribedAt) {
          subscription.unsubscribedAt = new Date();
        }
      }
      
      // If reactivating subscription (false to true), clear unsubscribedAt
      if (subscription.changed('isActive') && 
          subscription.previous('isActive') === false && 
          subscription.isActive === true) {
        subscription.unsubscribedAt = null;
      }
    }
  }
});

export default EmailSubscription;