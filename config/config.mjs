/**
 * Application Configuration (ESM)
 * Centralized configuration management following ES modules pattern
 * Reads from environment variables set by dotenv or deployment environment
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load environment-specific .env file based on NODE_ENV
 * This replaces the manual .env file reading
 */
export const setEnvironmentVariables = async () => {
  const env = process.env.NODE_ENV || 'development';
  
  try {
    // Use dynamic import to load dotenv only when needed
    const { config } = await import('dotenv');
    
    // Load environment-specific .env file
    const envFile = `.env.${env}`;
    const result = config({ path: envFile });
    
    if (result.error) {
      console.log(`📝 No ${envFile} file found - using system environment variables`);
    } else {
      console.log(`✅ Configuration loaded from ${envFile}`);
    }
  } catch (error) {
    console.log('📝 Using system environment variables only');
  }
};

/**
 * Get current environment
 * @returns {string} Current environment (development, test, production)
 */
const getEnvironment = () => {
  return process.env.NODE_ENV || 'development';
};

/**
 * Get a required environment variable with validation
 * @param {string} key - The environment variable key
 * @param {string} fallback - Fallback value for development/test only
 * @param {boolean} required - Whether this variable is required in production
 * @returns {string} The environment variable value
 */
const getEnvVar = (key, fallback = null, required = true) => {
  const env = getEnvironment();
  const value = process.env[key] || fallback;
  
  if (!value && required && env === 'production') {
    throw new Error(`Required environment variable ${key} is not set in production`);
  }
  
  if (!value && required && env !== 'test') {
    console.warn(`⚠️  Warning: Environment variable ${key} is not set`);
  }
  
  return value;
};

/**
 * Parse boolean environment variable
 * @param {string} key - Environment variable key
 * @param {boolean} defaultValue - Default value if not set
 * @returns {boolean} Parsed boolean value
 */
const getBooleanEnv = (key, defaultValue = false) => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
};

/**
 * Parse integer environment variable
 * @param {string} key - Environment variable key
 * @param {number} defaultValue - Default value if not set
 * @returns {number} Parsed integer value
 */
const getIntEnv = (key, defaultValue = 0) => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Application Configuration - Reads from Environment Variables
 */
export const getCurrentConfig = () => {
  const env = getEnvironment();
  
  return {
    // Application Settings
    nodeEnv: env,
    port: getIntEnv('PORT', env === 'production' ? 3060 : 3050),
    baseUrl: getEnvVar('APP_URL', env === 'production' ? null : 'http://localhost:3050'),
    appName: getEnvVar('APP_NAME', 'Old Man Footy'),
    
    // Security Settings
    security: {
      sessionSecret: getEnvVar('SESSION_SECRET', 
        env === 'test' ? 'test-session-secret-32-characters-min' : 'dev-session-secret-change-in-production-min-32-chars',
        true
      ),
      csrfSecret: getEnvVar('CSRF_SECRET', null, false),
      encryptionKey: getEnvVar('ENCRYPTION_KEY', null, false),
      jwtSecret: getEnvVar('JWT_SECRET', null, false)
    },
    
    // Database Settings
    database: {
      // username: getEnvVar('DATABASE_USERNAME', null, false),
      // password: getEnvVar('DATABASE_PASSWORD', null, false),
      url: getEnvVar('DATABASE_URL', `sqlite:./data/${env === 'test' ? 'test-' : env === 'development' ? 'dev-' : ''}old-man-footy.db`)
    },
    
    // Email Settings
    email: {
      serviceUser: getEnvVar('EMAIL_USER', null, false),
      servicePassword: getEnvVar('EMAIL_PASSWORD', null, false),
      serviceFrom: getEnvVar('EMAIL_FROM', null, false),
      serviceApiKey: getEnvVar('EMAIL_API_KEY', null, false)
    },

    // MySideline Integration
    mysideline: {
      url: getEnvVar('MYSIDELINE_URL', 'https://profile.mysideline.com.au/register/clubsearch/?criteria=Masters&source=rugby-league'),
      eventUrl: getEnvVar('MYSIDELINE_EVENT_URL', 'https://profile.mysideline.com.au/register/clubsearch/?source=rugby-league&entityType=team&isEntityIdSearch=true&entity=true&criteria='),
      syncEnabled: getBooleanEnv('MYSIDELINE_SYNC_ENABLED', env !== 'test'),
      enableScraping: getBooleanEnv('MYSIDELINE_ENABLE_SCRAPING', env !== 'test'),
      requestTimeout: getIntEnv('MYSIDELINE_REQUEST_TIMEOUT', 10000),
      retryAttempts: getIntEnv('MYSIDELINE_RETRY_ATTEMPTS', 3)
    },

    // Feature Flags
    features: {
      emailNotifications: getBooleanEnv('FEATURE_EMAIL_NOTIFICATIONS', true),
      mysidelineSync: getBooleanEnv('FEATURE_MYSIDELINE_SYNC', env !== 'test'),
      fileUploads: getBooleanEnv('FEATURE_FILE_UPLOADS', true),
      adminStats: getBooleanEnv('FEATURE_ADMIN_STATS', true),
      maintenanceMode: getBooleanEnv('FEATURE_MAINTENANCE_MODE', false),
      comingSoonMode: getBooleanEnv('FEATURE_COMING_SOON_MODE', false)
    },

    // CORS Settings
    cors: {
      allowedOrigins: getEnvVar('ALLOWED_ORIGINS', 'http://localhost:3050').split(',').map(origin => origin.trim())
    },

    // File Upload Configuration
    upload: {
      path: getEnvVar('UPLOAD_PATH', './uploads'),
      maxFileSize: getIntEnv('MAX_FILE_SIZE', 5242880), // 5MB default
      allowedFileTypes: getEnvVar('ALLOWED_FILE_TYPES', 
        'image/jpeg,image/png,image/gif,image/svg+xml,image/webp,application/pdf'
      ).split(',').map(type => type.trim())
    },

    // Logging Configuration
    logging: {
      level: getEnvVar('LOG_LEVEL', env === 'production' ? 'info' : 'debug'),
      format: getEnvVar('LOG_FORMAT', env === 'production' ? 'json' : 'combined')
    },

    // Rate Limiting
    rateLimit: {
      windowMs: getIntEnv('RATE_LIMIT_WINDOW', 900000), // 15 minutes
      max: getIntEnv('RATE_LIMIT_MAX', env === 'production' ? 100 : 1000)
    },

    // Compression
    compression: {
      enabled: getBooleanEnv('COMPRESSION_ENABLED', env === 'production')
    },

    // Health Checks
    healthCheck: {
      enabled: getBooleanEnv('HEALTH_CHECK_ENABLED', true),
      path: getEnvVar('HEALTH_CHECK_PATH', '/health'),
      readyPath: getEnvVar('READY_CHECK_PATH', '/ready')
    },

    // Timezone
    timezone: getEnvVar('TZ', 'Australia/Sydney')
  };
};

/**
 * Database Configuration for Sequelize
 */
export const getCurrentDatabaseConfig = () => {
  const env = getEnvironment();
  
  const baseConfig = {
    dialect: 'sqlite',
    logging: env === 'test' || env === 'e2e' ? false : env === 'development' ? console.log : false,
    define: {
      freezeTableName: true,
      timestamps: true
    }
  };

  // Set storage path based on environment
  const storagePath = {
    development: path.join(__dirname, '..', 'data', 'dev-old-man-footy.db'),
    test: path.join(__dirname, '..', 'data', 'test-old-man-footy.db'),
    e2e: path.join(__dirname, '..', 'data', 'e2e-old-man-footy.db'),
    production: path.join(__dirname, '..', 'data', 'old-man-footy.db')
  };

  return {
    ...baseConfig,
    storage: storagePath[env] || storagePath.development
  };
};

/**
 * Export database configurations for Sequelize CLI compatibility
 */
export const databaseConfig = {
  development: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'data', 'dev-old-man-footy.db'),
    logging: console.log,
    define: {
      freezeTableName: true,
      timestamps: true
    }
  },
  test: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'data', 'test-old-man-footy.db'),
    logging: false,
    define: {
      freezeTableName: true,
      timestamps: true
    }
  },
  e2e: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'data', 'e2e-old-man-footy.db'),
    logging: false,
    define: {
      freezeTableName: true,
      timestamps: true
    }
  },
  production: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'data', 'old-man-footy.db'),
    logging: false,
    define: {
      freezeTableName: true,
      timestamps: true
    }
  }
};

// Export default for Sequelize CLI
export default databaseConfig;