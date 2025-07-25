'use strict';

/**
 * Migration: Remove deprecated location address part fields and add structured address lines
 * 
 * Removes the legacy locationAddressPart1-4 fields from the carnivals table
 * and adds the new locationAddressLine1-2 fields for MySideline-compatible address structure.
 */

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  console.log('Removing deprecated locationAddressPart fields and adding new address line fields...');
  
  // Remove the deprecated address part columns
  await queryInterface.removeColumn('carnivals', 'locationAddressPart1');
  await queryInterface.removeColumn('carnivals', 'locationAddressPart2');
  await queryInterface.removeColumn('carnivals', 'locationAddressPart3');
  await queryInterface.removeColumn('carnivals', 'locationAddressPart4');
  
  // Add new MySideline structured address line fields
  await queryInterface.addColumn('carnivals', 'locationAddressLine1', {
    type: Sequelize.STRING(200),
    allowNull: true,
    comment: 'First line of structured address from MySideline (street address, venue name)'
  });

  await queryInterface.addColumn('carnivals', 'locationAddressLine2', {
    type: Sequelize.STRING(200),
    allowNull: true,
    comment: 'Second line of structured address from MySideline (additional address info)'
  });
  
  console.log('✅ Successfully updated address structure - removed deprecated fields and added new address line fields');
}

export async function down(queryInterface, Sequelize) {
  console.log('Reverting address structure changes...');
  
  // Remove the new address line fields
  await queryInterface.removeColumn('carnivals', 'locationAddressLine1');
  await queryInterface.removeColumn('carnivals', 'locationAddressLine2');
  
  // Re-add the deprecated fields for rollback (though data will be lost)
  await queryInterface.addColumn('carnivals', 'locationAddressPart1', {
    type: Sequelize.STRING,
    allowNull: true,
    comment: 'Legacy field - replaced by MySideline-compatible structure'
  });
  
  await queryInterface.addColumn('carnivals', 'locationAddressPart2', {
    type: Sequelize.STRING,
    allowNull: true,
    comment: 'Legacy field - replaced by MySideline-compatible structure'
  });
  
  await queryInterface.addColumn('carnivals', 'locationAddressPart3', {
    type: Sequelize.STRING,
    allowNull: true,
    comment: 'Legacy field - replaced by MySideline-compatible structure'
  });
  
  await queryInterface.addColumn('carnivals', 'locationAddressPart4', {
    type: Sequelize.STRING,
    allowNull: true,
    comment: 'Legacy field - replaced by MySideline-compatible structure'
  });
  
  console.log('⚠️ Rollback completed - reverted to deprecated address structure');
}
