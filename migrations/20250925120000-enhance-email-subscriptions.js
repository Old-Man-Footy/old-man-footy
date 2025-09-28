/**
 * Migration: Enhance Email Subscriptions
 * Purpose: Add verification system and notification preferences to email subscriptions
 */

/**
 * Add verification and notification preference fields to email_subscriptions table
 */
export const up = async (queryInterface, Sequelize) => {
  console.log('🔄 Enhancing email_subscriptions table with verification system...');

  // PHASE 1: Column additions with separate transaction
  const columnTransaction = await queryInterface.sequelize.transaction();
  let columnsAdded = [];

  try {
    // Check existing columns to avoid conflicts
    const [results] = await queryInterface.sequelize.query(
      "PRAGMA table_info(email_subscriptions)",
      { transaction: columnTransaction }
    );
    
    const existingColumns = results.map(col => col.name);
    console.log('📋 Existing columns:', existingColumns);

    // Conditionally add columns that don't exist
    if (!existingColumns.includes('isActive')) {
      console.log('➕ Adding isActive column...');
      await queryInterface.addColumn('email_subscriptions', 'isActive', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether the email subscription is active (verified)'
      }, { transaction: columnTransaction });
      columnsAdded.push('isActive');
    } else {
      console.log('⏭️  isActive column already exists, skipping...');
    }

    if (!existingColumns.includes('notificationPreferences')) {
      console.log('➕ Adding notificationPreferences column...');
      await queryInterface.addColumn('email_subscriptions', 'notificationPreferences', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'JSON array of selected notification types'
      }, { transaction: columnTransaction });
      columnsAdded.push('notificationPreferences');
    }

    if (!existingColumns.includes('verificationToken')) {
      console.log('➕ Adding verificationToken column...');
      await queryInterface.addColumn('email_subscriptions', 'verificationToken', {
        type: Sequelize.STRING(256),
        allowNull: true,
        comment: 'Token used for email verification'
      }, { transaction: columnTransaction });
      columnsAdded.push('verificationToken');
    }

    if (!existingColumns.includes('verificationTokenExpiresAt')) {
      console.log('➕ Adding verificationTokenExpiresAt column...');
      await queryInterface.addColumn('email_subscriptions', 'verificationTokenExpiresAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Expiry date for the verification token'
      }, { transaction: columnTransaction });
      columnsAdded.push('verificationTokenExpiresAt');
    }

    // Commit column additions first
    await columnTransaction.commit();
    console.log('✅ Column additions committed successfully:', columnsAdded);

    // Wait for SQLite to process the schema changes
    await new Promise(resolve => setTimeout(resolve, 200));

  } catch (error) {
    await columnTransaction.rollback();
    console.error('❌ Column addition failed:', error);
    throw error;
  }

  // PHASE 2: Index creation with separate transaction (only if columns were added)
  if (columnsAdded.length > 0) {
    const indexTransaction = await queryInterface.sequelize.transaction();

    try {
      // Verify columns exist after the first transaction
      const [verifyResults] = await queryInterface.sequelize.query(
        "PRAGMA table_info(email_subscriptions)",
        { transaction: indexTransaction }
      );
      
      const currentColumns = verifyResults.map(col => col.name);
      console.log('📋 Current columns after column addition:', currentColumns);

      // Add indexes for better query performance (only for columns that were just added)
      if (columnsAdded.includes('verificationToken') && currentColumns.includes('verificationToken')) {
        console.log('📇 Creating index for verificationToken...');
        await queryInterface.addIndex('email_subscriptions', ['verificationToken'], {
          unique: true,
          name: 'idx_email_subscriptions_verification_token',
          where: {
            verificationToken: {
              [Sequelize.Op.ne]: null
            }
          }
        }, { transaction: indexTransaction });
      }

      if (columnsAdded.includes('isActive') && currentColumns.includes('isActive')) {
        console.log('📇 Creating index for isActive...');
        await queryInterface.addIndex('email_subscriptions', ['isActive'], {
          name: 'idx_email_subscriptions_is_active'
        }, { transaction: indexTransaction });
      }

      if (columnsAdded.includes('verificationTokenExpiresAt') && currentColumns.includes('verificationTokenExpiresAt')) {
        console.log('📇 Creating index for verificationTokenExpiresAt...');
        await queryInterface.addIndex('email_subscriptions', ['verificationTokenExpiresAt'], {
          name: 'idx_email_subscriptions_token_expires'
        }, { transaction: indexTransaction });
      }

      await indexTransaction.commit();
      console.log('✅ Index creation completed successfully');

    } catch (indexError) {
      await indexTransaction.rollback();
      console.error('❌ Index creation failed:', indexError);
      // Don't fail the entire migration - columns were added successfully
      console.log('⚠️ Migration completed with columns added, but index creation failed. Indexes can be added manually if needed.');
    }
  }

  // PHASE 3: Data migration in separate transaction
  const dataMigrationTransaction = await queryInterface.sequelize.transaction();

  try {
    // Migrate existing data: set notification preferences for all subscriptions
    console.log('🔄 Migrating existing subscription data...');
    if (columnsAdded.includes('notificationPreferences')) {
      await queryInterface.sequelize.query(`
        UPDATE email_subscriptions 
        SET notificationPreferences = '["carnival_notifications", "club_updates", "sponsor_announcements", "general_announcements", "newsletter", "maintenance_notifications"]'
        WHERE email IS NOT NULL AND notificationPreferences IS NULL
      `, { transaction: dataMigrationTransaction });
      console.log('✅ Default notification preferences set for existing subscriptions');
    }

    await dataMigrationTransaction.commit();
    console.log('✅ Data migration completed successfully');

  } catch (dataError) {
    await dataMigrationTransaction.rollback();
    console.error('❌ Data migration failed:', dataError);
    // Don't fail the entire migration - columns were added successfully
    console.log('⚠️ Data migration failed, but column structure is in place');
  }

  console.log('✅ Email subscriptions table enhanced successfully');
};

/**
 * Rollback the enhancement of email_subscriptions table
 */
export const down = async (queryInterface, Sequelize) => {
  console.log('🔄 Rolling back email_subscriptions table enhancements...');

  const transaction = await queryInterface.sequelize.transaction();

  try {
    // Check existing columns and indexes
    const [results] = await queryInterface.sequelize.query(
      "PRAGMA table_info(email_subscriptions)",
      { transaction }
    );
    
    const existingColumns = results.map(col => col.name);
    
    // Remove indexes (with error handling for missing indexes)
    try {
      if (existingColumns.includes('verificationToken')) {
        await queryInterface.removeIndex('email_subscriptions', 'idx_email_subscriptions_verification_token', { transaction });
      }
    } catch (e) { console.log('⚠️  Index idx_email_subscriptions_verification_token not found, skipping'); }
    
    try {
      if (existingColumns.includes('isActive')) {
        await queryInterface.removeIndex('email_subscriptions', 'idx_email_subscriptions_is_active', { transaction });
      }
    } catch (e) { console.log('⚠️  Index idx_email_subscriptions_is_active not found, skipping'); }
    
    try {
      if (existingColumns.includes('verificationTokenExpiresAt')) {
        await queryInterface.removeIndex('email_subscriptions', 'idx_email_subscriptions_token_expires', { transaction });
      }
    } catch (e) { console.log('⚠️  Index idx_email_subscriptions_token_expires not found, skipping'); }

    // Remove columns (only ones that were added by this migration)
    if (existingColumns.includes('verificationTokenExpiresAt')) {
      await queryInterface.removeColumn('email_subscriptions', 'verificationTokenExpiresAt', { transaction });
    }
    if (existingColumns.includes('verificationToken')) {
      await queryInterface.removeColumn('email_subscriptions', 'verificationToken', { transaction });
    }
    if (existingColumns.includes('notificationPreferences')) {
      await queryInterface.removeColumn('email_subscriptions', 'notificationPreferences', { transaction });
    }
    
    // Note: Not removing isActive column as it existed before this migration

    await transaction.commit();
    console.log('✅ Email subscriptions table rollback completed');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Rollback failed:', error);
    throw error;
  }
};
