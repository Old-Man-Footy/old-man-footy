/**
 * Sequelize CLI Config Wrapper
 * 
 * This CommonJS file serves as a bridge to import the ES modules config
 * for compatibility with Sequelize CLI, which runs in CommonJS mode.
 */

module.exports = (async () => {
  try {
    // Dynamically import the ES modules config
    const configModule = await import('./config.mjs');
    return configModule.default;
  } catch (error) {
    console.error('Error loading ES modules config:', error);
    throw error;
  }
})();