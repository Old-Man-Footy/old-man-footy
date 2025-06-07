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