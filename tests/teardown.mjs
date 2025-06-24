/**
 * Global Jest Teardown
 * Closes the Sequelize connection after all tests have run.
 * Ensures the test database connection is closed cleanly.
 *
 * @see https://jestjs.io/docs/configuration#globalteardown-string
 */
import { sequelize } from '../models/index.mjs';

export default async function globalTeardown() {
  if (sequelize && typeof sequelize.close === 'function') {
    await sequelize.close();
  }
}
