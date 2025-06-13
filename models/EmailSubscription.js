/**
 * EmailSubscription Model - SQLite/Sequelize Implementation
 * 
 * Manages email subscription preferences for carnival notifications
 * with state-based filtering and unsubscribe functionality.
 */

const { DataTypes, Model } = require('sequelize');
const crypto = require('crypto');
const { sequelize } = require('../config/database');

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
    return await this.findAll({
      where: {
        isActive: true,
        states: {
          [require('sequelize').Op.like]: `%"${state}"%`
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
    validate: {
      isEmail: true,
      notEmpty: true
    },
    set(value) {
      this.setDataValue('email', value.toLowerCase().trim());
    }
  },
  states: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    validate: {
      isValidStates(value) {
        if (!Array.isArray(value)) {
          throw new Error('States must be an array');
        }
        const validStates = ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'];
        const invalid = value.filter(state => !validStates.includes(state));
        if (invalid.length > 0) {
          throw new Error(`Invalid states: ${invalid.join(', ')}`);
        }
      }
    }
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
    }
  }
});

module.exports = EmailSubscription;