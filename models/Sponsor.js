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
    unique: true,
    validate: {
      notEmpty: true,
      len: [2, 100]
    },
    set(value) {
      this.setDataValue('sponsorName', value.trim());
    }
  },
  businessType: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 50]
    }
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 100]
    }
  },
  state: {
    type: DataTypes.STRING(3),
    allowNull: true,
    validate: {
      isIn: [['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT']]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 1000]
    }
  },
  contactPerson: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 100]
    }
  },
  contactEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true,
      len: [0, 100]
    }
  },
  contactPhone: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 20]
    }
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true,
      len: [0, 200]
    }
  },
  facebookUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 200]
    }
  },
  instagramUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 200]
    }
  },
  twitterUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 200]
    }
  },
  linkedinUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 200]
    }
  },
  logoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 200]
    }
  },
  sponsorshipLevel: {
    type: DataTypes.ENUM('Gold', 'Silver', 'Bronze', 'Supporting', 'In-Kind'),
    allowNull: true,
    defaultValue: 'Supporting'
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
      fields: ['sponsorshipLevel']
    }
  ]
});

module.exports = Sponsor;