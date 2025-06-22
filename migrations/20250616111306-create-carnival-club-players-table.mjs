'use strict';

/**
 * Migration: Create CarnivalClubPlayer Junction Table
 * 
 * Creates a junction table to link club players to specific carnival attendance records,
 * allowing organizers to track which specific players from each club will attend.
 */

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('carnival_club_players', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      carnivalClubId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'carnival_clubs',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      clubPlayerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'club_players',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      attendanceStatus: {
        type: Sequelize.ENUM('confirmed', 'tentative', 'unavailable'),
        defaultValue: 'confirmed',
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      addedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Create indexes for performance
    await queryInterface.addIndex('carnival_club_players', ['carnivalClubId']);
    await queryInterface.addIndex('carnival_club_players', ['clubPlayerId']);
    await queryInterface.addIndex('carnival_club_players', ['isActive']);
    await queryInterface.addIndex('carnival_club_players', ['attendanceStatus']);
    
    // Create unique constraint to prevent duplicate player assignments
    await queryInterface.addIndex('carnival_club_players', {
      fields: ['carnivalClubId', 'clubPlayerId'],
      unique: true,
      name: 'unique_carnival_club_player'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('carnival_club_players');
  }
};
