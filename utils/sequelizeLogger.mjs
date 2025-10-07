/**
 * Sequelize Logger Utility
 * Handles logging for Sequelize queries to files instead of console
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Ensure logs directory exists
 */
function ensureLogsDirectory() {
  const logsDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  return logsDir;
}

/**
 * Create Sequelize logger function that logs to file
 * @param {string} environment - Current environment (dev, test, production)
 * @returns {Function|boolean} Logger function or false to disable logging
 */
export function createSequelizeLogger(environment) {
  // Only log to file for dev and test environments
  if (environment === 'production') {
    return false;
  }

  const logsDir = ensureLogsDirectory();
  const logFile = path.join(logsDir, `sequelize-${environment}.log`);

  return (msg) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${msg}\n`;
    
    try {
      fs.appendFileSync(logFile, logEntry);
    } catch (error) {
      // If file logging fails, don't crash the app - just skip logging
      console.error('Failed to write Sequelize log:', error.message);
    }
  };
}
