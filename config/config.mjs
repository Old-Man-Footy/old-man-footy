// filepath: c:\Users\devon\source\repos\NRL Masters\config\config.js
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
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
    logging: console.log,
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