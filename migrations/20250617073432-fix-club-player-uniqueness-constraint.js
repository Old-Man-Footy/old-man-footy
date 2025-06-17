'use strict';

/**
 * Migration: Fix Club Player Uniqueness Constraint
 * 
 * Changes the uniqueness constraint from email-only to the proper business rule:
 * Players should be unique by clubId + firstName + lastName + dateOfBirth combination.
 * This allows family members or teammates to share email addresses.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 Fixing club player uniqueness constraints...');
    
    // 1. Remove the existing unique constraint on email
    console.log('  📧 Removing unique constraint on email field...');
    await queryInterface.removeIndex('club_players', 'club_players_email_key');
    
    // 2. Add the correct unique constraint based on business rules
    // Players should be unique by club + name + date of birth combination
    console.log('  👤 Adding proper uniqueness constraint (club + name + DOB)...');
    await queryInterface.addIndex('club_players', {
      unique: true,
      fields: ['clubId', 'firstName', 'lastName', 'dateOfBirth'],
      name: 'unique_club_player_identity'
    });
    
    console.log('✅ Club player uniqueness constraints updated successfully');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Reverting club player uniqueness constraints...');
    
    // 1. Remove the business rule unique constraint
    console.log('  👤 Removing business rule uniqueness constraint...');
    await queryInterface.removeIndex('club_players', 'unique_club_player_identity');
    
    // 2. Restore the original email unique constraint
    console.log('  📧 Restoring email unique constraint...');
    await queryInterface.addIndex('club_players', {
      unique: true,
      fields: ['email'],
      name: 'club_players_email_key'
    });
    
    console.log('✅ Club player uniqueness constraints reverted');
  }
};
