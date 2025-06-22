/**
 * Models Index - Central Model Management
 * 
 * Manages all Sequelize models and their associations for the Old Man Footy platform.
 * This file is responsible for importing all models and defining their relationships.
 */

import { sequelize } from '../config/database.mjs';

// Import all models
import User from './User.mjs';
import Club from './Club.mjs';
import ClubAlternateName from './ClubAlternateName.mjs';
import ClubPlayer from './ClubPlayer.mjs';
import ClubSponsor from './ClubSponsor.mjs';
import Carnival from './Carnival.mjs';
import CarnivalClub from './CarnivalClub.mjs';
import CarnivalClubPlayer from './CarnivalClubPlayer.mjs';
import CarnivalSponsor from './CarnivalSponsor.mjs';
import Sponsor from './Sponsor.mjs';
import EmailSubscription from './EmailSubscription.mjs';
import AuditLog from './AuditLog.mjs';
import SyncLog from './SyncLog.mjs';

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

// Club has many Players (one-to-many)
Club.hasMany(ClubPlayer, {
  foreignKey: 'clubId',
  as: 'players'
});

// ClubPlayer belongs to Club (many-to-one)
ClubPlayer.belongsTo(Club, {
  foreignKey: 'clubId',
  as: 'club'
});

// CarnivalClubPlayer associations
CarnivalClubPlayer.belongsTo(CarnivalClub, {
  foreignKey: 'carnivalClubId',
  as: 'carnivalClub'
});

CarnivalClubPlayer.belongsTo(ClubPlayer, {
  foreignKey: 'clubPlayerId',
  as: 'clubPlayer'
});

CarnivalClub.hasMany(CarnivalClubPlayer, {
  foreignKey: 'carnivalClubId',
  as: 'playerAssignments'
});

ClubPlayer.hasMany(CarnivalClubPlayer, {
  foreignKey: 'clubPlayerId',
  as: 'carnivalAssignments'
});

// AuditLog belongs to User (many-to-one)
AuditLog.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// User has many AuditLogs (one-to-many)
User.hasMany(AuditLog, {
  foreignKey: 'userId',
  as: 'auditLogs'
});

// Register hostClub association for Carnival (hosting club, not attendees)
Carnival.belongsTo(Club, {
  foreignKey: 'clubId',
  as: 'hostClub'
});

// Export all models and sequelize instance
export {
  sequelize,
  User,
  Club,
  ClubAlternateName,
  ClubPlayer,
  ClubSponsor,
  Carnival,
  CarnivalClub,
  CarnivalClubPlayer,
  CarnivalSponsor,
  Sponsor,
  EmailSubscription,
  AuditLog,
  SyncLog
};