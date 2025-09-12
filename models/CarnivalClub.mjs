/**
 * CarnivalClub Junction Table Model - SQLite/Sequelize Implementation
 * 
 * Manages the many-to-many relationship between carnivals and clubs as attendees
 * for the Old Man Footy platform.
 */

import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.mjs';
import { APPROVAL_STATUS_ARRAY } from '../config/constants.mjs';
import Carnival from './Carnival.mjs';
import Club from './Club.mjs';

/**
 * CarnivalClub junction model class extending Sequelize Model
 */
class CarnivalClub extends Model {
  /**
   * Get carnival details for this relationship
   * @returns {Promise<Carnival>} Carnival instance
   */
  async getCarnivalDetails() {
    
    return await Carnival.findByPk(this.carnivalId);
  }

  /**
   * Get club details for this relationship
   * @returns {Promise<Club>} Club instance
   */
  async getClubDetails() {
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
          model: Club,
          as: 'participatingClub'
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
          model: Carnival,
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
        isActive: true,
        approvalStatus: 'approved'
      }
    });
  }

  /**
   * Get attendance count for a carnival (including pending)
   * @param {number} carnivalId - The carnival ID
   * @returns {Promise<Object>} Object with approved and pending counts
   */
  static async getAttendanceCountWithStatus(carnivalId) {
    const approved = await this.count({
      where: {
        carnivalId,
        isActive: true,
        approvalStatus: 'approved'
      }
    });

    const pending = await this.count({
      where: {
        carnivalId,
        isActive: true,
        approvalStatus: 'pending'
      }
    });

    return { approved, pending, total: approved + pending };
  }

  /**
   * Check if registration is approved
   * @returns {boolean} True if approved, false otherwise
   */
  isApproved() {
    return this.approvalStatus === 'approved';
  }

  /**
   * Check if registration is pending approval
   * @returns {boolean} True if pending, false otherwise
   */
  isPending() {
    return this.approvalStatus === 'pending';
  }

  /**
   * Check if registration is rejected
   * @returns {boolean} True if rejected, false otherwise
   */
  isRejected() {
    return this.approvalStatus === 'rejected';
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
    allowNull: true
  },
  numberOfTeams: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1,
      max: 10
    },
    comment: 'Number of teams the club wants to register for this carnival'
  },
  teamName: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      this.setDataValue('teamName', value ? value.trim() : value);
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
  specialRequirements: {
    type: DataTypes.TEXT,
    allowNull: true,
    set(value) {
      this.setDataValue('specialRequirements', value ? value.trim() : value);
    }
  },
  registrationNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    set(value) {
      this.setDataValue('registrationNotes', value ? value.trim() : value);
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
    allowNull: true
  },
  paymentDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 999
  },
  approvalStatus: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pending',
    validate: {
      isIn: [APPROVAL_STATUS_ARRAY]
    }
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  approvedByUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  rejectionReason: {
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
    },
    {
      fields: ['approvalStatus']
    }
  ],
  hooks: {
    /**
     * Update carnival currentRegistrations after creating a new registration
     */
    afterCreate: async (carnivalClub, options) => {
      await updateCarnivalRegistrationCount(carnivalClub.carnivalId);
    },

    /**
     * Update carnival currentRegistrations after updating a registration
     */
    afterUpdate: async (carnivalClub, options) => {
      // Only update if approval status or isActive changed
      if (carnivalClub.changed('approvalStatus') || carnivalClub.changed('isActive')) {
        await updateCarnivalRegistrationCount(carnivalClub.carnivalId);
      }
    },

    /**
     * Update carnival currentRegistrations after destroying a registration
     */
    afterDestroy: async (carnivalClub, options) => {
      await updateCarnivalRegistrationCount(carnivalClub.carnivalId);
    }
  }
});

/**
 * Updates the registration count for a carnival after a CarnivalClub is created or destroyed.
 * Uses dynamic import for ES module compatibility.
 * @param {number} carnivalId - The ID of the carnival to update.
 * @returns {Promise<void>}
 */
export async function updateCarnivalRegistrationCount(carnivalId) {
  try {
    const { default: Carnival } = await import('./Carnival.mjs');
    const CarnivalClub = (await import('./CarnivalClub.mjs')).default;
    const approvedCount = await CarnivalClub.count({
      where: {
        carnivalId,
        isActive: true,
        approvalStatus: 'approved',
      },
    });
    await Carnival.update(
      { currentRegistrations: approvedCount },
      { where: { id: carnivalId } }
    );
  } catch (err) {
    console.error(`Error updating carnival ${carnivalId} registration count:`, err);
  }
}

export default CarnivalClub;