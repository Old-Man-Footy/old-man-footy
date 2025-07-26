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
 * Run database migrations using Sequelize CLI
 * @returns {Promise<void>}
 */
export async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    
    // Import models to ensure they're registered with Sequelize
    await import('../models/index.mjs');
    
    // Run migrations using Sequelize CLI
    const { stdout, stderr } = await execAsync('npx sequelize-cli db:migrate');
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log('✅ Database migrations completed successfully');
    
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

    // Check database schema
    await checkDatabaseSchema();
        
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

/**
 * Checks that all tables defined in Sequelize models exist in the SQLite database schema.
 *
 * @returns {Promise<{ missing: string[], present: string[] }>} 
 * @throws {Error} If unable to query the database schema.
 *
 * Security: Only uses Sequelize's built-in methods, no raw string interpolation.
 * Strict MVC: Does not interact with Express req/res.
 */
export async function checkDatabaseSchema() {
  try {
    // Ensure all models are loaded and registered
    await import('../models/index.mjs');

    // Collect expected table names from all registered models
    const expectedTables = Object.values(sequelize.models)
      .map(model => model.getTableName())
      .filter(Boolean);

    // Query for all user tables in the SQLite schema
    const results = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';",
      { type: sequelize.QueryTypes.SELECT }
    );
    const actualTables = Array.isArray(results)
      ? results.map(row => row.name)
      : [];
    const present = expectedTables.filter(t => actualTables.includes(t));
    const missing = expectedTables.filter(t => !actualTables.includes(t));
    if (missing.length > 0) {
      console.warn(`⚠️ Missing tables: ${missing.join(', ')}`);
    } else {
      console.log('✅ All expected tables are present.');
    }
    return { missing, present };
  } catch (error) {
    console.error('❌ Error checking database schema:', error.message);
    throw new Error('Failed to check database schema');
  }
}