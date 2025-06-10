/**
 * Carnival Model - SQLite/Sequelize Implementation
 * 
 * Manages Rugby League carnivals with comprehensive features including
 * MySideline integration, file management, and social media links.
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Carnival model class extending Sequelize Model
 */
class Carnival extends Model {
  /**
   * Check if registration is currently active
   * @returns {boolean} Registration status
   */
  get isRegistrationActive() {
    if (!this.isRegistrationOpen) return false;
    if (this.registrationDeadline && new Date() > this.registrationDeadline) return false;
    if (this.maxTeams && this.currentRegistrations >= this.maxTeams) return false;
    return true;
  }

  /**
   * Calculate days until carnival
   * @returns {number} Days until carnival (negative if past)
   */
  get daysUntilCarnival() {
    const today = new Date();
    const carnivalDate = new Date(this.date);
    const diffTime = carnivalDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Get carnival status based on date
   * @returns {string} Status: 'completed', 'today', 'upcoming', 'future'
   */
  get status() {
    const today = new Date();
    const carnivalDate = new Date(this.date);
    
    if (carnivalDate < today) return 'completed';
    if (carnivalDate.toDateString() === today.toDateString()) return 'today';
    if (this.daysUntilCarnival <= 7) return 'upcoming';
    return 'future';
  }

  /**
   * Check if this is a MySideline imported event
   * @returns {boolean} MySideline event status
   */
  get isMySidelineEvent() {
    return !!(this.mySidelineEventId && !this.isManuallyEntered);
  }

  /**
   * Check if user can edit this carnival
   * @param {Object} user - User object to check permissions
   * @returns {boolean} Edit permission status
   */
  canUserEdit(user) {
    if (!user) return false;
    
    // Admin users can edit any carnival
    if (user.isAdmin) return true;
    
    // Primary delegates can edit any carnival
    if (user.isPrimaryDelegate) return true;
    
    // Users can edit their own carnivals
    if (this.createdByUserId && this.createdByUserId === user.id) return true;
    
    // Allow any delegate from the hosting club to edit carnivals their club is hosting
    if (user.clubId && this.createdByUserId) {
      // We need to check if the carnival creator belongs to the same club as the current user
      // This requires a database lookup, so we'll need to handle this asynchronously
      return 'async_check_needed';
    }
    
    return false;
  }

  /**
   * Check if user can edit this carnival (async version for club delegate checking)
   * @param {Object} user - User object to check permissions
   * @returns {Promise<boolean>} Edit permission status
   */
  async canUserEditAsync(user) {
    if (!user) return false;
    
    // Admin users can edit any carnival
    if (user.isAdmin) return true;
    
    // Primary delegates can edit any carnival
    if (user.isPrimaryDelegate) return true;
    
    // Users can edit their own carnivals
    if (this.createdByUserId && this.createdByUserId === user.id) return true;
    
    // Allow any delegate from the hosting club to edit carnivals their club is hosting
    if (user.clubId && this.createdByUserId) {
      const User = require('./User');
      const carnivalCreator = await User.findByPk(this.createdByUserId, {
        attributes: ['clubId']
      });
      
      // If the carnival creator and current user belong to the same club, allow editing
      if (carnivalCreator && carnivalCreator.clubId === user.clubId) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get creator user information
   * @returns {Promise<User|null>} Creator user or null
   */
  async getCreator() {
    const User = require('./User');
    if (!this.createdByUserId) return null;
    return await User.findByPk(this.createdByUserId);
  }

  /**
   * Find upcoming carnivals
   * @returns {Promise<Array>} Array of upcoming carnivals
   */
  static async findUpcoming() {
    return await this.findAll({
      where: {
        isActive: true,
        date: {
          [require('sequelize').Op.gte]: new Date()
        }
      },
      order: [['date', 'ASC']]
    });
  }

  /**
   * Find carnivals by state
   * @param {string} state - Australian state code
   * @returns {Promise<Array>} Array of carnivals in specified state
   */
  static async findByState(state) {
    return await this.findAll({
      where: {
        isActive: true,
        state: state
      },
      order: [['date', 'ASC']]
    });
  }

  /**
   * Find MySideline imported events
   * @returns {Promise<Array>} Array of MySideline events
   */
  static async findMySidelineEvents() {
    return await this.findAll({
      where: {
        isActive: true,
        mySidelineEventId: {
          [require('sequelize').Op.ne]: null
        }
      },
      order: [['date', 'ASC']]
    });
  }
}

/**
 * Initialize Carnival model with comprehensive schema definition
 */
Carnival.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 200]
    },
    set(value) {
      this.setDataValue('title', value.trim());
    }
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: true,
      isAfter: '2020-01-01'
    }
  },
  locationAddress: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [5, 500]
    },
    set(value) {
      this.setDataValue('locationAddress', value.trim());
    }
  },
  organiserContactName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    },
    set(value) {
      this.setDataValue('organiserContactName', value.trim());
    }
  },
  organiserContactEmail: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
      notEmpty: true
    },
    set(value) {
      this.setDataValue('organiserContactEmail', value.toLowerCase().trim());
    }
  },
  organiserContactPhone: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [10, 20]
    },
    set(value) {
      this.setDataValue('organiserContactPhone', value.trim());
    }
  },
  scheduleDetails: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  registrationLink: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  feesDescription: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  callForVolunteers: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  clubLogoURL: {
    type: DataTypes.STRING,
    allowNull: true
  },
  promotionalImageURL: {
    type: DataTypes.STRING,
    allowNull: true
  },
  additionalImages: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  // Social Media Links
  socialMediaFacebook: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  socialMediaInstagram: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  socialMediaTwitter: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  socialMediaWebsite: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  // Enhanced Draw/Document Upload Support
  drawFiles: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  // Legacy draw fields for backward compatibility
  drawFileURL: {
    type: DataTypes.STRING,
    allowNull: true
  },
  drawFileName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  drawTitle: {
    type: DataTypes.STRING,
    allowNull: true
  },
  drawDescription: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdByUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  isManuallyEntered: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  // MySideline Integration Fields
  mySidelineEventId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  lastMySidelineSync: {
    type: DataTypes.DATE,
    allowNull: true
  },
  mySidelineSourceUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  state: {
    type: DataTypes.STRING(3),
    allowNull: false,
    validate: {
      isIn: [['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT']]
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  claimedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Enhanced fields for better carnival management
  maxTeams: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 1000
    }
  },
  currentRegistrations: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  ageCategories: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    validate: {
      isValidCategories(value) {
        if (!Array.isArray(value)) return;
        const validCategories = ['35+', '40+', '45+', '50+', '55+', '60+', 'Open'];
        const invalid = value.filter(cat => !validCategories.includes(cat));
        if (invalid.length > 0) {
          throw new Error(`Invalid age categories: ${invalid.join(', ')}`);
        }
      }
    }
  },
  isRegistrationOpen: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  registrationDeadline: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Weather and ground conditions
  weatherConditions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  groundConditions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Admin notes (only visible to carnival owner and primary delegates)
  adminNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Carnival',
  tableName: 'carnivals',
  timestamps: true,
  indexes: [
    {
      fields: ['date']
    },
    {
      fields: ['state']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['createdByUserId']
    },
    {
      fields: ['isManuallyEntered']
    }
  ],
  hooks: {
    /**
     * Pre-save validation and data consistency
     */
    beforeSave: async (carnival, options) => {
      // Ensure current registrations doesn't exceed max teams
      if (carnival.maxTeams && carnival.currentRegistrations > carnival.maxTeams) {
        carnival.currentRegistrations = carnival.maxTeams;
      }
      
      // If this is a MySideline event being manually managed, update the flag
      if (carnival.mySidelineEventId && carnival.changed('createdByUserId') && carnival.createdByUserId) {
        carnival.isManuallyEntered = true;
      }
    }
  }
});

module.exports = Carnival;