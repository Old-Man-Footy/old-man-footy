/**
 * Models Index - SQLite/Sequelize Implementation
 * 
 * Establishes model relationships and exports all models
 * for the Old Man Footy platform.
 */

const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Club = require('./Club');
const Carnival = require('./Carnival');
const EmailSubscription = require('./EmailSubscription');
const Sponsor = require('./Sponsor');
const ClubSponsor = require('./ClubSponsor');
const CarnivalSponsor = require('./CarnivalSponsor');
const ClubAlternateName = require('./ClubAlternateName');
const CarnivalClub = require('./CarnivalClub');
const SyncLog = require('./SyncLog');

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

// Club has many Alternate Names (one-to-many)
Club.hasMany(ClubAlternateName, {
  foreignKey: 'clubId',
  as: 'alternateNames'
});

// ClubAlternateName belongs to Club (many-to-one)
ClubAlternateName.belongsTo(Club, {
  foreignKey: 'clubId',
  as: 'club'
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

// Carnival and Club many-to-many relationship through CarnivalClub
Carnival.belongsToMany(Club, {
  through: CarnivalClub,
  foreignKey: 'carnivalId',
  otherKey: 'clubId',
  as: 'attendingClubs'
});

Club.belongsToMany(Carnival, {
  through: CarnivalClub,
  foreignKey: 'clubId',
  otherKey: 'carnivalId',
  as: 'attendingCarnivals'
});

// Club and Sponsor many-to-many relationship through ClubSponsor
Club.belongsToMany(Sponsor, {
  through: ClubSponsor,
  foreignKey: 'clubId',
  otherKey: 'sponsorId',
  as: 'sponsors'
});

Sponsor.belongsToMany(Club, {
  through: ClubSponsor,
  foreignKey: 'sponsorId',
  otherKey: 'clubId',
  as: 'clubs'
});

// Carnival and Sponsor many-to-many relationship through CarnivalSponsor
Carnival.belongsToMany(Sponsor, {
  through: CarnivalSponsor,
  foreignKey: 'carnivalId',
  otherKey: 'sponsorId',
  as: 'sponsors'
});

Sponsor.belongsToMany(Carnival, {
  through: CarnivalSponsor,
  foreignKey: 'sponsorId',
  otherKey: 'carnivalId',
  as: 'carnivals'
});

// Direct associations for junction tables
CarnivalClub.belongsTo(Carnival, {
  foreignKey: 'carnivalId',
  as: 'carnival'
});

CarnivalClub.belongsTo(Club, {
  foreignKey: 'clubId',
  as: 'club'
});

ClubSponsor.belongsTo(Club, {
  foreignKey: 'clubId',
  as: 'club'
});

ClubSponsor.belongsTo(Sponsor, {
  foreignKey: 'sponsorId',
  as: 'sponsor'
});

CarnivalSponsor.belongsTo(Carnival, {
  foreignKey: 'carnivalId',
  as: 'carnival'
});

CarnivalSponsor.belongsTo(Sponsor, {
  foreignKey: 'sponsorId',
  as: 'sponsor'
});

Carnival.hasMany(CarnivalClub, {
  foreignKey: 'carnivalId',
  as: 'carnivalClubs'
});

Club.hasMany(CarnivalClub, {
  foreignKey: 'clubId',
  as: 'carnivalClubs'
});

Club.hasMany(ClubSponsor, {
  foreignKey: 'clubId',
  as: 'clubSponsors'
});

Sponsor.hasMany(ClubSponsor, {
  foreignKey: 'sponsorId',
  as: 'clubSponsors'
});

Carnival.hasMany(CarnivalSponsor, {
  foreignKey: 'carnivalId',
  as: 'carnivalSponsors'
});

Sponsor.hasMany(CarnivalSponsor, {
  foreignKey: 'sponsorId',
  as: 'carnivalSponsors'
});

/**
 * Export all models and database instance
 */
module.exports = {
  sequelize,
  User,
  Club,
  Carnival,
  EmailSubscription,
  Sponsor,
  ClubSponsor,
  CarnivalSponsor,
  ClubAlternateName,
  CarnivalClub,
  SyncLog
};