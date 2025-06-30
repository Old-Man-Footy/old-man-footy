// Jest unit tests for ClubAlternateName model
import { jest } from '@jest/globals';
import ClubAlternateName from '../models/ClubAlternateName.mjs';
import Club from '../models/Club.mjs';
import { sequelize } from '../models/index.mjs';

/**
 * Unit tests for ClubAlternateName model
 * Covers: getClub, isUniqueForClub, getByClubId, searchClubsByAlternateName
 */
describe('ClubAlternateName Model', () => {
  let club, altName1, altName2;
  beforeEach(async () => {
    await sequelize.sync({ force: true });
    club = await Club.create({
      clubName: 'Test Club',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    altName1 = await ClubAlternateName.create({
      clubId: club.id,
      alternateName: 'Warriors',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    altName2 = await ClubAlternateName.create({
      clubId: club.id,
      alternateName: 'The Warriors',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterEach(async () => {
    await sequelize.truncate({ cascade: true });
  });

  describe('getClub', () => {
    it('should return the associated club', async () => {
      const result = await altName1.getClub();
      expect(result).toBeDefined();
      expect(result.id).toBe(club.id);
    });
  });

  describe('isUniqueForClub', () => {
    it('should return false if alternate name exists for club', async () => {
      const result = await ClubAlternateName.isUniqueForClub('Warriors', club.id);
      expect(result).toBe(false);
    });
    it('should return true if alternate name does not exist for club', async () => {
      const result = await ClubAlternateName.isUniqueForClub('New Name', club.id);
      expect(result).toBe(true);
    });
    it('should return true if alternate name exists but excluded by id', async () => {
      const result = await ClubAlternateName.isUniqueForClub('Warriors', club.id, altName1.id);
      expect(result).toBe(true);
    });
  });

  describe('getByClubId', () => {
    it('should return all alternate names for a club', async () => {
      const results = await ClubAlternateName.getByClubId(club.id);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
      expect(results[0].clubId).toBe(club.id);
    });
  });

  describe('searchClubsByAlternateName', () => {
    it('should return club IDs matching the search term', async () => {
      const results = await ClubAlternateName.searchClubsByAlternateName('warriors');
      expect(Array.isArray(results)).toBe(true);
      expect(results).toContain(club.id);
    });
    it('should return an empty array if no match', async () => {
      const results = await ClubAlternateName.searchClubsByAlternateName('nonexistent');
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });
});
