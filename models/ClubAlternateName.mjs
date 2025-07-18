/**
 * ClubAlternateName Model - SQLite/Sequelize Implementation
 * 
 * Manages alternate/search names for Rugby League clubs
 * for enhanced search functionality on the Old Man Footy platform.
 */

import { DataTypes, Model, Op } from 'sequelize';
import { sequelize } from '/config/database.mjs';
import Club from './Club.mjs';

/**
 * ClubAlternateName model class extending Sequelize Model
 */
class ClubAlternateName extends Model {
  /**
   * Get the club associated with this alternate name
   * @returns {Promise<Club>} Associated club
   */
  async getClub() {
    return await Club.findByPk(this.clubId);
  }

  /**
   * Check if alternate name is unique for the club
   * @param {string} alternateName - The alternate name to check
   * @param {number} clubId - The club ID
   * @param {number} excludeId - ID to exclude from check (for updates)
   * @returns {Promise<boolean>} True if unique, false otherwise
   */
  static async isUniqueForClub(alternateName, clubId, excludeId = null) {
    // Normalize input for comparison
    const normalizedName = alternateName.trim().toLowerCase();
    const whereClause = {
      alternateName: normalizedName,
      clubId
    };

    if (excludeId) {
      whereClause.id = { [Op.ne]: excludeId };
    }

    // Ensure alternateName is normalized in DB query
    const existing = await this.findOne({
      where: whereClause
    });
    return !existing;
  }

  /**
   * Get all alternate names for a specific club
   * @param {number} clubId - The club ID
   * @returns {Promise<Array>} Array of alternate names
   */
  static async getByClubId(clubId) {
    return await this.findAll({
      where: { clubId },
      order: [['alternateName', 'ASC']]
    });
  }

  /**
   * Search clubs by alternate names
   * @param {string} searchTerm - The search term
   * @returns {Promise<Array>} Array of club IDs that match
   */
  static async searchClubsByAlternateName(searchTerm) {
    const results = await this.findAll({
      where: {
        alternateName: {
          [Op.like]: `%${searchTerm.trim().toLowerCase()}%`
        }
      },
      attributes: ['clubId'],
      group: ['clubId']
    });

    return results.map(result => result.clubId);
  }
}

/**
 * Initialize ClubAlternateName model with schema definition
 */
ClubAlternateName.init({
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
  alternateName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    },
    set(value) {
      this.setDataValue('alternateName', value.trim().toLowerCase());
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
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
  modelName: 'ClubAlternateName',
  tableName: 'club_alternate_names',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['clubId', 'alternateName']
    },
    {
      fields: ['alternateName']
    },
    {
      fields: ['clubId']
    },
    {
      fields: ['isActive']
    }
  ]
});

export default ClubAlternateName;