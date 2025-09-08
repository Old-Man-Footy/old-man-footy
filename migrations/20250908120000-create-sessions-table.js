/**
 * Migration: Create Sessions Table
 * 
 * Creates the sessions table used by connect-session-sequelize for Express session storage.
 * This table is automatically created by the session store, but we're adding it to migrations
 * for consistency and to prevent warning messages.
 */

export async function up(queryInterface, Sequelize) {
  // Check if table already exists to prevent duplicate creation
  const tableExists = await queryInterface.tableExists('Sessions');
  
  if (!tableExists) {
    await queryInterface.createTable('Sessions', {
      sid: {
        type: Sequelize.STRING(32),
        primaryKey: true,
        allowNull: false
      },
      expires: {
        type: Sequelize.DATE,
        allowNull: true
      },
      data: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    console.log('✅ Sessions table created successfully');
  } else {
    console.log('ℹ️ Sessions table already exists, skipping creation');
  }
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('Sessions');
  console.log('✅ Sessions table dropped successfully');
}
