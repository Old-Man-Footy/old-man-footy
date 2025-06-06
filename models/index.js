/**
 * Models Index - SQLite/Sequelize Implementation
 * 
 * Establishes model relationships and exports all models
 * for the Rugby League Masters platform.
 */

const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Club = require('./Club');
const Carnival = require('./Carnival');
const EmailSubscription = require('./EmailSubscription');

/**
 * Define model associations/relationships
 */

// User belongs to Club (many-to-one)
User.belongsTo(Club, {
  foreignKey: 'clubId',
  as: 'club'
});

// Club has many Users (one-to-many)
Club.hasMany(User, {
  foreignKey: 'clubId',
  as: 'delegates'
});

// Carnival belongs to User (creator) (many-to-one)
Carnival.belongsTo(User, {
  foreignKey: 'createdByUserId',
  as: 'creator'
});

// User has many Carnivals (one-to-many)
User.hasMany(Carnival, {
  foreignKey: 'createdByUserId',
  as: 'carnivals'
});

/**
 * Export all models and database instance
 */
module.exports = {
  sequelize,
  User,
  Club,
  Carnival,
  EmailSubscription
};