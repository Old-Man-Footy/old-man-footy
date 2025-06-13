/**
 * CarnivalSponsor Junction Table Model - SQLite/Sequelize Implementation
 * 
 * Manages the many-to-many relationship between carnivals and sponsors
 * for the Old Man Footy platform.
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * CarnivalSponsor junction model class extending Sequelize Model
 */
class CarnivalSponsor extends Model {
  /**
   * Get sponsor details for this relationship
   * @returns {Promise<Sponsor>} Sponsor instance
   */
  async getSponsorDetails() {
    const Sponsor = require('./Sponsor');
    return await Sponsor.findByPk(this.sponsorId);
  }

  /**
   * Get carnival details for this relationship
   * @returns {Promise<Carnival>} Carnival instance
   */
  async getCarnivalDetails() {
    const Carnival = require('./Carnival');
    return await Carnival.findByPk(this.carnivalId);
  }

  /**
   * Check if relationship is currently active
   * @returns {boolean} True if active, false otherwise
   */
  isActiveRelationship() {
    return this.isActive;
  }

  /**
   * Get all active carnival-sponsor relationships for a carnival
   * @param {number} carnivalId - The carnival ID
   * @returns {Promise<Array>} Array of active relationships
   */
  static async getActiveForCarnival(carnivalId) {
    return await this.findAll({
      where: {
        carnivalId: carnivalId,
        isActive: true
      },
      include: [
        {
          model: require('./Sponsor'),
          as: 'sponsor'
        }
      ],
      order: [['sponsorshipLevel', 'ASC'], ['createdAt', 'DESC']]
    });
  }

  /**
   * Get all active carnival-sponsor relationships for a sponsor
   * @param {number} sponsorId - The sponsor ID
   * @returns {Promise<Array>} Array of active relationships
   */
  static async getActiveForSponsor(sponsorId) {
    return await this.findAll({
      where: {
        sponsorId: sponsorId,
        isActive: true
      },
      include: [
        {
          model: require('./Carnival'),
          as: 'carnival'
        }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * Get sponsorship summary for a carnival
   * @param {number} carnivalId - The carnival ID
   * @returns {Promise<Object>} Sponsorship summary with totals
   */
  static async getSponsorshipSummary(carnivalId) {
    const relationships = await this.findAll({
      where: {
        carnivalId: carnivalId,
        isActive: true
      },
      include: [
        {
          model: require('./Sponsor'),
          as: 'sponsor'
        }
      ]
    });

    const summary = {
      totalSponsors: relationships.length,
      totalValue: 0,
      byLevel: {
        Gold: 0,
        Silver: 0,
        Bronze: 0,
        Supporting: 0,
        'In-Kind': 0
      }
    };

    relationships.forEach(rel => {
      if (rel.sponsorshipValue) {
        summary.totalValue += parseFloat(rel.sponsorshipValue);
      }
      summary.byLevel[rel.sponsorshipLevel]++;
    });

    return summary;
  }
}

/**
 * Initialize CarnivalSponsor model with schema definition
 */
CarnivalSponsor.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  carnivalId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'carnivals',
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
  packageDetails: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 1000]
    }
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  logoDisplaySize: {
    type: DataTypes.ENUM('Large', 'Medium', 'Small'),
    allowNull: false,
    defaultValue: 'Medium'
  },
  includeInProgram: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  includeOnWebsite: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
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
  modelName: 'CarnivalSponsor',
  tableName: 'carnival_sponsors',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['carnivalId', 'sponsorId']
    },
    {
      fields: ['carnivalId']
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
      fields: ['displayOrder']
    }
  ]
});

module.exports = CarnivalSponsor;