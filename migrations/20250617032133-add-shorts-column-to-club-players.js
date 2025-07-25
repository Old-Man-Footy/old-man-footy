'use strict';

/**
 * Add Shorts Column to Club Players Migration
 * Adds shorts color restriction column to club_players table
 * @type {import('sequelize-cli').Migration}
 */
export default {
  /**
   * Add shorts column to club_players table
   * @param {QueryInterface} queryInterface - Sequelize query interface
   * @param {Sequelize} Sequelize - Sequelize instance
   */
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('club_players', 'shorts', {
      type: Sequelize.ENUM('Unrestricted', 'Red', 'Yellow', 'Blue', 'Green'),
      allowNull: false,
      defaultValue: 'Unrestricted',
      comment: 'Playing shorts color'
    });
  },

  /**
   * Remove shorts column from club_players table
   * @param {QueryInterface} queryInterface - Sequelize query interface
   * @param {Sequelize} Sequelize - Sequelize instance
   */
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('club_players', 'shorts');
  }
};
