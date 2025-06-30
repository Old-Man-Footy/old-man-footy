// Jest unit tests for CarnivalClub model
import { jest } from '@jest/globals';
import CarnivalClub, { updateCarnivalRegistrationCount } from '../models/CarnivalClub.mjs';
import Carnival from '../models/Carnival.mjs';
import Club from '../models/Club.mjs';
import { sequelize } from '../models/index.mjs';

describe('CarnivalClub Model', () => {
  describe('Instance methods', () => {
    let carnival, club, carnivalClub;
    beforeEach(async () => {
      carnival = await Carnival.create({ title: 'Test Carnival', isActive: true });
      club = await Club.create({ clubName: 'Test Club', isActive: true });
      carnivalClub = await CarnivalClub.create({
        carnivalId: carnival.id,
        clubId: club.id,
        approvalStatus: 'approved',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should get carnival details', async () => {
      const result = await carnivalClub.getCarnivalDetails();
      expect(result).toBeDefined();
      expect(result.id).toBe(carnival.id);
    });

    it('should get club details', async () => {
      const result = await carnivalClub.getClubDetails();
      expect(result).toBeDefined();
      expect(result.id).toBe(club.id);
    });

    it('should check if relationship is active', () => {
      expect(carnivalClub.isActiveRelationship()).toBe(true);
    });

    it('should check if registration is approved', () => {
      expect(carnivalClub.isApproved()).toBe(true);
      expect(carnivalClub.isPending()).toBe(false);
      expect(carnivalClub.isRejected()).toBe(false);
    });
  });

  describe('Static methods', () => {
    let carnival, club;
    beforeEach(async () => {
      carnival = await Carnival.create({ title: 'Static Carnival', isActive: true });
      club = await Club.create({ clubName: 'Static Club', isActive: true });
      await CarnivalClub.create({
        carnivalId: carnival.id,
        clubId: club.id,
        approvalStatus: 'approved',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should get active relationships for a carnival', async () => {
      const results = await CarnivalClub.getActiveForCarnival(carnival.id);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].carnivalId).toBe(carnival.id);
    });

    it('should get active relationships for a club', async () => {
      const results = await CarnivalClub.getActiveForClub(club.id);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].clubId).toBe(club.id);
    });

    it('should check if a club is registered for a carnival', async () => {
      const isRegistered = await CarnivalClub.isClubRegistered(carnival.id, club.id);
      expect(isRegistered).toBe(true);
      const isNotRegistered = await CarnivalClub.isClubRegistered(999, 999);
      expect(isNotRegistered).toBe(false);
    });

    it('should get attendance count for a carnival', async () => {
      const count = await CarnivalClub.getAttendanceCount(carnival.id);
      expect(count).toBe(1);
    });

    it('should get attendance count with status', async () => {
      const counts = await CarnivalClub.getAttendanceCountWithStatus(carnival.id);
      expect(counts).toHaveProperty('approved', 1);
      expect(counts).toHaveProperty('pending', 0);
      expect(counts).toHaveProperty('total', 1);
    });
  });
});
