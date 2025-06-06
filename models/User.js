/**
 * User Model - SQLite/Sequelize Implementation
 * 
 * Manages user accounts, authentication, and club associations
 * for Rugby League Masters platform delegates and administrators.
 */

const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sequelize } = require('../config/database');

/**
 * User model class extending Sequelize Model
 */
class User extends Model {
  /**
   * Compare provided password with stored hash
   * @param {string} candidatePassword - Password to verify
   * @returns {Promise<boolean>} Password match result
   */
  async comparePassword(candidatePassword) {
    if (!this.passwordHash) return false;
    return await bcrypt.compare(candidatePassword, this.passwordHash);
  }

  /**
   * Generate secure invitation token for new user registration
   * @returns {string} Generated invitation token
   */
  generateInvitationToken() {
    this.invitationToken = crypto.randomBytes(32).toString('hex');
    this.tokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    return this.invitationToken;
  }

  /**
   * Check if invitation token is still valid
   * @returns {boolean} Token validity status
   */
  isInvitationTokenValid() {
    return this.invitationToken && this.tokenExpires && new Date() < this.tokenExpires;
  }

  /**
   * Clear invitation token after successful registration
   */
  clearInvitationToken() {
    this.invitationToken = null;
    this.tokenExpires = null;
  }

  /**
   * Get user's full name
   * @returns {string} Combined first and last name
   */
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }
}

/**
 * Initialize User model with schema definition
 */
User.init({
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
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      notEmpty: true,
      isValidPassword(value) {
        if (this.isActive && !value) {
          throw new Error('Password is required for active users');
        }
      }
    }
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 50]
    },
    set(value) {
      this.setDataValue('firstName', value.trim());
    }
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 50]
    },
    set(value) {
      this.setDataValue('lastName', value.trim());
    }
  },
  clubId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Clubs',
      key: 'id'
    }
  },
  isPrimaryDelegate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  invitationToken: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  tokenExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      fields: ['clubId']
    },
    {
      fields: ['isActive']
    },
    {
      unique: true,
      fields: ['invitationToken'],
      where: {
        invitationToken: {
          [require('sequelize').Op.ne]: null
        }
      }
    }
  ],
  hooks: {
    /**
     * Hash password before creating or updating user
     */
    beforeSave: async (user, options) => {
      if (user.changed('passwordHash') && user.passwordHash) {
        try {
          const salt = await bcrypt.genSalt(12);
          user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
        } catch (error) {
          throw new Error(`Password hashing failed: ${error.message}`);
        }
      }
    },

    /**
     * Validate business rules before save
     */
    beforeValidate: async (user, options) => {
      // Ensure only one primary delegate per club
      if (user.isPrimaryDelegate && user.clubId) {
        const existingPrimary = await User.findOne({
          where: {
            clubId: user.clubId,
            isPrimaryDelegate: true,
            isActive: true,
            id: { [require('sequelize').Op.ne]: user.id || 0 }
          }
        });
        
        if (existingPrimary) {
          throw new Error('Club already has a primary delegate');
        }
      }
    }
  }
});

module.exports = User;