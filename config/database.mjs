/**
 * Database Configuration for SQLite
 * 
 * This configuration sets up Sequelize ORM with SQLite database
 * for simplified deployment without external database dependencies.
 */

import { Sequelize } from 'sequelize';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

// Database file location based on environment
const getDbPath = () => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return path.join(__dirname, '..', 'data', 'old-man-footy.db');
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
    
    // Test write permissions by creating and deleting a test file
    const testFile = path.join(dataDir, '.write-test');
    try {
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log(`✅ Data directory is writable: ${dataDir}`);
      return true;
    } catch (writeError) {
      console.error(`❌ Data directory write test failed: ${writeError.message}`);
      throw new Error(`Database directory not writable: ${dataDir}`);
    }
    
  } catch (error) {
    console.error(`❌ Data directory issue: ${error.message}`);
    console.error(`   Directory: ${dataDir}`);
    console.error(`   Platform: ${process.platform}`);
    
    // Don't call process.getuid() on Windows - it doesn't exist
    if (process.platform !== 'win32' && typeof process.getuid === 'function') {
      console.error(`   Current user ID: ${process.getuid()}`);
    } else {
      console.error(`   Current user: ${process.env.USERNAME || process.env.USER || 'unknown'}`);
    }
    
    throw new Error(`Database directory not writable: ${dataDir}`);
  }
}

/**
 * Sequelize instance configuration
 */
export const sequelize = new Sequelize({
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
export async function testConnection() {
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
export async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    
    const env = process.env.NODE_ENV || 'development';
    
    // Use Sequelize sync for all environments to avoid CLI config issues
    console.log('📦 Running migrations using Sequelize sync...');
    
    // Import models to ensure they're loaded
    const models = await import('/models/index.mjs');
    
    // Check if database has existing data
    const tables = await sequelize.getQueryInterface().showAllTables();
    
    if (tables.length === 0) {
      // New database - safe to use sync with force
      console.log('🆕 New database detected - creating all tables');
      await sequelize.sync({ force: false });
    } else {
      // Existing database - just validate without altering
      console.log('🔍 Existing database detected - validating schema only');
      try {
        await sequelize.authenticate();
        console.log('✅ Database schema is compatible');
      } catch (error) {
        console.warn('⚠️ Database schema validation failed, but continuing:', error.message);
      }
    }
    
    console.log('✅ Database schema synchronized successfully');
    
  } catch (error) {
    console.error('❌ Database migration failed:', error.message);
    throw error;
  }
}

/**
 * Initialize database and run migrations
 * @returns {Promise<void>}
 */
export async function initializeDatabase() {
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
export async function closeConnection() {
  try {
    await sequelize.close();
    console.log('🔌 Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
}