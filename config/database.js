/**
 * Database Configuration for SQLite
 * 
 * This configuration sets up Sequelize ORM with SQLite database
 * for simplified deployment without external database dependencies.
 */

const { Sequelize } = require('sequelize');
const path = require('path');

// Database file location
const dbPath = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '..', 'data', 'rugby-league-masters.db')
  : path.join(__dirname, '..', 'data', 'dev-old-man-footy.db');

/**
 * Sequelize instance configuration
 */
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: false,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  // SQLite specific options
  dialectOptions: {
    // Enable foreign keys in SQLite
    foreignKeys: true
  }
});

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection success status
 */
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ SQLite database connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to SQLite database:', error);
    return false;
  }
}

/**
 * Initialize database and create tables
 * @returns {Promise<void>}
 */
async function initializeDatabase() {
  try {
    // Ensure data directory exists
    const fs = require('fs');
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Test connection
    await testConnection();

    // For SQLite, we need to handle foreign key constraints carefully
    // Use force: false and alter: false to avoid dropping tables with foreign key constraints
    const syncOptions = {
      force: false,
      alter: false  // Changed from 'alter: true' which was causing the issue
    };

    // Sync all models (create tables if they don't exist, but don't alter existing ones)
    await sequelize.sync(syncOptions);
    console.log('✅ Database tables synchronized successfully');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Close database connection
 * @returns {Promise<void>}
 */
async function closeConnection() {
  try {
    await sequelize.close();
    console.log('🔌 Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
}

module.exports = {
  sequelize,
  testConnection,
  initializeDatabase,
  closeConnection
};