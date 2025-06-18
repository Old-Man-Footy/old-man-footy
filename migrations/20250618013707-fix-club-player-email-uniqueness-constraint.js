'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Check if the email unique index exists before trying to remove it
    const indexes = await queryInterface.showIndex('club_players');
    const emailUniqueIndex = indexes.find(index => index.name === 'club_players_email_unique');
    
    if (emailUniqueIndex) {
      console.log('Removing unique constraint on email field...');
      await queryInterface.removeIndex('club_players', 'club_players_email_unique');
    }
    
    // Remove unique constraint from email column and make it nullable
    console.log('Making email field nullable and non-unique...');
    await queryInterface.changeColumn('club_players', 'email', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: false
    });
    
    // Check if the composite unique constraint already exists
    const compositeIndex = indexes.find(index => index.name === 'club_players_person_unique');
    
    if (!compositeIndex) {
      console.log('Adding composite unique constraint on clubId, firstName, lastName, dateOfBirth...');
      await queryInterface.addIndex('club_players', ['clubId', 'firstName', 'lastName', 'dateOfBirth'], {
        unique: true,
        name: 'club_players_person_unique'
      });
    }
    
    // Add a non-unique index on email for performance (if not already exists)
    const emailIndex = indexes.find(index => 
      index.fields.length === 1 && 
      index.fields[0].attribute === 'email' && 
      !index.unique
    );
    
    if (!emailIndex) {
      console.log('Adding non-unique index on email for performance...');
      await queryInterface.addIndex('club_players', ['email'], {
        name: 'club_players_email_index'
      });
    }
  },

  async down (queryInterface, Sequelize) {
    // Remove the composite unique constraint
    await queryInterface.removeIndex('club_players', 'club_players_person_unique');
    
    // Remove the non-unique email index
    try {
      await queryInterface.removeIndex('club_players', 'club_players_email_index');
    } catch (error) {
      // Index might not exist, continue
    }
    
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
