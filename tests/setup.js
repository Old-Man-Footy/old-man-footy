const { sequelize } = require('../models');

/**
 * Global test setup for Jest
 * Configures the test database and cleans up after tests
 */

beforeAll(async () => {
  // Ensure we're using the test database
  if (process.env.NODE_ENV !== 'test') {
    process.env.NODE_ENV = 'test';
  }
  
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Test database connection established successfully.');
    
    // Sync database (create tables if they don't exist)
    await sequelize.sync({ force: true });
    console.log('Test database synchronized.');
  } catch (error) {
    console.error('Unable to connect to the test database:', error);
    throw error;
  }
});

afterAll(async () => {
  try {
    // Clean up and close database connection
    await sequelize.close();
    console.log('Test database connection closed.');
  } catch (error) {
    console.error('Error closing test database connection:', error);
  }
});

// Clean up after each test
afterEach(async () => {
  try {
    // Truncate all tables to ensure clean state between tests
    const models = Object.keys(sequelize.models);
    await sequelize.transaction(async (t) => {
      for (const modelName of models) {
        await sequelize.models[modelName].destroy({
          where: {},
          force: true,
          transaction: t
        });
      }
    });
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
});

// Set longer timeout for database operations
jest.setTimeout(30000);