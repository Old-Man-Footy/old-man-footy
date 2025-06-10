/**
 * Database Migration Script - Add Password Reset Columns to Users Table
 * 
 * This script adds the missing passwordResetToken and passwordResetExpires
 * columns to the users table to match the User model schema.
 */

const { sequelize } = require('../config/database');

/**
 * Add missing password reset columns to users table
 */
async function addPasswordResetColumns() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('Starting migration: Adding password reset columns to users table...');
    
    // Check if columns already exist
    const tableDescription = await queryInterface.describeTable('users');
    
    // Add passwordResetToken column if it doesn't exist
    if (!tableDescription.passwordResetToken) {
      console.log('Adding passwordResetToken column...');
      await queryInterface.addColumn('users', 'passwordResetToken', {
        type: sequelize.Sequelize.STRING,
        allowNull: true
        // Note: UNIQUE constraint will be handled by Sequelize model definition
      });
      console.log('✓ passwordResetToken column added');
    } else {
      console.log('✓ passwordResetToken column already exists');
    }
    
    // Add passwordResetExpires column if it doesn't exist
    if (!tableDescription.passwordResetExpires) {
      console.log('Adding passwordResetExpires column...');
      await queryInterface.addColumn('users', 'passwordResetExpires', {
        type: sequelize.Sequelize.DATE,
        allowNull: true
      });
      console.log('✓ passwordResetExpires column added');
    } else {
      console.log('✓ passwordResetExpires column already exists');
    }
    
    console.log('Migration completed successfully!');
    console.log('Note: UNIQUE constraints will be managed by Sequelize model definition.');
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  }
}

/**
 * Run migration if this script is executed directly
 */
if (require.main === module) {
  addPasswordResetColumns()
    .then(() => {
      console.log('Database migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addPasswordResetColumns };