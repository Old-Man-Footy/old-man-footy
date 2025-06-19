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
const fs = require('fs');

const execAsync = promisify(exec);

// Database file location based on environment
const getDbPath = () => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return path.join(__dirname, '..', 'data', 'rugby-league-masters.db');
    case 'test':
      return path.join(__dirname, '..', 'data', 'test-old-man-footy.db');
    case 'development':
    default:
      return path.join(__dirname, '..', 'data', 'dev-old-man-footy.db');
  }
};

const dbPath = getDbPath();

/**
 * Ensure database directory exists and is writable
 */
function ensureDataDirectory() {
  const dataDir = path.dirname(dbPath);
  
  try {
    // Create directory if it doesn't exist
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`📁 Created data directory: ${dataDir}`);
    }
    
    // Test write permissions
    const testFile = path.join(dataDir, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    
    console.log(`✅ Data directory is writable: ${dataDir}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Data directory issue: ${error.message}`);
    console.error(`   Directory: ${dataDir}`);
    console.error(`   Current user: ${process.getuid ? process.getuid() : 'unknown'}`);
    throw new Error(`Database directory not writable: ${dataDir}`);
  }
}

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
  },
  // Retry configuration for container environments
  retry: {
    max: 3,
    timeout: 5000
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
    console.error(`   Database path: ${dbPath}`);
    return false;
  }
}

/**
 * Run database migrations using direct Sequelize instead of CLI in production
 * @returns {Promise<void>}
 */
async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    
    const env = process.env.NODE_ENV || 'development';
    
    if (env === 'production') {
      // In production, use Sequelize Umzug for migrations to avoid npm issues
      console.log('📦 Running migrations using Sequelize sync (production mode)...');
      
      // Import models to ensure they're loaded
      const models = require('../models');
      
      // Use sync with alter for production (safer than force)
      await sequelize.sync({ alter: true });
      console.log('✅ Database schema synchronized successfully');
      
    } else {
      // Development/test environments can use CLI
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
    // Ensure data directory exists and is writable
    ensureDataDirectory();

    // Test connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to establish database connection');
    }

    // Run migrations
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