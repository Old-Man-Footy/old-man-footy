'use strict';

/**
 * Fix Club Player Uniqueness Constraint Migration
 * Updates uniqueness constraint on club_players table to prevent duplicate players
 * @type {import('sequelize-cli').Migration}
 */
export default {
  async up (queryInterface, Sequelize) {
    // Remove the unique constraint on email field
    await queryInterface.removeIndex('club_players', 'club_players_email_unique');
    
    // Remove unique constraint from email column
    await queryInterface.changeColumn('club_players', 'email', {
      type: Sequelize.STRING,
      allowNull: true, // Allow null emails as not everyone may have an email
      unique: false
    });
    
    // Add composite unique constraint on clubId, firstName, lastName, dateOfBirth
    // This prevents the same person from being registered multiple times in the same club
    await queryInterface.addIndex('club_players', ['clubId', 'firstName', 'lastName', 'dateOfBirth'], {
      unique: true,
      name: 'club_players_person_unique'
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove the composite unique constraint
    await queryInterface.removeIndex('club_players', 'club_players_person_unique');
    
    // Restore unique constraint on email
    await queryInterface.changeColumn('club_players', 'email', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    });
    
    // Re-add the email unique index
    await queryInterface.addIndex('club_players', ['email'], {
      unique: true,
      name: 'club_players_email_unique'
    });
  }
};
