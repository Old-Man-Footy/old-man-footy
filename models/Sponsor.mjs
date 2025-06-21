/**
 * Sponsor Model - SQLite/Sequelize Implementation
 * 
 * Manages sponsor information and associations with clubs
 * for the Old Man Footy platform.
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Sponsor model class extending Sequelize Model
 */
class Sponsor extends Model {
  /**
   * Get all clubs associated with this sponsor
   * @returns {Promise<Array>} Array of associated clubs
   */
  async getAssociatedClubs() {
    const Club = require('./Club');
    return await this.getClubs({
      where: { isActive: true },
      order: [['clubName', 'ASC']]
    });
  }

  /**
   * Get count of associated clubs
   * @returns {Promise<number>} Number of associated clubs
   */
  async getClubCount() {
    return await this.countClubs({
      where: { isActive: true }
    });
  }

  /**
   * Check if sponsor is associated with a specific club
   * @param {number} clubId - The club ID to check
   * @returns {Promise<boolean>} True if associated, false otherwise
   */
  async isAssociatedWithClub(clubId) {
    const count = await this.countClubs({
      where: { 
        id: clubId,
        isActive: true 
      }
    });
    return count > 0;
  }
}

/**
 * Initialize Sponsor model with schema definition
 */
Sponsor.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  sponsorName: {
    type: DataTypes.STRING,
    allowNull: false,
    set(value) {
      this.setDataValue('sponsorName', value ? value.trim() : value);
    }
  },
  businessType: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      this.setDataValue('businessType', value ? value.trim() : value);
    }
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      this.setDataValue('location', value ? value.trim() : value);
    }
  },
  state: {
    type: DataTypes.STRING(3),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    set(value) {
      this.setDataValue('description', value ? value.trim() : value);
    }
  },
  contactPerson: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      this.setDataValue('contactPerson', value ? value.trim() : value);
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
  linkedinUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      this.setDataValue('linkedinUrl', value && value.trim() ? value.trim() : null);
    }
  },
  logoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      this.setDataValue('logoUrl', value && value.trim() ? value.trim() : null);
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  isPubliclyVisible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
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
  modelName: 'Sponsor',
  tableName: 'sponsors',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['sponsorName']
    },
    {
      fields: ['state']
    },
    {
      fields: ['isActive']
    }
  ]
});

module.exports = Sponsor;