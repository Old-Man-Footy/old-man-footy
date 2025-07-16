// Jest unit tests for ClubSponsor model
import ClubSponsor from '../models/ClubSponsor.mjs';
import Club from '../models/Club.mjs';
import Sponsor from '../models/Sponsor.mjs';
import { sequelize } from '../models/index.mjs';
import { SPONSORSHIP_LEVELS } from '../config/constants.mjs';

describe('ClubSponsor Model', () => {
  let club, sponsor, baseData;
  let createdClubIds = [];
  let createdSponsorIds = [];
  let createdClubSponsorIds = [];

  beforeEach(async () => {
    await sequelize.sync();
    createdClubIds = [];
    createdSponsorIds = [];
    createdClubSponsorIds = [];
    // Create a unique club and sponsor for each test
    club = await Club.create({
      clubName: `Test Club ${Date.now()}-${Math.random()}`,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    createdClubIds.push(club.id);
    sponsor = await Sponsor.create({
      sponsorName: `Test Sponsor ${Date.now()}-${Math.random()}`,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    createdSponsorIds.push(sponsor.id);
    baseData = {
      clubId: club.id,
      sponsorId: sponsor.id,
      sponsorshipLevel: 'Gold',
      startDate: '2020-01-01',
      endDate: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  afterEach(async () => {
    if (createdClubSponsorIds.length) {
      await ClubSponsor.destroy({ where: { id: createdClubSponsorIds } });
    }
    if (createdClubIds.length) {
      await Club.destroy({ where: { id: createdClubIds } });
    }
    if (createdSponsorIds.length) {
      await Sponsor.destroy({ where: { id: createdSponsorIds } });
    }
  });

  describe('getSponsorDetails', () => {
    it('returns the sponsor instance', async () => {
      const cs = await ClubSponsor.create(baseData);
      createdClubSponsorIds.push(cs.id);
      const result = await cs.getSponsorDetails();
      expect(result).toBeDefined();
      expect(result.id).toBe(sponsor.id);
    });
  });

  describe('getClubDetails', () => {
    it('returns the club instance', async () => {
      const cs = await ClubSponsor.create(baseData);
      createdClubSponsorIds.push(cs.id);
      const result = await cs.getClubDetails();
      expect(result).toBeDefined();
      expect(result.id).toBe(club.id);
    });
  });

  describe('isActiveRelationship', () => {
    it('returns true if active and no endDate', async () => {
      const cs = await ClubSponsor.create(baseData);
      createdClubSponsorIds.push(cs.id);
      expect(cs.isActiveRelationship()).toBe(true);
    });
    it('returns false if not active', async () => {
      const cs = await ClubSponsor.create({ ...baseData, isActive: false });
      createdClubSponsorIds.push(cs.id);
      expect(cs.isActiveRelationship()).toBe(false);
    });
    it('returns false if endDate is in the past', async () => {
      const cs = await ClubSponsor.create({ ...baseData, endDate: '2020-01-02' });
      createdClubSponsorIds.push(cs.id);
      expect(cs.isActiveRelationship()).toBe(false);
    });
    it('returns true if endDate is in the future', async () => {
      const future = new Date();
      future.setDate(future.getDate() + 10);
      const cs = await ClubSponsor.create({ ...baseData, endDate: future.toISOString().slice(0, 10) });
      createdClubSponsorIds.push(cs.id);
      expect(cs.isActiveRelationship()).toBe(true);
    });
  });

  describe('getActiveForClub', () => {
    it('returns sorted active relationships for a club', async () => {
      const sponsor1 = await Sponsor.create({ sponsorName: `Sponsor1-${Date.now()}-${Math.random()}`, isActive: true, createdAt: new Date(), updatedAt: new Date() });
      const sponsor2 = await Sponsor.create({ sponsorName: `Sponsor2-${Date.now()}-${Math.random()}`, isActive: true, createdAt: new Date(), updatedAt: new Date() });
      const sponsor3 = await Sponsor.create({ sponsorName: `Sponsor3-${Date.now()}-${Math.random()}`, isActive: true, createdAt: new Date(), updatedAt: new Date() });
      await ClubSponsor.create({ ...baseData, sponsorId: sponsor1.id, sponsorshipLevel: SPONSORSHIP_LEVELS.GOLD, displayOrder: 2, startDate: '2022-01-01' });
      await ClubSponsor.create({ ...baseData, sponsorId: sponsor2.id, sponsorshipLevel: SPONSORSHIP_LEVELS.SILVER, displayOrder: 1, startDate: '2023-01-02' });
      await ClubSponsor.create({ ...baseData, sponsorId: sponsor3.id, sponsorshipLevel: SPONSORSHIP_LEVELS.BRONZE, displayOrder: 3, startDate: '2021-01-03' });
      const results = await ClubSponsor.getActiveForClub(club.id);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(3);
      const levels = results.map(r => r.sponsorshipLevel);
      expect(levels).toEqual(expect.arrayContaining([SPONSORSHIP_LEVELS.GOLD, SPONSORSHIP_LEVELS.SILVER, SPONSORSHIP_LEVELS.BRONZE]));
    });
  });

  describe('getActiveForSponsor', () => {
    it('returns active relationships for a sponsor', async () => {
      const club1 = await Club.create({ clubName: `Club1-${Date.now()}-${Math.random()}`, isActive: true, createdAt: new Date(), updatedAt: new Date() });
      const club2 = await Club.create({ clubName: `Club2-${Date.now()}-${Math.random()}`, isActive: true, createdAt: new Date(), updatedAt: new Date() });
      await ClubSponsor.create({ ...baseData, clubId: club1.id, startDate: '2022-01-01' });
      await ClubSponsor.create({ ...baseData, clubId: club2.id, startDate: '2023-01-02' });
      const results = await ClubSponsor.getActiveForSponsor(sponsor.id);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results[0].sponsorId).toBe(sponsor.id);
    });
  });

  describe('validation', () => {
    it('throws for endDate before startDate', async () => {
      await expect(
        ClubSponsor.create({ ...baseData, startDate: '2022-01-01', endDate: '2021-01-01' })
      ).rejects.toThrow('End date must be after start date');
    });
    it('throws for negative sponsorshipValue', async () => {
      await expect(
        ClubSponsor.create({ ...baseData, sponsorshipValue: -100 })
      ).rejects.toThrow();
    });
    it('throws for too long contractDetails', async () => {
      await expect(
        ClubSponsor.create({ ...baseData, contractDetails: 'a'.repeat(501) })
      ).rejects.toThrow();
    });
    it('throws for too long notes', async () => {
      await expect(
        ClubSponsor.create({ ...baseData, notes: 'a'.repeat(1001) })
      ).rejects.toThrow();
    });
  });
});
