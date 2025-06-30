// Jest unit tests for Club model
import { jest } from '@jest/globals';
import Club from '../models/Club.mjs';
import { sequelize } from '../models/index.mjs';

// Mock User, Carnival, CarnivalClub for isolation
describe('Club Model', () => {
  let club;
  beforeEach(async () => {
    // Clean up and create a test club
    await sequelize.sync({ force: true });
    club = await Club.create({
      clubName: 'Test Club',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterEach(async () => {
    await sequelize.truncate({ cascade: true });
  });

  describe('getDelegates', () => {
    it('should return an array (mocked)', async () => {
      // Mock User.findAll
      const mockDelegates = [{ id: 1, isPrimaryDelegate: true, firstName: 'A' }];
      jest.unstable_mockModule('../models/index.mjs', () => ({
        User: { findAll: jest.fn().mockResolvedValue(mockDelegates) }
      }));
      const result = await club.getDelegates();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getPrimaryDelegate', () => {
    it('should return a user or null (mocked)', async () => {
      const mockUser = { id: 2, isPrimaryDelegate: true };
      jest.unstable_mockModule('../models/index.mjs', () => ({
        User: { findOne: jest.fn().mockResolvedValue(mockUser) }
      }));
      const result = await club.getPrimaryDelegate();
      expect(result).toBeDefined();
      expect(result.id).toBe(2);
    });
  });

  describe('getCarnivalCount', () => {
    it('should return a number (mocked)', async () => {
      jest.unstable_mockModule('../models/index.mjs', () => ({
        Carnival: { findAll: jest.fn().mockResolvedValue([{ id: 1 }]) },
        CarnivalClub: { findAll: jest.fn().mockResolvedValue([{ carnival: { id: 2 } }]) }
      }));
      club.getDelegateIds = jest.fn().mockResolvedValue([1]);
      const count = await club.getCarnivalCount();
      expect(typeof count).toBe('number');
      expect(count).toBe(2);
    });
  });

  describe('getDelegateIds', () => {
    it('should return an array of ids', async () => {
      club.getDelegates = jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const ids = await club.getDelegateIds();
      expect(ids).toEqual([1, 2]);
    });
  });

  describe('isUnclaimed', () => {
    it('should return true if createdByProxy and no delegates', async () => {
      club.createdByProxy = true;
      club.getDelegates = jest.fn().mockResolvedValue([]);
      const result = await club.isUnclaimed();
      expect(result).toBe(true);
    });
    it('should return false if not createdByProxy', async () => {
      club.createdByProxy = false;
      const result = await club.isUnclaimed();
      expect(result).toBe(false);
    });
  });

  describe('getProxyCreator', () => {
    it('should return user if createdByUserId is set (mocked)', async () => {
      club.createdByUserId = 5;
      jest.unstable_mockModule('../models/index.mjs', () => ({
        User: { findByPk: jest.fn().mockResolvedValue({ id: 5 }) }
      }));
      const result = await club.getProxyCreator();
      expect(result).toBeDefined();
      expect(result.id).toBe(5);
    });
    it('should return null if createdByUserId is not set', async () => {
      club.createdByUserId = null;
      const result = await club.getProxyCreator();
      expect(result).toBeNull();
    });
  });

  describe('canUserClaim', () => {
    it('should return true if user can claim', async () => {
      club.createdByProxy = true;
      club.inviteEmail = 'test@example.com';
      club.getDelegates = jest.fn().mockResolvedValue([]);
      const user = { email: 'test@example.com' };
      const result = await club.canUserClaim(user);
      expect(result).toBe(true);
    });
    it('should return false if user email does not match', async () => {
      club.createdByProxy = true;
      club.inviteEmail = 'test@example.com';
      club.getDelegates = jest.fn().mockResolvedValue([]);
      const user = { email: 'other@example.com' };
      const result = await club.canUserClaim(user);
      expect(result).toBe(false);
    });
    it('should return false if club is not unclaimed', async () => {
      club.createdByProxy = false;
      club.inviteEmail = 'test@example.com';
      club.getDelegates = jest.fn().mockResolvedValue([{}]);
      const user = { email: 'test@example.com' };
      const result = await club.canUserClaim(user);
      expect(result).toBe(false);
    });
  });
});
