/**
 * Migration: Add venue name field to carnivals table
 * 
 * Adds the venueName field to store venue/facility name information
 * from MySideline data (item.orgtree?.venue?.name or item.venue?.name)
 */

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  console.log('Adding venueName field to carnivals table...');
  
  await queryInterface.addColumn('carnivals', 'venueName', {
    type: Sequelize.STRING(200),
    allowNull: true,
    comment: 'Name of the venue/facility hosting the carnival (from MySideline venue data)'
  });
  
  console.log('✅ Successfully added venueName field to carnivals table');
}

export async function down(queryInterface, Sequelize) {
  console.log('Removing venueName field from carnivals table...');
  
  await queryInterface.removeColumn('carnivals', 'venueName');
  
  console.log('✅ Successfully removed venueName field from carnivals table');
}
