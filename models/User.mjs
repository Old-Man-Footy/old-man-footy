/**
 * User Model - SQLite/Sequelize Implementation
 * 
 * Manages user accounts, authentication, and club associations
 * for Old Man Footy platform delegates and administrators.
 */

import { DataTypes, Model, Op } from 'sequelize';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sequelize } from '/config/database.mjs';

/**
 * User model class extending Sequelize Model
 */
class User extends Model {
  /**
   * Compare provided password with stored hash
   * @param {string} candidatePassword - Password to verify
   * @returns {Promise<boolean>} Password match result
   */
  async checkPassword(candidatePassword) {
    if (!this.passwordHash) return false;
    try {
      return await bcrypt.compare(candidatePassword, this.passwordHash);
    } catch (error) {
      throw new Error(`Bcrypt error`);
    }
  }

  /**
   * Legacy method name for backwards compatibility
   */
  async comparePassword(candidatePassword) {
    return this.checkPassword(candidatePassword);
  }

  /**
   * Get user's full name
   * @returns {string} Combined first and last name
   */
  getFullName() {
    return `${this.firstName || ''} ${this.lastName || ''}`;
  }

  /**
   * Get user's full name (getter property)
   * @returns {string} Combined first and last name
   */
  get fullName() {
    return this.getFullName();
  }

  /**
   * Generate secure invitation token for new user registration
   * @returns {string} Generated invitation token
   */
  generateInvitationToken() {
    this.invitationToken = crypto.randomBytes(16).toString('hex'); // 32 characters
    this.invitationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    this.tokenExpires = this.invitationExpires; // Backwards compatibility
    return this.invitationToken;
  }

  /**
   * Check if invitation token is still valid
   * @returns {boolean} Token validity status
   */
  isInvitationValid() {
    return this.invitationToken && 
           this.invitationExpires && 
           new Date() < this.invitationExpires;
  }

  /**
   * Legacy method name for backwards compatibility
   */
  isInvitationTokenValid() {
    return this.isInvitationValid();
  }

  /**
   * Clear invitation token after successful registration
   */
  clearInvitationToken() {
    this.invitationToken = null;
    this.invitationExpires = null;
    this.tokenExpires = null;
  }

  /**
   * Static method to find user by email
   * @param {string} email - Email to search for
   * @returns {Promise<User|null>} Found user or null
   */
  static async findByEmail(email) {
    return await this.findOne({
      where: { email: email.toLowerCase().trim() }
    });
  }

  /**
   * Static method to find only active users
   * @returns {Promise<User[]>} Array of active users
   */
  static async findActiveUsers() {
    return await this.findAll({
      where: { isActive: true }
    });
  }

  /**
   * Static method to create user with invitation token
   * @param {Object} userData - User data for creation
   * @returns {Promise<User>} Created user with invitation token
   */
  static async createWithInvitation(userData) {
    const user = await this.create(userData);
    user.generateInvitationToken();
    await user.save();
    return user;
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
    set(value) {
      this.setDataValue('email', value.toLowerCase().trim());
    }
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      // Only set if value is provided
      if (value) {
        this.setDataValue('passwordHash', value);
      }
    }
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
    set(value) {
      this.setDataValue('firstName', value ? value.trim() : value);
    }
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
    set(value) {
      this.setDataValue('lastName', value ? value.trim() : value);
    }
  },
  phoneNumber: {
    type: DataTypes.STRING(20),
    allowNull: true,
    set(value) {
      this.setDataValue('phoneNumber', value ? value.trim() : value);
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
  invitationExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  tokenExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  passwordResetToken: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  lastLoginAt: {
    type: DataTypes.DATE,
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
            id: { [Op.ne]: user.id || 0 }
          }
        });
        
        if (existingPrimary) {
          throw new Error('Club already has a primary delegate');
        }
      }
    }
  }
});

export default User;