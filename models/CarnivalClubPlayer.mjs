/**
 * CarnivalClubPlayer Junction Table Model - SQLite/Sequelize Implementation
 * 
 * Manages the relationship between club players and carnival attendance records,
 * allowing tracking of which specific players from each club will attend carnivals.
 */

import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.mjs';
import { ATTENDANCE_STATUS_ARRAY } from '../config/constants.mjs';
import CarnivalClub from './CarnivalClub.mjs';
import ClubPlayer from './ClubPlayer.mjs';
import Carnival from './Carnival.mjs';

/**
 * CarnivalClubPlayer junction model class extending Sequelize Model
 */
class CarnivalClubPlayer extends Model {
  /**
   * Get carnival club registration details for this player assignment
   * @returns {Promise<CarnivalClub>} CarnivalClub instance
   */
  async getCarnivalClubDetails() {    
    return await CarnivalClub.findByPk(this.carnivalClubId);
  }

  /**
   * Get club player details for this assignment
   * @returns {Promise<ClubPlayer>} ClubPlayer instance
   */
  async getClubPlayerDetails() {
    return await ClubPlayer.findByPk(this.clubPlayerId);
  }

  /**
   * Check if player assignment is currently active
   * @returns {boolean} True if active, false otherwise
   */
  isActiveAssignment() {
    return this.isActive;
  }

  /**
   * Get all active player assignments for a carnival club registration
   * @param {number} carnivalClubId - The carnival club registration ID
   * @returns {Promise<Array>} Array of active player assignments
   */
  static async getActiveForCarnivalClub(carnivalClubId) {
    return await this.findAll({
      where: {
        carnivalClubId: carnivalClubId,
        isActive: true
      },
      include: [
        {
          model: ClubPlayer,
          as: 'clubPlayer',
          where: { isActive: true },
          required: true
        }
      ],
      order: [['clubPlayer', 'firstName', 'ASC'], ['clubPlayer', 'lastName', 'ASC']]
    });
  }

  /**
   * Get all carnival assignments for a specific club player
   * @param {number} clubPlayerId - The club player ID
   * @returns {Promise<Array>} Array of carnival assignments
   */
  static async getActiveForClubPlayer(clubPlayerId) {
    return await this.findAll({
      where: {
        clubPlayerId: clubPlayerId,
        isActive: true
      },
      include: [
        {
          model: CarnivalClub,
          as: 'carnivalClub',
          include: [
            {
              model: Carnival,
              as: 'carnival',
              where: { isActive: true }
            }
          ]
        }
      ],
      order: [['carnivalClub', 'carnival', 'date', 'ASC']]
    });
  }

  /**
   * Get player count for a carnival club registration
   * @param {number} carnivalClubId - The carnival club registration ID
   * @returns {Promise<number>} Number of players assigned
   */
  static async getPlayerCountForCarnivalClub(carnivalClubId) {
    return await this.count({
      where: {
        carnivalClubId: carnivalClubId,
        isActive: true
      }
    });
  }

  /**
   * Check if a player is already assigned to a carnival club registration
   * @param {number} carnivalClubId - The carnival club registration ID
   * @param {number} clubPlayerId - The club player ID
   * @returns {Promise<boolean>} True if already assigned, false otherwise
   */
  static async isPlayerAssigned(carnivalClubId, clubPlayerId) {
    const existing = await this.findOne({
      where: {
        carnivalClubId,
        clubPlayerId,
        isActive: true
      }
    });
    return !!existing;
  }

  /**
   * Get attendance statistics for a carnival club registration
   * @param {number} carnivalClubId - The carnival club registration ID
   * @returns {Promise<Object>} Statistics object with counts by status
   */
  static async getAttendanceStats(carnivalClubId) {
    const assignments = await this.findAll({
      where: {
        carnivalClubId: carnivalClubId,
        isActive: true
      },
      attributes: ['attendanceStatus']
    });

    const stats = {
      total: assignments.length,
      confirmed: 0,
      tentative: 0,
      unavailable: 0
    };

    assignments.forEach(assignment => {
      stats[assignment.attendanceStatus]++;
    });

    return stats;
  }

  /**
   * Get players grouped by team for a carnival club registration
   * @param {number} carnivalClubId - The carnival club registration ID
   * @returns {Promise<Object>} Object with team numbers as keys and player arrays as values
   */
  static async getPlayersByTeam(carnivalClubId) {
    const assignments = await this.findAll({
      where: {
        carnivalClubId: carnivalClubId,
        isActive: true
      },
      include: [
        {
          model: ClubPlayer,
          as: 'clubPlayer',
          attributes: ['id', 'firstName', 'lastName', 'dateOfBirth']
        }
      ],
      order: [['teamNumber', 'ASC'], ['clubPlayer', 'lastName', 'ASC']]
    });

    const teams = {};
    const unassigned = [];

    assignments.forEach(assignment => {
      const teamNumber = assignment.teamNumber;
      const playerData = {
        id: assignment.id,
        clubPlayerId: assignment.clubPlayerId,
        teamNumber: assignment.teamNumber,
        attendanceStatus: assignment.attendanceStatus,
        notes: assignment.notes,
        player: assignment.clubPlayer
      };

      if (teamNumber === null || teamNumber === undefined) {
        unassigned.push(playerData);
      } else {
        if (!teams[teamNumber]) {
          teams[teamNumber] = [];
        }
        teams[teamNumber].push(playerData);
      }
    });

    return { teams, unassigned };
  }

  /**
   * Assign a player to a specific team
   * @param {number} carnivalClubPlayerId - The carnival club player assignment ID
   * @param {number} teamNumber - The team number to assign (1-numberOfTeams)
   * @returns {Promise<CarnivalClubPlayer>} Updated assignment
   */
  static async assignToTeam(carnivalClubPlayerId, teamNumber) {
    const assignment = await this.findByPk(carnivalClubPlayerId);
    if (!assignment) {
      throw new Error('Player assignment not found');
    }

    assignment.teamNumber = teamNumber;
    await assignment.save();
    return assignment;
  }

  /**
   * Remove a player from their current team (set teamNumber to null)
   * @param {number} carnivalClubPlayerId - The carnival club player assignment ID
   * @returns {Promise<CarnivalClubPlayer>} Updated assignment
   */
  static async removeFromTeam(carnivalClubPlayerId) {
    const assignment = await this.findByPk(carnivalClubPlayerId);
    if (!assignment) {
      throw new Error('Player assignment not found');
    }

    assignment.teamNumber = null;
    await assignment.save();
    return assignment;
  }

  /**
   * Get team count statistics for a carnival club registration
   * @param {number} carnivalClubId - The carnival club registration ID
   * @returns {Promise<Object>} Object with team statistics
   */
  static async getTeamStats(carnivalClubId) {
    const assignments = await this.findAll({
      where: {
        carnivalClubId: carnivalClubId,
        isActive: true
      },
      attributes: ['teamNumber']
    });

    const stats = {
      totalPlayers: assignments.length,
      assignedPlayers: 0,
      unassignedPlayers: 0,
      teamCounts: {}
    };

    assignments.forEach(assignment => {
      const teamNumber = assignment.teamNumber;
      if (teamNumber === null || teamNumber === undefined) {
        stats.unassignedPlayers++;
      } else {
        stats.assignedPlayers++;
        if (!stats.teamCounts[teamNumber]) {
          stats.teamCounts[teamNumber] = 0;
        }
        stats.teamCounts[teamNumber]++;
      }
    });

    return stats;
  }
}

/**
 * Initialize CarnivalClubPlayer model with schema definition
 */
CarnivalClubPlayer.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  carnivalClubId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'carnival_clubs',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    validate: {
      notNull: {
        msg: 'Carnival club registration ID is required'
      },
      isInt: {
        msg: 'Carnival club registration ID must be a valid integer'
      }
    }
  },
  clubPlayerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'club_players',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    validate: {
      notNull: {
        msg: 'Club player ID is required'
      },
      isInt: {
        msg: 'Club player ID must be a valid integer'
      }
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    validate: {
      isBoolean: {
        msg: 'Active status must be true or false'
      }
    }
  },
  attendanceStatus: {
    type: DataTypes.STRING,
    defaultValue: 'confirmed',
    allowNull: false,
    validate: {
      isIn: {
        args: [ATTENDANCE_STATUS_ARRAY],
        msg: 'Attendance status must be one of: confirmed, tentative, unavailable'
      }
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: {
        args: [0, 500],
        msg: 'Notes cannot exceed 500 characters'
      }
    },
    set(value) {
      // Trim whitespace
      if (value) {
        this.setDataValue('notes', value.trim());
      }
    }
  },
  teamNumber: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      isInt: {
        msg: 'Team number must be a valid integer'
      },
      min: {
        args: [1],
        msg: 'Team number must be at least 1'
      },
      async isValidTeamNumber(value) {
        // Only validate if teamNumber is provided
        if (value === null || value === undefined) {
          return; // Allow null values
        }

        // Get the carnival club registration to check numberOfTeams
        if (this.carnivalClubId) {
          const { default: CarnivalClub } = await import('./CarnivalClub.mjs');
          const carnivalClub = await CarnivalClub.findByPk(this.carnivalClubId);
          
          if (carnivalClub && carnivalClub.numberOfTeams) {
            if (value > carnivalClub.numberOfTeams) {
              throw new Error(`Team number cannot exceed ${carnivalClub.numberOfTeams} (number of registered teams)`);
            }
          }
        }
      }
    }
  },
  addedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
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
  modelName: 'CarnivalClubPlayer',
  tableName: 'carnival_club_players',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['carnivalClubId', 'clubPlayerId'],
      name: 'unique_carnival_club_player'
    },
    {
      fields: ['carnivalClubId']
    },
    {
      fields: ['clubPlayerId']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['attendanceStatus']
    },
    {
      fields: ['teamNumber'],
      name: 'idx_carnival_club_players_team_number'
    }
  ],
  hooks: {
    beforeCreate: (assignment) => {
      // Set added timestamp
      assignment.addedAt = new Date();
    }
  }
});

export default CarnivalClubPlayer;