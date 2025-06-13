/**
 * Club Model - SQLite/Sequelize Implementation
 * 
 * Manages Rugby League club information and associations
 * for the Old Man Footy platform.
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

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
   * Get club's carnival count
   * @returns {Promise<number>} Number of active carnivals
   */
  async getCarnivalCount() {
    const Carnival = require('./Carnival');
    return await Carnival.count({
      where: {
        createdByUserId: {
          [require('sequelize').Op.in]: await this.getDelegateIds()
        },
        isActive: true
      }
    });
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
    validate: {
      notEmpty: true,
      len: [2, 100]
    },
    set(value) {
      this.setDataValue('clubName', value.trim());
    }
  },
  state: {
    type: DataTypes.STRING(3),
    allowNull: true,
    validate: {
      isIn: [['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT']]
    }
  },
  location: {
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
  contactPerson: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 100]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 1000]
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
  logoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 200]
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
    validate: {
      isEmail: true,
      len: [0, 100]
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

module.exports = Club;