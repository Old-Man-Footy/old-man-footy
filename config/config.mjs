// filepath: c:\Users\devon\source\repos\NRL Masters\config\config.js
const path = require('path');

module.exports = {
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