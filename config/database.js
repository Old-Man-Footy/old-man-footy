/**
 * Database Configuration for SQLite
 * 
 * This configuration sets up Sequelize ORM with SQLite database
 * for simplified deployment without external database dependencies.
 */

const { Sequelize } = require('sequelize');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

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
 * Run database migrations
 * @returns {Promise<void>}
 */
async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    
    // Set NODE_ENV for migration command if not set
    const env = process.env.NODE_ENV || 'development';
    
    // Run migrations using sequelize-cli
    const { stdout, stderr } = await execAsync('npx sequelize-cli db:migrate', {
      env: { ...process.env, NODE_ENV: env },
      cwd: path.join(__dirname, '..')
    });
    
    if (stderr && !stderr.includes('WARNING')) {
      console.warn('Migration warnings:', stderr);
    }
    
    console.log('✅ Database migrations completed successfully');
    if (stdout) {
      console.log('Migration output:', stdout);
    }
    
  } catch (error) {
    // Check if it's a "No migrations were executed" message (which is not an error)
    if (error.message.includes('No migrations were executed')) {
      console.log('✅ Database is up to date - no migrations needed');
      return;
    }
    
    console.error('❌ Database migration failed:', error.message);
    throw error;
  }
}

/**
 * Initialize database and run migrations
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

    // Run migrations instead of sync
    await runMigrations();
    
    console.log('✅ Database initialization completed successfully');
    
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