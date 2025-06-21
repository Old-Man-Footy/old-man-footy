/**
 * ClubSponsor Junction Table Model - SQLite/Sequelize Implementation
 * 
 * Manages the many-to-many relationship between clubs and sponsors
 * for the Old Man Footy platform.
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * ClubSponsor junction model class extending Sequelize Model
 */
class ClubSponsor extends Model {
  /**
   * Get sponsor details for this relationship
   * @returns {Promise<Sponsor>} Sponsor instance
   */
  async getSponsorDetails() {
    const Sponsor = require('./Sponsor');
    return await Sponsor.findByPk(this.sponsorId);
  }

  /**
   * Get club details for this relationship
   * @returns {Promise<Club>} Club instance
   */
  async getClubDetails() {
    const Club = require('./Club');
    return await Club.findByPk(this.clubId);
  }

  /**
   * Check if relationship is currently active
   * @returns {boolean} True if active, false otherwise
   */
  isActiveRelationship() {
    return this.isActive && 
           (!this.endDate || new Date(this.endDate) > new Date());
  }

  /**
   * Get all active club-sponsor relationships for a club
   * @param {number} clubId - The club ID
   * @returns {Promise<Array>} Array of active relationships
   */
  static async getActiveForClub(clubId) {
    const relationships = await this.findAll({
      where: {
        clubId: clubId,
        isActive: true,
        endDate: {
          [require('sequelize').Op.or]: [
            null,
            { [require('sequelize').Op.gt]: new Date() }
          ]
        }
      },
      include: [
        {
          model: require('./Sponsor'),
          as: 'sponsor'
        }
      ]
    });

    // Define sponsorship level hierarchy for proper sorting
    const levelHierarchy = {
      'Gold': 1,
      'Silver': 2,
      'Bronze': 3,
      'Supporting': 4,
      'In-Kind': 5
    };

    // Sort by hierarchy, then display order, then start date
    return relationships.sort((a, b) => {
      const levelA = levelHierarchy[a.sponsorshipLevel] || 999;
      const levelB = levelHierarchy[b.sponsorshipLevel] || 999;
      
      if (levelA !== levelB) {
        return levelA - levelB;
      }
      
      // Within same level, sort by display order
      const orderA = a.displayOrder || 999;
      const orderB = b.displayOrder || 999;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // Finally, sort by start date (newest first)
      return new Date(b.startDate) - new Date(a.startDate);
    });
  }

  /**
   * Get all active club-sponsor relationships for a sponsor
   * @param {number} sponsorId - The sponsor ID
   * @returns {Promise<Array>} Array of active relationships
   */
  static async getActiveForSponsor(sponsorId) {
    return await this.findAll({
      where: {
        sponsorId: sponsorId,
        isActive: true,
        endDate: {
          [require('sequelize').Op.or]: [
            null,
            { [require('sequelize').Op.gt]: new Date() }
          ]
        }
      },
      include: [
        {
          model: require('./Club'),
          as: 'club'
        }
      ],
      order: [['startDate', 'DESC']]
    });
  }
}

/**
 * Initialize ClubSponsor model with schema definition
 */
ClubSponsor.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  clubId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'clubs',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  sponsorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'sponsors',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  sponsorshipLevel: {
    type: DataTypes.ENUM('Gold', 'Silver', 'Bronze', 'Supporting', 'In-Kind'),
    allowNull: false,
    defaultValue: 'Supporting'
  },
  sponsorshipValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    validate: {
      isAfterStartDate(value) {
        if (value && this.startDate && new Date(value) <= new Date(this.startDate)) {
          throw new Error('End date must be after start date');
        }
      }
    }
  },
  contractDetails: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 500]
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 1000]
    }
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 999,
    validate: {
      min: 0
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
  modelName: 'ClubSponsor',
  tableName: 'club_sponsors',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['clubId', 'sponsorId', 'startDate']
    },
    {
      fields: ['clubId']
    },
    {
      fields: ['sponsorId']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['sponsorshipLevel']
    },
    {
      fields: ['startDate']
    },
    {
      fields: ['endDate']
    }
  ]
});

module.exports = ClubSponsor;