/**
 * Sponsor Model - SQLite/Sequelize Implementation
 * 
 * Manages sponsor information and associations with clubs
 * for the Old Man Footy platform.
 */

import { DataTypes, Model, Op } from 'sequelize';
import { sequelize } from '../config/database.mjs';
import Club from './Club.mjs';
import Carnival from './Carnival.mjs';

/**
 * Sponsor model class extending Sequelize Model
 * @extends Model
 */
class Sponsor extends Model {
  /**
   * Get the club associated with this sponsor
   * @returns {Promise<Club|null>} The owning club or null if carnival-owned
   */
  async getClub() {
    return this.clubId ? await Club.findByPk(this.clubId) : null;
  }

  /**
   * Get the carnival associated with this sponsor
   * @returns {Promise<Carnival|null>} The owning carnival or null if club-owned
   */
  async getCarnival() {
    return this.carnivalId ? await Carnival.findByPk(this.carnivalId) : null;
  }

  /**
   * Get the owner (club or carnival) of this sponsor
   * @returns {Promise<Club|Carnival|null>} The owning entity
   */
  async getOwner() {
    if (this.clubId) {
      return await this.getClub();
    }
    if (this.carnivalId) {
      return await this.getCarnival();
    }
    return null;
  }

  /**
   * Check if this sponsor is associated with a specific club
   * @param {number} clubId - The club ID to check association with
   * @returns {boolean} True if the sponsor is associated with the club
   */
  isAssociatedWithClub(clubId) {
    return this.clubId === clubId;
  }

  /**
   * Check if this sponsor is associated with a specific carnival
   * @param {number} carnivalId - The carnival ID to check association with
   * @returns {boolean} True if the sponsor is associated with the carnival
   */
  isAssociatedWithCarnival(carnivalId) {
    return this.carnivalId === carnivalId;
  }

  /**
   * Check if this sponsor is owned by a club
   * @returns {boolean} True if this is a club sponsor
   */
  isClubSponsor() {
    return !!this.clubId;
  }

  /**
   * Check if this sponsor is owned by a carnival
   * @returns {boolean} True if this is a carnival sponsor
   */
  isCarnivalSponsor() {
    return !!this.carnivalId;
  }

  /**
   * Check if a user can edit this sponsor
   * @param {User} user - The user to check permissions for
   * @returns {boolean} True if user can edit this sponsor
   */
  canUserEdit(user) {
    if (!user) return false;
    
    // Admins have universal edit permissions
    if (user.isAdmin) return true;
    
    // Club delegates can edit sponsors associated with their club
    if (this.clubId && this.clubId === user.clubId) return true;
    
    // TODO: Add carnival delegate permissions when carnival delegate system is implemented
    // For now, only admins can edit carnival sponsors
    if (this.carnivalId) return false;
    
    return false;
  }

  /**
   * Create a copy of this sponsor for a different owner
   * @param {Object} options - Copy options
   * @param {number} options.clubId - Target club ID (mutually exclusive with carnivalId)
   * @param {number} options.carnivalId - Target carnival ID (mutually exclusive with clubId)
   * @returns {Promise<Sponsor>} The copied sponsor
   */
  async createCopy({ clubId = null, carnivalId = null } = {}) {
    // Validate mutually exclusive ownership
    if (clubId && carnivalId) {
      throw new Error('Sponsor cannot be owned by both club and carnival');
    }
    if (!clubId && !carnivalId) {
      throw new Error('Sponsor must be owned by either a club or carnival');
    }

    // Create copy with all the same data but new ownership
    const sponsorData = {
      sponsorName: this.sponsorName,
      businessType: this.businessType,
      location: this.location,
      state: this.state,
      description: this.description,
      contactPerson: this.contactPerson,
      contactEmail: this.contactEmail,
      contactPhone: this.contactPhone,
      website: this.website,
      facebookUrl: this.facebookUrl,
      instagramUrl: this.instagramUrl,
      twitterUrl: this.twitterUrl,
      linkedinUrl: this.linkedinUrl,
      logoUrl: this.logoUrl,
      isActive: this.isActive,
      isPubliclyVisible: this.isPubliclyVisible,
      sponsorshipLevel: this.sponsorshipLevel,
      displayOrder: this.displayOrder,
      clubId: this.clubId ? clubId : null,
      carnivalId: this.carnivalId ? carnivalId : null
    };

    return await Sponsor.create(sponsorData);
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
    allowNull: true,
    references: {
      model: 'clubs',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'The club that owns this sponsor'
  },
  carnivalId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'carnivals',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'The carnival that owns this sponsor (mutually exclusive with clubId)'
  },
  sponsorshipLevel: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'Supporting',
    validate: {
      isIn: [['Gold', 'Silver', 'Bronze', 'Supporting', 'In-Kind']]
    },
    comment: 'Sponsorship level (Gold, Silver, Bronze, Supporting, In-Kind)'
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    comment: 'Display order for sponsor listing (lower numbers first)'
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
  validate: {
    mutuallyExclusiveOwnership() {
      // Ensure a sponsor can only be owned by either a club OR a carnival, not both
      if (this.clubId && this.carnivalId) {
        throw new Error('A sponsor cannot be owned by both a club and a carnival');
      }
      // Ensure a sponsor is owned by either a club or a carnival (not neither)
      if (!this.clubId && !this.carnivalId) {
        throw new Error('A sponsor must be owned by either a club or a carnival');
      }
    }
  },
  indexes: [
    {
      unique: true,
      fields: ['sponsorName', 'clubId', 'state', 'location'],
      name: 'sponsors_club_composite_unique',
      where: {
        clubId: { [Op.ne]: null }
      }
    },
    {
      unique: true,
      fields: ['sponsorName', 'carnivalId', 'state', 'location'],
      name: 'sponsors_carnival_composite_unique',
      where: {
        carnivalId: { [Op.ne]: null }
      }
    },
    {
      fields: ['state']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['clubId']
    },
    {
      fields: ['carnivalId']
    },
    {
      fields: ['sponsorshipLevel']
    }
  ]
});

export default Sponsor;