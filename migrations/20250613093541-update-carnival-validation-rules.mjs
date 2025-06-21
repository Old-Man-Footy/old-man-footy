'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Update Carnival table validation rules to be more permissive for MySideline imports
     * 
     * Changes:
     * 1. Allow NULL values for state field
     * 2. Remove length constraints on string fields
     * 3. Make validation more flexible for external data imports
     */
    
    try {
      // 1. Modify state column to allow NULL values
      await queryInterface.changeColumn('carnivals', 'state', {
        type: Sequelize.STRING(3),
        allowNull: true, // Changed from false to true
        validate: {
          isIn: [['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT']]
        }
      });

      // 2. Remove length constraints on string fields by updating them to be more permissive
      // Note: SQLite doesn't support CHECK constraints removal directly, so we recreate without length limits

      await queryInterface.changeColumn('carnivals', 'title', {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: true
          // Removed: len: [3, 200]
        }
      });

      await queryInterface.changeColumn('carnivals', 'locationAddress', {
        type: Sequelize.TEXT,
        allowNull: true
        // Removed: len: [5, 500]
      });

      await queryInterface.changeColumn('carnivals', 'locationAddressPart1', {
        type: Sequelize.STRING,
        allowNull: true
        // Removed: len: [2, 100]
      });

      await queryInterface.changeColumn('carnivals', 'locationAddressPart2', {
        type: Sequelize.STRING,
        allowNull: true
        // Removed: len: [2, 100]
      });

      await queryInterface.changeColumn('carnivals', 'locationAddressPart3', {
        type: Sequelize.STRING,
        allowNull: true
        // Removed: len: [2, 100]
      });

      await queryInterface.changeColumn('carnivals', 'locationAddressPart4', {
        type: Sequelize.STRING,
        allowNull: true
        // Removed: len: [2, 100]
      });

      await queryInterface.changeColumn('carnivals', 'organiserContactName', {
        type: Sequelize.STRING,
        allowNull: true
        // Removed: len: [2, 100]
      });

      await queryInterface.changeColumn('carnivals', 'organiserContactPhone', {
        type: Sequelize.STRING,
        allowNull: true
        // Removed: len: [10, 20] - validation now handled at model level
      });

      console.log('✅ Carnival validation rules updated successfully');

    } catch (error) {
      console.error('❌ Error updating carnival validation rules:', error);
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    /**
     * Revert carnival table validation rules to previous stricter constraints
     */
    
    try {
      // 1. Revert state column to NOT NULL
      await queryInterface.changeColumn('carnivals', 'state', {
        type: Sequelize.STRING(3),
        allowNull: false, // Reverted back to false
        validate: {
          isIn: [['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT']]
        }
      });

      // 2. Restore length constraints on string fields
      await queryInterface.changeColumn('carnivals', 'title', {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [3, 200] // Restored length constraint
        }
      });

      await queryInterface.changeColumn('carnivals', 'locationAddress', {
        type: Sequelize.TEXT,
        allowNull: true,
        validate: {
          len: [5, 500] // Restored length constraint
        }
      });

      await queryInterface.changeColumn('carnivals', 'locationAddressPart1', {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
          len: [2, 100] // Restored length constraint
        }
      });

      await queryInterface.changeColumn('carnivals', 'locationAddressPart2', {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
          len: [2, 100] // Restored length constraint
        }
      });

      await queryInterface.changeColumn('carnivals', 'locationAddressPart3', {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
          len: [2, 100] // Restored length constraint
        }
      });

      await queryInterface.changeColumn('carnivals', 'locationAddressPart4', {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
          len: [2, 100] // Restored length constraint
        }
      });

      await queryInterface.changeColumn('carnivals', 'organiserContactName', {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
          len: [2, 100] // Restored length constraint
        }
      });

      await queryInterface.changeColumn('carnivals', 'organiserContactPhone', {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
          len: [10, 20] // Restored length constraint
        }
      });

      console.log('✅ Carnival validation rules reverted successfully');

    } catch (error) {
      console.error('❌ Error reverting carnival validation rules:', error);
      throw error;
    }
  }
};
