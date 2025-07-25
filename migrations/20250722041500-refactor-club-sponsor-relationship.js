/**
 * Migration: Refactor Club-Sponsor Relationship
 * - Drop club_sponsors join table
 * - Add clubId to sponsors table (one-to-many)
 */

export default {
  async up(queryInterface, Sequelize) {
    // Drop the club_sponsors join table
    await queryInterface.dropTable('club_sponsors');

    // Add clubId to sponsors table
    await queryInterface.addColumn('sponsors', 'clubId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'clubs',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'The club that owns this sponsor'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove clubId from sponsors table
    await queryInterface.removeColumn('sponsors', 'clubId');

    // Recreate the club_sponsors join table (minimal definition)
    await queryInterface.createTable('club_sponsors', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
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
      sponsorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'sponsors',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  }
};