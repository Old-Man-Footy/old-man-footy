/**
 * Sponsor Model - SQLite/Sequelize Implementation
 * 
 * Manages sponsor information and associations with clubs
 * for the Old Man Footy platform.
 */

import { DataTypes, Model } from 'sequelize';
import { sequelize } from '/config/database.mjs';

/**
 * Sponsor model class extending Sequelize Model
 * @extends Model
 */
class Sponsor extends Model {
  /**
   * Get the club associated with this sponsor
   * @returns {Promise<Club>} The owning club
   */
  async getClub() {
    return await Club.findByPk(this.clubId);
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
  clubId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'clubs',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'The club that owns this sponsor',
    validate: {
      notNull: { msg: 'Sponsor must be linked to a club.' }
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
    },
    {
      fields: ['clubId']
    }
  ]
});

export default Sponsor;