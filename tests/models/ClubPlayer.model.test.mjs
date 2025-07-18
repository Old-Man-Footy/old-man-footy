// Vitest unit tests for ClubPlayer model
import { describe, test, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ClubPlayer from '../../models/ClubPlayer.mjs';
import Club from '../../models/Club.mjs';
import { sequelize } from '../../models/index.mjs';

describe('ClubPlayer Model', () => {
  let baseData;
  let createdClubIds = [];
  let createdPlayerIds = [];

  beforeEach(async () => {
    await sequelize.sync();
    createdClubIds = [];
    createdPlayerIds = [];
    // Create a unique club for each test
    const club = await Club.create({
      clubName: `Test Club ${Date.now()}-${Math.random()}`,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    createdClubIds.push(club.id);
    baseData = {
      clubId: club.id,
      firstName: 'john',
      lastName: 'doe',
      dateOfBirth: '1980-06-30',
      email: 'TEST@EXAMPLE.COM',
      isActive: true,
      shorts: 'Unrestricted',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  afterEach(async () => {
    if (createdPlayerIds.length) {
      await ClubPlayer.destroy({ where: { id: createdPlayerIds } });
    }
    if (createdClubIds.length) {
      await Club.destroy({ where: { id: createdClubIds } });
    }
  });

  describe('getFullName', () => {
    it('returns full name', async () => {
      const player = await ClubPlayer.create(baseData);
      createdPlayerIds.push(player.id);
      expect(player.getFullName()).toBe('John Doe');
    });
  });

  describe('getAge', () => {
    it('returns correct age for birthday today', async () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 40);
      const player = await ClubPlayer.create({ ...baseData, dateOfBirth: dob.toISOString().slice(0, 10) });
      createdPlayerIds.push(player.id);
      expect(player.getAge()).toBe(40);
    });
  });

  describe('isMastersEligible', () => {
    it('returns true if age >= 35', async () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 36);
      const player = await ClubPlayer.create({ ...baseData, dateOfBirth: dob.toISOString().slice(0, 10) });
      createdPlayerIds.push(player.id);
      expect(player.isMastersEligible()).toBe(true);
    });
    it('returns false if age < 35', async () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 30);
      const player = await ClubPlayer.create({ ...baseData, dateOfBirth: dob.toISOString().slice(0, 10) });
      createdPlayerIds.push(player.id);
      expect(player.isMastersEligible()).toBe(false);
    });
  });

  describe('getInitials', () => {
    it('returns initials for normal names', async () => {
      const player = await ClubPlayer.create(baseData);
      createdPlayerIds.push(player.id);
      expect(player.getInitials()).toBe('J.D.');
    });
  });

  describe('field normalization', () => {
    it('capitalizes and trims first/last name, lowercases email', async () => {
      const player = await ClubPlayer.create({
        ...baseData,
        firstName: '  alice ',
        lastName: ' SMITH ',
        email: '  Alice@Email.COM  ',
      });
      createdPlayerIds.push(player.id);
      expect(player.firstName).toBe('Alice');
      expect(player.lastName).toBe('Smith');
      expect(player.email).toBe('alice@email.com');
    });
  });

  describe('validation', () => {
    it('throws for missing firstName', async () => {
      await expect(ClubPlayer.create({ ...baseData, firstName: null }))
        .rejects.toThrow(/First name is required|notNull Violation/);
    });
    it('throws for missing lastName', async () => {
      await expect(ClubPlayer.create({ ...baseData, lastName: null }))
        .rejects.toThrow(/Last name is required|notNull Violation/);
    });
    it('throws for missing dateOfBirth', async () => {
      await expect(ClubPlayer.create({ ...baseData, dateOfBirth: null }))
        .rejects.toThrow(/Date of birth is required|notNull Violation/);
    });
    it('throws for missing email', async () => {
      await expect(ClubPlayer.create({ ...baseData, email: null }))
        .rejects.toThrow(/Email is required|notNull Violation/);
    });
    it('throws for future DOB', async () => {
      const future = new Date();
      future.setDate(future.getDate() + 1);
      await expect(ClubPlayer.create({ ...baseData, dateOfBirth: future.toISOString().slice(0, 10) }))
        .rejects.toThrow('Date of birth cannot be in the future');
    });
    it('throws for too young', async () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 10);
      await expect(ClubPlayer.create({ ...baseData, dateOfBirth: dob.toISOString().slice(0, 10) }))
        .rejects.toThrow('Player must be between 16 and 100 years old');
    });
    it('throws for too old', async () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 101);
      await expect(ClubPlayer.create({ ...baseData, dateOfBirth: dob.toISOString().slice(0, 10) }))
        .rejects.toThrow('Player must be between 16 and 100 years old');
    });
    it('throws for invalid email', async () => {
      await expect(ClubPlayer.create({ ...baseData, email: 'not-an-email' }))
        .rejects.toThrow('Email must be a valid email address');
    });
    it('throws for invalid shorts', async () => {
      await expect(ClubPlayer.create({ ...baseData, shorts: 'Purple' }))
        .rejects.toThrow('Shorts must be one of: Unrestricted, Red, Yellow, Blue, Green');
    });
  });
});
