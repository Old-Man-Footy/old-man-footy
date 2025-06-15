'use strict';

/**
 * Add MySideline-specific matching fields for reliable duplicate detection
 * These fields are immutable and used solely for matching MySideline events
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add MySideline-specific fields that never change after initial import
     * These provide reliable duplicate detection regardless of user edits
     */
    await queryInterface.addColumn('carnivals', 'mySidelineAddress', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Original MySideline address - immutable, used for duplicate detection'
    });

    await queryInterface.addColumn('carnivals', 'mySidelineDate', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Original MySideline date - immutable, used for duplicate detection'
    });

    // Add composite index for efficient duplicate detection
    await queryInterface.addIndex('carnivals', ['mySidelineTitle', 'mySidelineDate', 'mySidelineAddress'], {
      name: 'carnivals_mysideline_matching_idx',
      where: {
        isManuallyEntered: false
      }
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Remove the MySideline matching fields and index if rolling back
     */
    await queryInterface.removeIndex('carnivals', 'carnivals_mysideline_matching_idx');
    await queryInterface.removeColumn('carnivals', 'mySidelineAddress');
    await queryInterface.removeColumn('carnivals', 'mySidelineDate');
  }
};
