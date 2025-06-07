const { Sequelize } = require('sequelize');
const path = require('path');

// Create a separate test database file to avoid conflicts
const testDbPath = path.join(__dirname, '..', 'data', 'test-old-man-footy.db');

// Initialize Sequelize for SQLite with proper test configuration
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: testDbPath,
  logging: false, // Disable logging to reduce noise in tests
  retry: {
    max: 3
  },
  pool: {
    max: 1,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Import models - this will set up the associations
const models = require('../models');

// Global test setup
beforeAll(async () => {
  try {
    console.log('Test database connection established successfully.');
    
    // Force recreate all tables and indexes
    await sequelize.sync({ force: true, alter: false });
    console.log('Test database synchronized.');
  } catch (error) {
    console.error('Unable to connect to the test database:', error);
    throw error;
  }
});

// Clean up after all tests
afterAll(async () => {
  try {
    await sequelize.close();
    console.log('Test database connection closed.');
  } catch (error) {
    console.error('Error closing test database connection:', error);
  }
});

// Clean up between each test
afterEach(async () => {
  if (sequelize.connectionManager.pool) {
    try {
      // Only clean up data if connection is still active
      const models = sequelize.models;
      
      // Delete in reverse dependency order to avoid foreign key conflicts
      const modelsToClean = [
        'Carnival',
        'User', 
        'Club',
        'EmailSubscription'
      ];
      
      for (const modelName of modelsToClean) {
        if (models[modelName]) {
          try {
            await models[modelName].destroy({ 
              where: {},
              truncate: true,
              cascade: true,
              force: true
            });
          } catch (cleanupError) {
            // Ignore cleanup errors - table might not exist
          }
        }
      }
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  }
});

// Export sequelize instance for use in tests
module.exports = {
  sequelize,
  models: sequelize.models
};