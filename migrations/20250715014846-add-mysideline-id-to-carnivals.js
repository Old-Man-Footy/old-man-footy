/**
 * Migration: Add mySidelineId field to carnivals table
 * 
 * This migration adds a mySidelineId field to store unique MySideline event identifiers
 * for improved duplicate detection when scraping MySideline events.
 */

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  /**
   * Add mySidelineId field to carnivals table for improved duplicate detection
   * This field will store the unique numeric identifier from MySideline API responses
   */
  await queryInterface.addColumn('carnivals', 'mySidelineId', {
    type: Sequelize.INTEGER,
    allowNull: true,
    comment: 'Unique MySideline event identifier (numeric) for reliable duplicate detection'
  });

  // Add index for efficient lookups by MySideline ID
  await queryInterface.addIndex('carnivals', ['mySidelineId'], {
    name: 'carnivals_mysideline_id_idx',
    where: {
      mySidelineId: {
        [Sequelize.Op.ne]: null
      }
    }
  });
}

export async function down(queryInterface, Sequelize) {
  /**
   * Remove the mySidelineId field and its index
   */
  await queryInterface.removeIndex('carnivals', 'carnivals_mysideline_id_idx');
  await queryInterface.removeColumn('carnivals', 'mySidelineId');
}
