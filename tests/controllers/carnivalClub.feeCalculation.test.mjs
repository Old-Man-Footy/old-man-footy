/**
 * Carnival Club Fee Calculation Tests
 * 
 * Tests for the updated fee calculation logic that:
 * 1. Only counts confirmed players for per-player fees
 * 2. Automatically recalculates fees when player status changes
 * 3. Recalculates all registrations when carnival fee structure changes
 * 
 * @author Old Man Footy System
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { sequelize } from '../../config/database.mjs';

// Mock dependencies
vi.mock('../../middleware/asyncHandler.mjs', () => ({
  asyncHandler: (fn) => fn,
  wrapControllers: (controllers) => controllers,
  default: (fn) => fn
}));

vi.mock('express-validator', () => ({
  validationResult: vi.fn(() => ({
    isEmpty: () => true,
    array: () => []
  }))
}));

vi.mock('../../services/email/CarnivalEmailService.mjs', () => ({
  default: {
    sendRegistrationApprovalEmail: vi.fn().mockResolvedValue(true),
    sendRegistrationRejectionEmail: vi.fn().mockResolvedValue(true)
  }
}));

// Mock models
vi.mock('../../models/index.mjs', () => ({
  CarnivalClubPlayer: {
    count: vi.fn()
  },
  CarnivalClub: {
    findByPk: vi.fn(),
    update: vi.fn()
  },
  Carnival: {
    findByPk: vi.fn()
  },
  Club: vi.fn(),
  ClubPlayer: vi.fn()
}));

// Import after mocking
const { CarnivalClubPlayer, CarnivalClub } = await import('../../models/index.mjs');

// Import controller functions after mocking
const { 
  calculateRegistrationFees, 
  getConfirmedPlayerCount, 
  recalculateRegistrationFees 
} = await import('../../controllers/carnivalClub.controller.mjs');

describe('Carnival Club Fee Calculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateRegistrationFees function', () => {
    it('should calculate fees based on team count and confirmed player count', () => {
      const carnival = {
        teamRegistrationFee: '50.00',
        perPlayerFee: '10.00'
      };

      // Test calculation with 2 teams and 15 confirmed players
      const result = calculateRegistrationFees(carnival, 2, 15);
      
      // Expected: (2 teams * $50) + (15 confirmed players * $10) = $100 + $150 = $250
      expect(result).toBe(250);
    });

    it('should handle zero fees correctly', () => {
      const carnival = {
        teamRegistrationFee: '0.00',
        perPlayerFee: '0.00'
      };

      const result = calculateRegistrationFees(carnival, 3, 20);
      expect(result).toBe(0);
    });

    it('should handle missing fee values as zero', () => {
      const carnival = {}; // No fee fields defined

      const result = calculateRegistrationFees(carnival, 1, 10);
      expect(result).toBe(0);
    });

    it('should handle string and numeric fee values', () => {
      const carnival = {
        teamRegistrationFee: 25.50, // Number
        perPlayerFee: '5.75'        // String
      };

      const result = calculateRegistrationFees(carnival, 2, 8);
      
      // Expected: (2 * 25.50) + (8 * 5.75) = 51 + 46 = 97
      expect(result).toBe(97);
    });

    it('should default parameters correctly', () => {
      const carnival = {
        teamRegistrationFee: '30.00',
        perPlayerFee: '8.00'
      };

      // Test with default numberOfTeams (1) and confirmedPlayerCount (0)
      const result = calculateRegistrationFees(carnival);
      
      // Expected: (1 * 30) + (0 * 8) = 30
      expect(result).toBe(30);
    });
  });

  describe('getConfirmedPlayerCount function', () => {
    it('should count only confirmed and active players', async () => {
      CarnivalClubPlayer.count.mockResolvedValue(12);

      const result = await getConfirmedPlayerCount(123);

      expect(CarnivalClubPlayer.count).toHaveBeenCalledWith({
        where: {
          carnivalClubId: 123,
          attendanceStatus: 'confirmed',
          isActive: true
        }
      });
      expect(result).toBe(12);
    });

    it('should return 0 when no confirmed players exist', async () => {
      CarnivalClubPlayer.count.mockResolvedValue(0);

      const result = await getConfirmedPlayerCount(456);
      expect(result).toBe(0);
    });
  });

  describe('recalculateRegistrationFees function', () => {
    it('should recalculate fees for non-hosting club registrations', async () => {
      const mockRegistration = {
        id: 1,
        clubId: 2,
        numberOfTeams: 2,
        carnival: {
          id: 1,
          teamRegistrationFee: '40.00',
          perPlayerFee: '12.00',
          clubId: 1 // Different from registration.clubId
        },
        update: vi.fn().mockResolvedValue()
      };

      CarnivalClub.findByPk.mockResolvedValue(mockRegistration);
      CarnivalClubPlayer.count.mockResolvedValue(18); // 18 confirmed players

      await recalculateRegistrationFees(1);

      // Expected calculation: (2 teams * $40) + (18 confirmed * $12) = $80 + $216 = $296
      expect(mockRegistration.update).toHaveBeenCalledWith({
        paymentAmount: 296
      });
    });

    it('should maintain hosting club fee exemption during recalculation', async () => {
      const mockRegistration = {
        id: 1,
        clubId: 1, // Same as carnival.clubId (hosting club)
        numberOfTeams: 2,
        carnival: {
          id: 1,
          teamRegistrationFee: '40.00',
          perPlayerFee: '12.00',
          clubId: 1 // Same as registration.clubId
        },
        isPaid: false,
        paymentDate: null,
        update: vi.fn().mockResolvedValue()
      };

      CarnivalClub.findByPk.mockResolvedValue(mockRegistration);

      await recalculateRegistrationFees(1);

      // Hosting club should get exemption
      expect(mockRegistration.update).toHaveBeenCalledWith({
        paymentAmount: 0.00,
        isPaid: true,
        paymentDate: expect.any(Date)
      });
    });

    it('should handle missing registration gracefully', async () => {
      CarnivalClub.findByPk.mockResolvedValue(null);

      // Should not throw error
      await expect(recalculateRegistrationFees(999)).resolves.toBeUndefined();
    });

    it('should handle missing carnival data gracefully', async () => {
      const mockRegistration = {
        id: 1,
        clubId: 2,
        carnival: null,
        update: vi.fn()
      };

      CarnivalClub.findByPk.mockResolvedValue(mockRegistration);

      // Should not throw error
      await expect(recalculateRegistrationFees(1)).resolves.toBeUndefined();
      expect(mockRegistration.update).not.toHaveBeenCalled();
    });
  });

  describe('Fee Calculation Integration', () => {
    it('should demonstrate complete fee calculation workflow', async () => {
      // Initial registration with 20 total players but only 5 confirmed
      const carnival = {
        teamRegistrationFee: '60.00',
        perPlayerFee: '15.00',
        clubId: 1
      };

      // Calculate initial fee (new registration uses total player count)
      const initialFee = calculateRegistrationFees(carnival, 2, 20);
      expect(initialFee).toBe(420); // (2 * 60) + (20 * 15) = 120 + 300

      // After players confirm attendance, only 15 are confirmed
      CarnivalClubPlayer.count.mockResolvedValue(15);
      const confirmedCount = await getConfirmedPlayerCount(123);
      expect(confirmedCount).toBe(15);

      // Recalculated fee should be based on confirmed players only
      const recalculatedFee = calculateRegistrationFees(carnival, 2, 15);
      expect(recalculatedFee).toBe(345); // (2 * 60) + (15 * 15) = 120 + 225

      // Fee reduction due to confirmed vs total player difference
      const feeReduction = initialFee - recalculatedFee;
      expect(feeReduction).toBe(75); // $75 reduction
    });

    it('should handle hosting club exemption throughout workflow', async () => {
      const carnival = {
        teamRegistrationFee: '50.00',
        perPlayerFee: '10.00',
        clubId: 5 // Hosting club ID
      };

      // Hosting club registration should always calculate to 0
      const hostingClubFee = calculateRegistrationFees(carnival, 3, 25);
      // Note: calculateRegistrationFees doesn't check hosting status, that's done in the controllers
      expect(hostingClubFee).toBe(400); // (3 * $50) + (25 * $10) = $150 + $250 = $400

      // Mock hosting club recalculation
      const mockHostingRegistration = {
        id: 1,
        clubId: 5, // Same as carnival.clubId
        carnival: { clubId: 5 },
        update: vi.fn()
      };

      CarnivalClub.findByPk.mockResolvedValue(mockHostingRegistration);
      await recalculateRegistrationFees(1);

      // Should be set to 0 regardless of calculated amount
      expect(mockHostingRegistration.update).toHaveBeenCalledWith({
        paymentAmount: 0.00,
        isPaid: true,
        paymentDate: expect.any(Date)
      });
    });
  });
});
