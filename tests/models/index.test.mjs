/**
 * @file models/index.test.mjs
 * @description Unit tests for models/index.mjs - Sequelize model registration and associations.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
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
} from '/models/index.mjs';

describe('models/index.mjs', () => {
  beforeAll(async () => {
    // Ensure models are synced for association tests
    await sequelize.sync({ force: true });
  });

  it('should export all models and sequelize instance', () => {
    expect(sequelize).toBeDefined();
    expect(User).toBeDefined();
    expect(Club).toBeDefined();
    expect(ClubAlternateName).toBeDefined();
    expect(ClubPlayer).toBeDefined();
    expect(ClubSponsor).toBeDefined();
    expect(Carnival).toBeDefined();
    expect(CarnivalClub).toBeDefined();
    expect(CarnivalClubPlayer).toBeDefined();
    expect(CarnivalSponsor).toBeDefined();
    expect(Sponsor).toBeDefined();
    expect(EmailSubscription).toBeDefined();
    expect(AuditLog).toBeDefined();
    expect(SyncLog).toBeDefined();
  });

  it('should define Club/User associations', () => {
    expect(User.associations.club).toBeDefined();
    expect(Club.associations.delegates).toBeDefined();
  });

  it('should define Club/ClubAlternateName associations', () => {
    expect(Club.associations.alternateNames).toBeDefined();
    expect(ClubAlternateName.associations.parentClub).toBeDefined();
  });

  it('should define Carnival/User associations', () => {
    expect(Carnival.associations.creator).toBeDefined();
    expect(User.associations.carnivals).toBeDefined();
  });

  it('should define Carnival/Club many-to-many associations', () => {
    expect(Carnival.associations.attendingClubs).toBeDefined();
    expect(Club.associations.attendingCarnivals).toBeDefined();
  });

  it('should define Club/Sponsor many-to-many associations', () => {
    expect(Club.associations.sponsors).toBeDefined();
    expect(Sponsor.associations.clubs).toBeDefined();
  });

  it('should define Carnival/Sponsor many-to-many associations', () => {
    expect(Carnival.associations.sponsors).toBeDefined();
    expect(Sponsor.associations.carnivals).toBeDefined();
  });

  it('should define direct associations for junction tables', () => {
    expect(CarnivalClub.associations.carnival).toBeDefined();
    expect(CarnivalClub.associations.participatingClub).toBeDefined();
    expect(ClubSponsor.associations.sponsoredClub).toBeDefined();
    expect(ClubSponsor.associations.sponsor).toBeDefined();
    expect(CarnivalSponsor.associations.carnival).toBeDefined();
    expect(CarnivalSponsor.associations.sponsor).toBeDefined();
  });

  it('should define Club/ClubPlayer associations', () => {
    expect(Club.associations.players).toBeDefined();
    expect(ClubPlayer.associations.playerClub).toBeDefined();
  });

  it('should define CarnivalClubPlayer associations', () => {
    expect(CarnivalClubPlayer.associations.carnivalClub).toBeDefined();
    expect(CarnivalClubPlayer.associations.clubPlayer).toBeDefined();
    expect(CarnivalClub.associations.playerAssignments).toBeDefined();
    expect(ClubPlayer.associations.carnivalAssignments).toBeDefined();
  });

  it('should define AuditLog/User associations', () => {
    expect(AuditLog.associations.user).toBeDefined();
    expect(User.associations.auditLogs).toBeDefined();
  });

  it('should define Carnival hostClub association', () => {
    expect(Carnival.associations.hostClub).toBeDefined();
  });
});