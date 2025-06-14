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
    return !this.isManuallyEntered;
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
   * Obfuscate sensitive contact information for inactive carnivals
   * @returns {Object} Carnival data with obfuscated contact details if inactive
   */
  getPublicDisplayData() {
    const carnivalData = this.toJSON();
    
    // If carnival is active, return full data
    if (this.isActive) {
      return carnivalData;
    }
    
    // For inactive carnivals, obfuscate contact details
    return {
      ...carnivalData,
      organiserContactEmail: this.obfuscateEmail(carnivalData.organiserContactEmail),
      organiserContactPhone: this.obfuscatePhone(carnivalData.organiserContactPhone),
      registrationLink: null, // Remove registration link entirely
      socialMediaFacebook: null,
      socialMediaInstagram: null,
      socialMediaTwitter: null,
      socialMediaWebsite: null,
      // Keep other information visible for historical purposes
      isRegistrationDisabled: !this.isActive
    };
  }

  /**
   * Obfuscate email address for display
   * @param {string} email - Email to obfuscate
   * @returns {string} Obfuscated email or placeholder
   */
  obfuscateEmail(email) {
    if (!email) return 'Contact details not available';
    
    const [localPart, domain] = email.split('@');
    if (!domain) return 'Contact details not available';
    
    // Show first 2 characters and last character of local part
    const obfuscatedLocal = localPart.length > 3 
      ? `${localPart.substring(0, 2)}***${localPart.slice(-1)}`
      : '***';
    
    // Show first character and last part of domain
    const domainParts = domain.split('.');
    const obfuscatedDomain = domainParts.length > 1
      ? `${domainParts[0].charAt(0)}***.${domainParts[domainParts.length - 1]}`
      : '***';
    
    return `${obfuscatedLocal}@${obfuscatedDomain}`;
  }

  /**
   * Obfuscate phone number for display
   * @param {string} phone - Phone number to obfuscate
   * @returns {string} Obfuscated phone or placeholder
   */
  obfuscatePhone(phone) {
    if (!phone) return 'Contact details not available';
    
    // Remove all non-digit characters for processing
    const digitsOnly = phone.replace(/\D/g, '');
    
    if (digitsOnly.length < 6) {
      return 'Contact details not available';
    }
    
    // Show first 2 and last 2 digits
    const visible = `${digitsOnly.substring(0, 2)}***${digitsOnly.slice(-2)}`;
    return visible;
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
        isManuallyEntered: false
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
    set(value) {
      this.setDataValue('title', value ? value.trim() : value);
    }
  },
  mySidelineTitle: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Original MySideline title for matching purposes - never changes once set'
  },
  date: {
    type: DataTypes.DATE,
    allowNull: true, // Allow null for MySideline imports
  },
  locationAddress: {
    type: DataTypes.TEXT,
    allowNull: true, // Allow null for MySideline imports
    set(value) {
      this.setDataValue('locationAddress', value ? value.trim() : value);
    }
  },
  locationAddressPart1: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      this.setDataValue('locationAddressPart1', value ? value.trim() : value);
    }
  },
  locationAddressPart2: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      this.setDataValue('locationAddressPart2', value ? value.trim() : value);
    }
  },
  locationAddressPart3: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      this.setDataValue('locationAddressPart3', value ? value.trim() : value);
    }
  },
  locationAddressPart4: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      this.setDataValue('locationAddressPart4', value ? value.trim() : value);
    }
  },
  organiserContactName: {
    type: DataTypes.STRING,
    allowNull: true, // Allow null for MySideline imports
    set(value) {
      this.setDataValue('organiserContactName', value ? value.trim() : value);
    }
  },
  organiserContactEmail: {
    type: DataTypes.STRING,
    allowNull: true, // Allow null for MySideline imports
    set(value) {
      this.setDataValue('organiserContactEmail', value ? value.toLowerCase().trim() : value);
    }
  },
  organiserContactPhone: {
    type: DataTypes.STRING,
    allowNull: true, // Allow null for MySideline imports
    set(value) {
      this.setDataValue('organiserContactPhone', value ? value.trim() : value);
    }
  },
  scheduleDetails: {
    type: DataTypes.TEXT,
    allowNull: true, // Allow null for MySideline imports    
  },
  registrationLink: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      // Convert empty strings to null for cleaner data storage
      this.setDataValue('registrationLink', value && value.trim() ? value.trim() : null);
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
    set(value) {
      // Convert empty strings to null for cleaner data storage
      this.setDataValue('socialMediaFacebook', value && value.trim() ? value.trim() : null);
    }
  },
  socialMediaInstagram: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      // Convert empty strings to null for cleaner data storage
      this.setDataValue('socialMediaInstagram', value && value.trim() ? value.trim() : null);
    }
  },
  socialMediaTwitter: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      // Convert empty strings to null for cleaner data storage
      this.setDataValue('socialMediaTwitter', value && value.trim() ? value.trim() : null);
    }
  },
  socialMediaWebsite: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      // Convert empty strings to null for cleaner data storage
      this.setDataValue('socialMediaWebsite', value && value.trim() ? value.trim() : null);
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
  lastMySidelineSync: {
    type: DataTypes.DATE,
    allowNull: true
  },
  state: {
    type: DataTypes.STRING(3),
    allowNull: true // Allow null for MySideline imports
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
    allowNull: true
  },
  currentRegistrations: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
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
  // Admin notes (only visible to carnival owner and primary delegates)
  adminNotes: {
    type: DataTypes.TEXT,
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
      
    }
  }
});

module.exports = Carnival;