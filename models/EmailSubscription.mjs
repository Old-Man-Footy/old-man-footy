/**
 * EmailSubscription Model - SQLite/Sequelize Implementation
 * 
 * Manages email subscription preferences for carnival notifications
 * with state-based filtering and unsubscribe functionality.
 */

import { DataTypes, Model, Op } from 'sequelize';
import crypto from 'crypto';
import { sequelize } from '../config/database.mjs';

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
   * Check if subscription includes a specific state
   * @param {string} state - State to check
   * @returns {boolean} Whether subscription includes the state
   */
  includesState(state) {
    return this.states && this.states.includes(state);
  }

  /**
   * Add state to subscription
   * @param {string} state - State to add
   */
  addState(state) {
    if (!this.states) this.states = [];
    if (!this.states.includes(state)) {
      this.states.push(state);
    }
  }

  /**
   * Remove state from subscription
   * @param {string} state - State to remove
   */
  removeState(state) {
    if (this.states) {
      this.states = this.states.filter(s => s !== state);
    }
  }

  /**
   * Find active subscriptions for a specific state
   * @param {string} state - State to find subscriptions for
   * @returns {Promise<Array>} Array of active subscriptions
   */
  static async findByState(state) {
    // Fetch all active subscriptions, then filter in JS for SQLite compatibility
    const allActive = await this.findAll({ where: { isActive: true } });
    return allActive.filter(sub => Array.isArray(sub.states) && sub.states.includes(state));
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
    defaultValue: []
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
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