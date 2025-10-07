/**
 * Sequelize CLI Config Wrapper
 * 
 * This CommonJS file provides minimal configuration for Sequelize CLI migrations.
 * Main database configuration has been consolidated to config/database.mjs
 */

const path = require('path');

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'data', 'dev-old-man-footy.db'),
    logging: false, // Logging handled by database.mjs
    migrationStorageTableName: 'SequelizeMeta',
    seederStorageTableName: 'SequelizeData'
  },
  test: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'data', 'test-old-man-footy.db'),
    logging: false, // Logging handled by database.mjs
    migrationStorageTableName: 'SequelizeMeta',
    seederStorageTableName: 'SequelizeData'
  },
  production: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'data', 'old-man-footy.db'),
    logging: false, // Logging handled by database.mjs
    migrationStorageTableName: 'SequelizeMeta',
    seederStorageTableName: 'SequelizeData'
  }
};