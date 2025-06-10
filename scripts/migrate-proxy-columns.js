/**
 * Database Migration Script - Add Proxy Club Creation Columns
 * 
 * Adds the missing columns for proxy club creation functionality:
 * - createdByProxy: Boolean flag for clubs created on behalf of others
 * - inviteEmail: Email address for ownership invitation
 * - createdByUserId: ID of user who created the club proxy
 */

const { sequelize } = require('../config/database');
const { QueryInterface, DataTypes } = require('sequelize');

/**
 * Add missing columns to clubs table
 */
async function addProxyColumns() {
    const queryInterface = sequelize.getQueryInterface();
    
    try {
        console.log('🔄 Starting proxy columns migration...');
        
        // Check if columns already exist
        const tableDescription = await queryInterface.describeTable('clubs');
        
        // Add createdByProxy column if it doesn't exist
        if (!tableDescription.createdByProxy) {
            console.log('➕ Adding createdByProxy column...');
            await queryInterface.addColumn('clubs', 'createdByProxy', {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false
            });
            console.log('✅ createdByProxy column added successfully');
        } else {
            console.log('⏭️  createdByProxy column already exists');
        }
        
        // Add inviteEmail column if it doesn't exist
        if (!tableDescription.inviteEmail) {
            console.log('➕ Adding inviteEmail column...');
            await queryInterface.addColumn('clubs', 'inviteEmail', {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    isEmail: true,
                    len: [0, 100]
                }
            });
            console.log('✅ inviteEmail column added successfully');
        } else {
            console.log('⏭️  inviteEmail column already exists');
        }
        
        // Add createdByUserId column if it doesn't exist
        if (!tableDescription.createdByUserId) {
            console.log('➕ Adding createdByUserId column...');
            await queryInterface.addColumn('clubs', 'createdByUserId', {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id'
                }
            });
            console.log('✅ createdByUserId column added successfully');
        } else {
            console.log('⏭️  createdByUserId column already exists');
        }
        
        console.log('🎉 Proxy columns migration completed successfully!');
        
        // Verify the migration
        console.log('🔍 Verifying migration...');
        const updatedDescription = await queryInterface.describeTable('clubs');
        
        const requiredColumns = ['createdByProxy', 'inviteEmail', 'createdByUserId'];
        const missingColumns = requiredColumns.filter(col => !updatedDescription[col]);
        
        if (missingColumns.length === 0) {
            console.log('✅ All proxy columns verified successfully');
        } else {
            console.error('❌ Some columns are still missing:', missingColumns);
            throw new Error(`Migration incomplete: missing columns ${missingColumns.join(', ')}`);
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

/**
 * Rollback migration (remove added columns)
 */
async function removeProxyColumns() {
    const queryInterface = sequelize.getQueryInterface();
    
    try {
        console.log('🔄 Starting proxy columns rollback...');
        
        const tableDescription = await queryInterface.describeTable('clubs');
        
        // Remove columns if they exist
        const columnsToRemove = ['createdByProxy', 'inviteEmail', 'createdByUserId'];
        
        for (const column of columnsToRemove) {
            if (tableDescription[column]) {
                console.log(`➖ Removing ${column} column...`);
                await queryInterface.removeColumn('clubs', column);
                console.log(`✅ ${column} column removed successfully`);
            } else {
                console.log(`⏭️  ${column} column doesn't exist`);
            }
        }
        
        console.log('🎉 Proxy columns rollback completed successfully!');
        
    } catch (error) {
        console.error('❌ Rollback failed:', error.message);
        throw error;
    }
}

/**
 * Main execution function
 */
async function main() {
    try {
        const action = process.argv[2];
        
        if (action === 'rollback') {
            await removeProxyColumns();
        } else {
            await addProxyColumns();
        }
        
        await sequelize.close();
        console.log('✅ Database connection closed');
        process.exit(0);
        
    } catch (error) {
        console.error('💥 Script failed:', error);
        await sequelize.close();
        process.exit(1);
    }
}

// Run the migration if this script is executed directly
if (require.main === module) {
    main();
}

module.exports = {
    addProxyColumns,
    removeProxyColumns
};