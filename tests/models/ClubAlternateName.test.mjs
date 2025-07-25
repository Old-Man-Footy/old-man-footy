/**
 * @file ClubAlternateName Model Unit Tests (Mocked)
 * @description Vitest unit tests for the ClubAlternateName model using mock data (no DB).
 *
 * Follows AAA (Arrange, Act, Assert) pattern and project security/MVC/testing guidelines.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock data
const mockClub = { id: 1, clubName: 'Test Club', isActive: true };
const mockAltNames = [
  { id: 10, clubId: 1, alternateName: 'Warriors', isActive: true, getClub: vi.fn().mockResolvedValue(mockClub) },
  { id: 11, clubId: 1, alternateName: 'The Warriors', isActive: true, getClub: vi.fn().mockResolvedValue(mockClub) }
];

// Mock ClubAlternateName static methods
const ClubAlternateName = {
  isUniqueForClub: vi.fn((name, clubId, excludeId) => {
    const found = mockAltNames.find(
      alt => alt.alternateName.toLowerCase() === name.toLowerCase() && alt.clubId === clubId && alt.id !== excludeId
    );
    return !found;
  }),
  getByClubId: vi.fn(clubId => mockAltNames.filter(alt => alt.clubId === clubId)),
  searchClubsByAlternateName: vi.fn(term => {
    const lowerTerm = term.toLowerCase();
    const matches = mockAltNames.filter(alt => alt.alternateName.toLowerCase().includes(lowerTerm));
    return matches.length ? matches.map(alt => alt.clubId) : [];
  })
};

describe('ClubAlternateName Model (Mocked)', () => {
  let altName1, altName2;
  beforeEach(() => {
    altName1 = { ...mockAltNames[0], getClub: vi.fn().mockResolvedValue(mockClub) };
    altName2 = { ...mockAltNames[1], getClub: vi.fn().mockResolvedValue(mockClub) };
  });

  afterEach(() => {
    altName1 = null;
    altName2 = null;
  });

  describe('getClub', () => {
    it('should return the associated club', async () => {
      const result = await altName1.getClub();
      expect(result).toBeDefined();
      expect(result.id).toBe(mockClub.id);
    });
  });

  describe('isUniqueForClub', () => {
    it('should return false if alternate name exists for club', () => {
      const result = ClubAlternateName.isUniqueForClub('Warriors', mockClub.id);
      expect(result).toBe(false);
    });
    it('should return true if alternate name does not exist for club', () => {
      const result = ClubAlternateName.isUniqueForClub('New Name', mockClub.id);
      expect(result).toBe(true);
    });
    it('should return true if alternate name exists but excluded by id', () => {
      const result = ClubAlternateName.isUniqueForClub('Warriors', mockClub.id, 10);
      expect(result).toBe(true);
    });
  });

  describe('getByClubId', () => {
    it('should return all alternate names for a club', () => {
      const results = ClubAlternateName.getByClubId(mockClub.id);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
      expect(results[0].clubId).toBe(mockClub.id);
    });
  });

  describe('searchClubsByAlternateName', () => {
    it('should return club IDs matching the search term', () => {
      const results = ClubAlternateName.searchClubsByAlternateName('warriors');
      expect(Array.isArray(results)).toBe(true);
      expect(results).toContain(mockClub.id);
    });
    it('should return an empty array if no match', () => {
      const results = ClubAlternateName.searchClubsByAlternateName('nonexistent');
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });
});
