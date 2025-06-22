'use strict';

/**
 * Create Club Players Table Migration
 * Creates club_players table for managing rugby league club player rosters
 * @type {import('sequelize-cli').Migration}
 */
export default {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('club_players', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      clubId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'clubs',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      firstName: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      lastName: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      dateOfBirth: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      registeredAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
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

    // Add indexes for performance
    await queryInterface.addIndex('club_players', ['email'], {
      unique: true,
      name: 'club_players_email_unique'
    });

    await queryInterface.addIndex('club_players', ['clubId'], {
      name: 'club_players_club_id_index'
    });

    await queryInterface.addIndex('club_players', ['firstName', 'lastName'], {
      name: 'club_players_name_index'
    });

    await queryInterface.addIndex('club_players', ['isActive'], {
      name: 'club_players_active_index'
    });

    await queryInterface.addIndex('club_players', ['dateOfBirth'], {
      name: 'club_players_dob_index'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('club_players');
  }
};
