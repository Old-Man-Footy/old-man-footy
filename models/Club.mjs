/**
 * Club Model - SQLite/Sequelize Implementation
 * 
 * Manages rugby league club information and associations
 * for the Old Man Footy platform.
 */

import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.mjs';

/**
 * Club model class extending Sequelize Model
 */
class Club extends Model {
  /**
   * Get all active delegates for this club
   * @returns {Promise<Array>} Array of user delegates
   */
  async getDelegates() {
    const User = require('./User');
    return await User.findAll({
      where: {
        clubId: this.id,
        isActive: true
      },
      order: [['isPrimaryDelegate', 'DESC'], ['firstName', 'ASC']]
    });
  }

  /**
   * Get primary delegate for this club
   * @returns {Promise<User|null>} Primary delegate user or null
   */
  async getPrimaryDelegate() {
    const User = require('./User');
    return await User.findOne({
      where: {
        clubId: this.id,
        isPrimaryDelegate: true,
        isActive: true
      }
    });
  }

  /**
   * Get club's carnival count (unique combination of hosted and attended carnivals)
   * @returns {Promise<number>} Number of unique active carnivals
   */
  async getCarnivalCount() {
    const Carnival = require('./Carnival');
    const CarnivalClub = require('./CarnivalClub');
    const { Op } = require('sequelize');

    // Get carnivals hosted by this club's delegates
    const delegateIds = await this.getDelegateIds();
    const hostedCarnivalIds = await Carnival.findAll({
      where: {
        createdByUserId: { [Op.in]: delegateIds },
        isActive: true
      },
      attributes: ['id']
    }).then(carnivals => carnivals.map(c => c.id));

    // Get carnivals this club is attending
    const attendingCarnivalIds = await CarnivalClub.findAll({
      where: {
        clubId: this.id,
        isActive: true
      },
      include: [{
        model: Carnival,
        as: 'carnival',
        where: { isActive: true },
        attributes: ['id']
      }],
      attributes: []
    }).then(carnivalClubs => carnivalClubs.map(cc => cc.carnival.id));

    // Combine and get unique carnival IDs
    const uniqueCarnivalIds = [...new Set([...hostedCarnivalIds, ...attendingCarnivalIds])];
    
    return uniqueCarnivalIds.length;
  }

  /**
   * Get array of delegate IDs for this club
   * @returns {Promise<Array<number>>} Array of user IDs
   */
  async getDelegateIds() {
    const delegates = await this.getDelegates();
    return delegates.map(delegate => delegate.id);
  }

  /**
   * Check if this club is unclaimed (created on behalf of others)
   * @returns {boolean} True if club has no delegates and was created by proxy
   */
  async isUnclaimed() {
    if (!this.createdByProxy) return false;
    
    const delegates = await this.getDelegates();
    return delegates.length === 0;
  }

  /**
   * Get the user who created this club on behalf of others
   * @returns {Promise<User|null>} The proxy creator user or null
   */
  async getProxyCreator() {
    if (!this.createdByUserId) return null;
    
    const User = require('./User');
    return await User.findByPk(this.createdByUserId);
  }

  /**
   * Check if a user can claim ownership of this club
   * @param {User} user - The user attempting to claim
   * @returns {boolean} True if user can claim this club
   */
  async canUserClaim(user) {
    if (!user || !user.email) return false;
    
    // Club must be unclaimed and have a pending invite email
    const isUnclaimed = await this.isUnclaimed();
    if (!isUnclaimed || !this.inviteEmail) return false;
    
    // User's email must match the invite email
    return user.email.toLowerCase() === this.inviteEmail.toLowerCase();
  }
}

/**
 * Initialize Club model with schema definition
 */
Club.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  clubName: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    set(value) {
      this.setDataValue('clubName', value ? value.trim() : value);
    }
  },
  state: {
    type: DataTypes.STRING(3),
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      this.setDataValue('location', value ? value.trim() : value);
    }
  },
  contactEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      this.setDataValue('contactEmail', value ? value.toLowerCase().trim() : value);
    }
  },
  contactPhone: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      this.setDataValue('contactPhone', value ? value.trim() : value);
    }
  },
  contactPerson: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      this.setDataValue('contactPerson', value ? value.trim() : value);
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    set(value) {
      this.setDataValue('description', value ? value.trim() : value);
    }
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      this.setDataValue('website', value && value.trim() ? value.trim() : null);
    }
  },
  facebookUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      this.setDataValue('facebookUrl', value && value.trim() ? value.trim() : null);
    }
  },
  instagramUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      this.setDataValue('instagramUrl', value && value.trim() ? value.trim() : null);
    }
  },
  twitterUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      this.setDataValue('twitterUrl', value && value.trim() ? value.trim() : null);
    }
  },
  logoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      this.setDataValue('logoUrl', value && value.trim() ? value.trim() : null);
    }
  },
  isPubliclyListed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  createdByProxy: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  inviteEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      this.setDataValue('inviteEmail', value ? value.toLowerCase().trim() : value);
    }
  },
  createdByUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
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
  modelName: 'Club',
  tableName: 'clubs',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['clubName']
    },
    {
      fields: ['state']
    },
    {
      fields: ['isActive']
    }
  ]
});

export default Club;