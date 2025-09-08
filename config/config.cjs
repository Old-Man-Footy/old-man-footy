/**
 * Sequelize CLI Config Wrapper
 * 
 * This CommonJS file serves as a bridge to import the ES modules config
 * for compatibility with Sequelize CLI, which runs in CommonJS mode.
 */

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: './data/dev-old-man-footy.db',
    logging: false,
    define: {
      underscored: true, // snake_case columns
      freezeTableName: true // disables pluralization; uses the table name defined in the model's 'tableName' property if set
    },
    migrationStorageTableName: 'SequelizeMeta',
    seederStorageTableName: 'SequelizeData'
  },
  test: {
    dialect: 'sqlite',
    storage: './data/test-old-man-footy.db',
    logging: false,
    define: {
      underscored: true,
      freezeTableName: true // disables pluralization; uses the table name defined in the model's 'tableName' property if set
    },
    migrationStorageTableName: 'SequelizeMeta',
    seederStorageTableName: 'SequelizeData'
  },
  e2e: {
    dialect: 'sqlite',
    storage: './data/e2e-old-man-footy.db',
    logging: false,
    define: {
      underscored: true,
      freezeTableName: true // disables pluralization; uses the table name defined in the model's 'tableName' property if set
    },
    migrationStorageTableName: 'SequelizeMeta',
    seederStorageTableName: 'SequelizeData'
  },
  production: {
    dialect: 'sqlite',
    storage: './data/old-man-footy.db',
    logging: false,
    define: {
      underscored: true,
      freezeTableName: true // disables pluralization; uses the table name defined in the model's 'tableName' property if set
    },
    migrationStorageTableName: 'SequelizeMeta',
    seederStorageTableName: 'SequelizeData'
  }
};