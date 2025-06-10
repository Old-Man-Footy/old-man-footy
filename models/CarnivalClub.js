/**
 * CarnivalClub Junction Table Model - SQLite/Sequelize Implementation
 * 
 * Manages the many-to-many relationship between carnivals and clubs as attendees
 * for the Old Man Footy platform.
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * CarnivalClub junction model class extending Sequelize Model
 */
class CarnivalClub extends Model {
  /**
   * Get carnival details for this relationship
   * @returns {Promise<Carnival>} Carnival instance
   */
  async getCarnivalDetails() {
    const Carnival = require('./Carnival');
    return await Carnival.findByPk(this.carnivalId);
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
    return this.isActive;
  }

  /**
   * Get all active carnival-club relationships for a carnival
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
          model: require('./Club'),
          as: 'club'
        }
      ],
      order: [['registrationDate', 'ASC']]
    });
  }

  /**
   * Get all active carnival-club relationships for a club
   * @param {number} clubId - The club ID
   * @returns {Promise<Array>} Array of active relationships
   */
  static async getActiveForClub(clubId) {
    return await this.findAll({
      where: {
        clubId: clubId,
        isActive: true
      },
      include: [
        {
          model: require('./Carnival'),
          as: 'carnival'
        }
      ],
      order: [['registrationDate', 'DESC']]
    });
  }

  /**
   * Check if a club is already registered for a carnival
   * @param {number} carnivalId - The carnival ID
   * @param {number} clubId - The club ID
   * @returns {Promise<boolean>} True if already registered, false otherwise
   */
  static async isClubRegistered(carnivalId, clubId) {
    const existing = await this.findOne({
      where: {
        carnivalId,
        clubId,
        isActive: true
      }
    });
    return !!existing;
  }

  /**
   * Get attendance count for a carnival
   * @param {number} carnivalId - The carnival ID
   * @returns {Promise<number>} Number of clubs attending
   */
  static async getAttendanceCount(carnivalId) {
    return await this.count({
      where: {
        carnivalId,
        isActive: true
      }
    });
  }
}

/**
 * Initialize CarnivalClub model with schema definition
 */
CarnivalClub.init({
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
  registrationDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  playerCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  teamName: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 100]
    },
    set(value) {
      this.setDataValue('teamName', value ? value.trim() : null);
    }
  },
  contactPerson: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 100]
    },
    set(value) {
      this.setDataValue('contactPerson', value ? value.trim() : null);
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
  specialRequirements: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 500]
    }
  },
  registrationNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 1000]
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  isPaid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  paymentAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  paymentDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 999,
    validate: {
      min: 0
    }
  }
}, {
  sequelize,
  modelName: 'CarnivalClub',
  tableName: 'carnival_clubs',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['carnivalId', 'clubId']
    },
    {
      fields: ['carnivalId']
    },
    {
      fields: ['clubId']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['registrationDate']
    },
    {
      fields: ['isPaid']
    }
  ]
});

module.exports = CarnivalClub;