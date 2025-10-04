/**
 * Database Configuration for SQLite
 * 
 * This configuration sets up Sequelize ORM with SQLite database
 * for simplified deployment without external database dependencies.
 */

import { Sequelize } from 'sequelize';
import * as SequelizeModule from 'sequelize';
import { Umzug, SequelizeStorage } from 'umzug';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { fileURLToPath } from 'url';
// Note: Avoid importing DatabaseOptimizer at module top-level to prevent ESM circular deps

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

/**
 * Get database path for current environment
 * @returns {string} Database file path
 */
export function getDbPath() {
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
}

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
let sequelizeOptions = {
  dialect: 'sqlite',
  storage: dbPath,
  logging: process.env.NODE_ENV === 'test' ? console.log : false,
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
};

if (process.env.NODE_ENV === 'production') {
  // Inline production options to avoid circular imports at module init
  const maxPoolSize = Number.isInteger(Number(process.env.SQLITE_MAX_POOL_SIZE)) ? Number(process.env.SQLITE_MAX_POOL_SIZE) : 5;
  const minPoolSize = Number.isInteger(Number(process.env.SQLITE_MIN_POOL_SIZE)) ? Number(process.env.SQLITE_MIN_POOL_SIZE) : 1;
  const acquireTimeout = Number.isInteger(Number(process.env.SQLITE_ACQUIRE_TIMEOUT)) ? Number(process.env.SQLITE_ACQUIRE_TIMEOUT) : 30000;
  const idleTimeout = Number.isInteger(Number(process.env.SQLITE_IDLE_TIMEOUT)) ? Number(process.env.SQLITE_IDLE_TIMEOUT) : 10000;
  const queryTimeout = Number.isInteger(Number(process.env.SQLITE_QUERY_TIMEOUT)) ? Number(process.env.SQLITE_QUERY_TIMEOUT) : 30000;

  sequelizeOptions = {
    ...sequelizeOptions,
    pool: {
      max: maxPoolSize,
      min: minPoolSize,
      acquire: acquireTimeout,
      idle: idleTimeout
    },
    dialectOptions: {
      options: { enableForeignKeyConstraints: true },
      timeout: queryTimeout
    },
    logging: false,
    storage: dbPath
  };
}

export const sequelize = new Sequelize(sequelizeOptions);

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
    console.log('🔄 Running database migrations (Umzug)...');

    // Ensure models are loaded/registered (associations may be used by some migrations)
    await import('../models/index.mjs');

  // Use a POSIX-friendly glob and an explicit cwd so Windows path separators don't break fast-glob.
  const migrationsCwd = path.join(__dirname, '..');
  const migrationsGlob = 'migrations/*.js';

  const umzug = new Umzug({
      migrations: {
        glob: migrationsGlob,
        cwd: migrationsCwd,
        // Adapt sequelize-cli style migration signatures (queryInterface, Sequelize)
        resolve: ({ name, path: migrationPath, context, cwd }) => {
          // Build absolute path for reliable ESM import
          const absPath = migrationPath && path.isAbsolute(migrationPath)
            ? migrationPath
            : path.join(cwd || migrationsCwd, migrationPath);
          // Use filename only for migration name to be compatible with existing SequelizeMeta rows
          const baseName = path.basename(absPath);
          return {
            name: baseName,
            up: async () => {
              // Ensure ESM import works with absolute paths across platforms (Windows/Linux)
              const mod = await import(pathToFileURL(absPath).href);
              if (typeof mod.up !== 'function') throw new Error(`Migration ${name} missing exported up()`);
              return mod.up(context, SequelizeModule);
            },
            down: async () => {
              const mod = await import(pathToFileURL(absPath).href);
              if (typeof mod.down !== 'function') throw new Error(`Migration ${name} missing exported down()`);
              return mod.down(context, SequelizeModule);
            }
          };
        }
      },
      context: sequelize.getQueryInterface(),
      storage: new SequelizeStorage({ sequelize, tableName: 'SequelizeMeta' }),
      logger: console
    });

    const pending = await umzug.pending();
    if (pending.length === 0) {
      console.log('✅ No pending migrations. Schema is up to date.');
      return;
    }
    console.log(`📦 Pending migrations: ${pending.map(m => m.name).join(', ')}`);

    await umzug.up();
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Database migration failed:', error?.stack || error?.message || error);
    throw error;
  }
}

/**
 * One-time database setup for application startup
 * Runs migrations, creates indexes, sets up monitoring
 * Should only be called once at startup
 * @returns {Promise<void>}
 */
export async function setupDatabase() {
  try {
    ensureDataDirectory();
    const connected = await testConnection();
    if (!connected) throw new Error('Failed to establish database connection');
    await runMigrations();
    await checkDatabaseSchema();
  const { default: DatabaseOptimizer } = await import('./database-optimizer.mjs');
  await DatabaseOptimizer.createIndexes();
  await DatabaseOptimizer.setupMonitoring();
    console.log('✅ Database setup completed successfully');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

/**
 * Get a healthy database connection (for health checks, etc)
 * @returns {Promise<boolean>} Connection success status
 */
export async function getDatabaseConnection() {
  return await testConnection();
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

    // Create database indexes for optimization
  const { default: DatabaseOptimizer } = await import('./database-optimizer.mjs');
  await DatabaseOptimizer.createIndexes();

    // Set up database connection and query monitoring hooks
  await DatabaseOptimizer.setupMonitoring();
    
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
    
    // Create case-insensitive comparison arrays
    const actualTablesLower = actualTables.map(t => t.toLowerCase());
    const expectedTablesLower = expectedTables.map(t => t.toLowerCase());
    
    const present = expectedTables.filter(t => actualTablesLower.includes(t.toLowerCase()));
    const missing = expectedTables.filter(t => !actualTablesLower.includes(t.toLowerCase()));
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