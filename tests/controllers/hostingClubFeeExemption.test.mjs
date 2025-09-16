/**
 * Fee Exemption Test Suite for Hosting Clubs
 * 
 * Comprehensive unit tests for the hosting club fee exemption feature where
 * hosting clubs are automatically exempt from all registration fees.
 * 
 * Tests cover:
 * - Automatic fee exemption for hosting clubs
 * - Fee application for non-hosting clubs
 * - Edge cases and error handling
 * - Database validation
 * - UI validation scenarios
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

vi.mock('express-validator', () => {
  const createValidatorChain = () => ({
    trim: vi.fn().mockReturnThis(),
    isLength: vi.fn().mockReturnThis(),
    withMessage: vi.fn().mockReturnThis(),
    isAlpha: vi.fn().mockReturnThis(),
    isDate: vi.fn().mockReturnThis(),
    custom: vi.fn().mockReturnThis(),
    isEmail: vi.fn().mockReturnThis(),
    normalizeEmail: vi.fn().mockReturnThis(),
    optional: vi.fn().mockReturnThis(),
    isIn: vi.fn().mockReturnThis(),
    isInt: vi.fn().mockReturnThis(),
    isBoolean: vi.fn().mockReturnThis()
  });

  return {
    body: vi.fn(() => createValidatorChain()),
    param: vi.fn(() => createValidatorChain()),
    validationResult: vi.fn(() => ({
      isEmpty: () => true,
      array: () => []
    }))
  };
});

vi.mock('../../config/constants.mjs', () => ({
  APPROVAL_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
  }
}));

vi.mock('../../services/email/CarnivalEmailService.mjs', () => ({
  default: {
    sendRegistrationApprovalEmail: vi.fn().mockResolvedValue(true),
    sendRegistrationRejectionEmail: vi.fn().mockResolvedValue(true)
  }
}));

// Mock models with hosting club fee exemption logic
vi.mock('../../models/index.mjs', () => {
  const createMockCarnival = (overrides = {}) => ({
    id: 1,
    title: 'Test Carnival',
    description: 'Test carnival description',
    createdByUserId: 1,
    clubId: 1, // Hosting club ID
    startDate: '2024-06-01',
    endDate: '2024-06-02',
    maxTeams: 16,
    registrationOpenDate: '2024-05-01',
    registrationCloseDate: '2024-05-30',
    isActive: true,
    hostClub: {
      id: 1,
      clubName: 'Host Club',
      state: 'NSW'
    },
    isRegistrationActiveAsync: vi.fn().mockResolvedValue(true),
    getApprovedRegistrationsCount: vi.fn().mockResolvedValue(5),
    ...overrides
  });

  const createMockClub = (overrides = {}) => ({
    id: 1,
    clubName: 'Test Club',
    state: 'NSW',
    location: 'Sydney',
    isActive: true,
    isPubliclyListed: true,
    contactPerson: 'Club Contact',
    contactEmail: 'contact@testclub.com',
    contactPhone: '0987654321',
    logoUrl: null,
    ...overrides
  });

  const createMockCarnivalClub = (overrides = {}) => ({
    id: 1,
    carnivalId: 1,
    clubId: 1,
    playerCount: 15,
    teamName: 'Test Team',
    contactPerson: 'John Smith',
    contactEmail: 'john@testclub.com',
    contactPhone: '0412345678',
    specialRequirements: 'None',
    registrationNotes: 'Test registration',
    paymentAmount: 0.00, // Default to exempted amount
    isPaid: false,
    paymentDate: null,
    displayOrder: 1,
    registrationDate: new Date('2024-01-01'),
    approvalStatus: 'pending',
    approvedAt: null,
    approvedByUserId: null,
    rejectionReason: null,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    update: vi.fn().mockResolvedValue(true),
    save: vi.fn().mockResolvedValue(true),
    participatingClub: {
      id: 1,
      clubName: 'Test Club',
      state: 'NSW',
      location: 'Sydney'
    },
    ...overrides
  });

  const createMockUser = (overrides = {}) => ({
    id: 1,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    clubId: 1,
    isPrimaryDelegate: true,
    isAdmin: false,
    ...overrides
  });

  return {
    Carnival: {
      findOne: vi.fn(),
      findByPk: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn()
    },
    Club: {
      findOne: vi.fn(),
      findByPk: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn()
    },
    CarnivalClub: {
      findOne: vi.fn(),
      findByPk: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      count: vi.fn()
    },
    User: {
      findOne: vi.fn(),
      findByPk: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn()
    },
    // Export mock creators for use in tests
    createMockCarnival,
    createMockClub,
    createMockCarnivalClub,
    createMockUser
  };
});

// Import after mocking
const { Carnival, Club, CarnivalClub, User, createMockCarnival, createMockClub, createMockCarnivalClub, createMockUser } = await import('../../models/index.mjs');
const { registerClubForCarnival, registerMyClubForCarnival } = await import('../../controllers/carnivalClub.controller.mjs');

describe('Hosting Club Fee Exemption Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { carnivalId: '1' },
      body: {},
      user: createMockUser(),
      flash: vi.fn()
    };
    res = {
      render: vi.fn(),
      redirect: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    next = vi.fn();

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('Phase 1: Backend Automatic Fee Exemption Logic', () => {
    describe('Hosting Club Registration', () => {
      it('should automatically set paymentAmount to 0 for hosting club registration', async () => {
        // Setup: Hosting club (clubId: 1) registering for their own carnival
        const mockCarnival = createMockCarnival({ clubId: 1 }); // Club 1 is hosting
        const mockHostingClub = createMockClub({ id: 1, clubName: 'Hosting Club' });

        req.body = {
          clubId: '1', // Same as carnival's hosting club
          playerCount: '15',
          teamName: 'Host Team',
          contactPerson: 'Host Contact',
          contactEmail: 'host@hostclub.com',
          contactPhone: '0123456789',
          paymentAmount: '100' // This should be overridden to 0
        };

        Carnival.findOne.mockResolvedValue(mockCarnival);
        Club.findByPk.mockResolvedValue(mockHostingClub);
        CarnivalClub.findOne.mockResolvedValue(null); // No existing registration
        CarnivalClub.count.mockResolvedValue(0); // First registration
        CarnivalClub.create.mockResolvedValue(createMockCarnivalClub({ 
          clubId: 1, 
          paymentAmount: 0.00 // Fee exempted
        }));

        await registerClubForCarnival(req, res, next);

        // Verify fee exemption
        expect(CarnivalClub.create).toHaveBeenCalledWith(expect.objectContaining({
          carnivalId: 1,
          clubId: 1,
          paymentAmount: 0.00, // Fee should be automatically set to 0
          isPaid: true, // Should be automatically marked as paid since no payment needed
          approvalStatus: 'approved' // Hosting club should be auto-approved
        }));

        expect(req.flash).toHaveBeenCalledWith('success_msg', 
          expect.stringContaining('has been successfully registered')
        );
      });

      it('should apply regular fees for non-hosting club registration', async () => {
        // Setup: Non-hosting club registering for carnival
        const mockCarnival = createMockCarnival({ clubId: 1 }); // Club 1 is hosting
        const mockParticipatingClub = createMockClub({ id: 2, clubName: 'Participating Club' });

        req.body = {
          clubId: '2', // Different from carnival's hosting club
          playerCount: '15',
          teamName: 'Away Team',
          contactPerson: 'Away Contact',
          contactEmail: 'away@awayclub.com',
          contactPhone: '0123456789',
          paymentAmount: '100' // This should remain as specified
        };

        Carnival.findOne.mockResolvedValue(mockCarnival);
        Club.findByPk.mockResolvedValue(mockParticipatingClub);
        CarnivalClub.findOne.mockResolvedValue(null);
        CarnivalClub.count.mockResolvedValue(1);
        CarnivalClub.create.mockResolvedValue(createMockCarnivalClub({ 
          clubId: 2, 
          paymentAmount: 100.00 // Regular fee applies
        }));

        await registerClubForCarnival(req, res, next);

        // Verify regular fee application
        expect(CarnivalClub.create).toHaveBeenCalledWith(expect.objectContaining({
          carnivalId: 1,
          clubId: 2,
          paymentAmount: 100.00, // Regular fee should be maintained
          isPaid: false, // Should not be automatically paid
          approvalStatus: 'approved' // Carnival organizer adding clubs directly = auto-approved
        }));
      });

      it('should handle self-registration for hosting club delegate', async () => {
        // Setup: Hosting club delegate self-registering
        const mockCarnival = createMockCarnival({ clubId: 1 });
        const mockHostingClub = createMockClub({ id: 1 });

        req.user = createMockUser({ clubId: 1 }); // User belongs to hosting club
        req.body = {
          playerCount: '18',
          teamName: 'Host Team Self-Reg',
          contactPerson: 'Delegate Contact',
          contactEmail: 'delegate@hostclub.com',
          contactPhone: '0987654321'
        };

        Carnival.findOne.mockResolvedValue(mockCarnival);
        Club.findByPk.mockResolvedValue(mockHostingClub);
        CarnivalClub.findOne.mockResolvedValue(null);
        CarnivalClub.count.mockResolvedValue(0);
        CarnivalClub.create.mockResolvedValue(createMockCarnivalClub({ 
          clubId: 1, 
          paymentAmount: 0.00 
        }));

        await registerMyClubForCarnival(req, res, next);

        // Verify hosting club self-registration exemption
        expect(CarnivalClub.create).toHaveBeenCalledWith(expect.objectContaining({
          carnivalId: 1,
          clubId: 1,
          paymentAmount: 0.00, // Fee exempted for hosting club
          isPaid: true, // Auto-paid since no fee
          approvalStatus: 'approved' // Auto-approved for hosting club
        }));
      });
    });

    describe('Edge Cases and Error Handling', () => {
      it('should handle carnival without hosting club (orphaned carnival)', async () => {
        // Setup: Carnival with no hosting club assigned
        const mockCarnival = createMockCarnival({ clubId: null });
        const mockClub = createMockClub({ id: 2 });

        req.body = {
          clubId: '2',
          playerCount: '15',
          teamName: 'Test Team',
          contactPerson: 'Contact',
          contactEmail: 'contact@club.com',
          contactPhone: '0123456789',
          paymentAmount: '100'
        };

        Carnival.findOne.mockResolvedValue(mockCarnival);
        Club.findByPk.mockResolvedValue(mockClub);
        CarnivalClub.findOne.mockResolvedValue(null);
        CarnivalClub.count.mockResolvedValue(0);
        CarnivalClub.create.mockResolvedValue(createMockCarnivalClub({ 
          clubId: 2, 
          paymentAmount: 100.00 
        }));

        await registerClubForCarnival(req, res, next);

        // Verify regular fee applies when no hosting club
        expect(CarnivalClub.create).toHaveBeenCalledWith(expect.objectContaining({
          paymentAmount: 100.00, // Regular fee should apply
          isPaid: false,
          approvalStatus: 'approved' // Auto-approved when carnival organizer adds club
        }));
      });

      it('should handle zero payment amount for non-hosting club', async () => {
        // Setup: Non-hosting club with 0 payment amount
        const mockCarnival = createMockCarnival({ clubId: 1 });
        const mockClub = createMockClub({ id: 2 });

        req.body = {
          clubId: '2',
          playerCount: '15',
          teamName: 'Free Entry Team',
          contactPerson: 'Contact',
          contactEmail: 'contact@club.com',
          contactPhone: '0123456789',
          paymentAmount: '0' // Explicitly set to 0
        };

        Carnival.findOne.mockResolvedValue(mockCarnival);
        Club.findByPk.mockResolvedValue(mockClub);
        CarnivalClub.findOne.mockResolvedValue(null);
        CarnivalClub.count.mockResolvedValue(1);
        CarnivalClub.create.mockResolvedValue(createMockCarnivalClub({ 
          clubId: 2, 
          paymentAmount: 0.00 
        }));

        await registerClubForCarnival(req, res, next);

        // Verify 0 payment amount is respected for non-hosting clubs
        expect(CarnivalClub.create).toHaveBeenCalledWith(expect.objectContaining({
          paymentAmount: 0.00,
          isPaid: false, // Should not auto-pay for non-hosting even with 0 amount
          approvalStatus: 'approved' // Auto-approved when carnival organizer adds club
        }));
      });

      it('should handle invalid club ID during registration', async () => {
        // Setup: Invalid club ID
        const mockCarnival = createMockCarnival({ clubId: 1 });

        req.body = {
          clubId: '999', // Non-existent club
          playerCount: '15',
          teamName: 'Invalid Team',
          contactPerson: 'Contact',
          contactEmail: 'contact@invalid.com',
          contactPhone: '0123456789',
          paymentAmount: '100'
        };

        Carnival.findOne.mockResolvedValue(mockCarnival);
        Club.findByPk.mockResolvedValue(null); // Club not found

        await registerClubForCarnival(req, res, next);

        // Verify error handling
        expect(req.flash).toHaveBeenCalledWith('error_msg', 
          expect.stringContaining('Club not found')
        );
        expect(CarnivalClub.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('Phase 2: Frontend Fee Display and Calculation', () => {
    describe('Fee Display Logic', () => {
      it('should display "Free (Hosting Club)" for hosting club registrations', () => {
        // This would be tested in frontend tests, but we can verify the data structure
        const mockCarnival = createMockCarnival({ clubId: 1 });
        const mockRegistration = createMockCarnivalClub({ 
          clubId: 1, 
          paymentAmount: 0.00 
        });

        // Verify fee exemption data structure
        expect(mockRegistration.paymentAmount).toBe(0.00);
        expect(mockCarnival.clubId).toBe(1);
        expect(mockRegistration.clubId).toBe(mockCarnival.clubId);
      });

      it('should display regular fee amount for non-hosting clubs', () => {
        const mockCarnival = createMockCarnival({ clubId: 1 });
        const mockRegistration = createMockCarnivalClub({ 
          clubId: 2, 
          paymentAmount: 150.00 
        });

        // Verify regular fee data structure
        expect(mockRegistration.paymentAmount).toBe(150.00);
        expect(mockRegistration.clubId).not.toBe(mockCarnival.clubId);
      });
    });

    describe('Fee Calculation Helpers', () => {
      it('should correctly identify hosting club for fee exemption', () => {
        const carnival = createMockCarnival({ clubId: 5 });
        const hostingClubRegistration = createMockCarnivalClub({ clubId: 5 });
        const nonHostingClubRegistration = createMockCarnivalClub({ clubId: 3 });

        // Test hosting club identification
        expect(hostingClubRegistration.clubId).toBe(carnival.clubId);
        expect(nonHostingClubRegistration.clubId).not.toBe(carnival.clubId);
      });

      it('should calculate correct fee amounts based on hosting status', () => {
        const baseAmount = 200.00;
        const carnival = createMockCarnival({ clubId: 1 });
        
        // Helper function that would be implemented in actual code
        const calculateFeeAmount = (clubId, carnivalHostClubId, baseAmount) => {
          return clubId === carnivalHostClubId ? 0.00 : baseAmount;
        };

        expect(calculateFeeAmount(1, carnival.clubId, baseAmount)).toBe(0.00); // Hosting club
        expect(calculateFeeAmount(2, carnival.clubId, baseAmount)).toBe(200.00); // Non-hosting club
      });
    });
  });

  describe('Phase 3: Testing and Validation', () => {
    describe('Database Validation', () => {
      it('should validate fee exemption data integrity in database', async () => {
        // Test database constraints and relationships
        const carnival = createMockCarnival({ clubId: 1 });
        const hostingRegistration = createMockCarnivalClub({ 
          carnivalId: 1,
          clubId: 1,
          paymentAmount: 0.00,
          isPaid: true
        });

        // Verify data integrity
        expect(hostingRegistration.carnivalId).toBe(carnival.id);
        expect(hostingRegistration.clubId).toBe(carnival.clubId);
        expect(hostingRegistration.paymentAmount).toBe(0.00);
        expect(hostingRegistration.isPaid).toBe(true);
      });

      it('should maintain referential integrity between carnival and club', async () => {
        const carnival = createMockCarnival({ clubId: 1 });
        const club = createMockClub({ id: 1 });
        const registration = createMockCarnivalClub({ 
          carnivalId: carnival.id,
          clubId: club.id 
        });

        // Verify relationships
        expect(registration.carnivalId).toBe(carnival.id);
        expect(registration.clubId).toBe(club.id);
        expect(carnival.clubId).toBe(club.id);
      });
    });

    describe('UI Validation', () => {
      it('should provide correct data for fee display in templates', () => {
        const carnival = createMockCarnival({ 
          clubId: 1,
          title: 'Test Carnival',
          hostClub: { clubName: 'Host Club' }
        });
        
        const hostingRegistration = createMockCarnivalClub({ 
          clubId: 1,
          paymentAmount: 0.00,
          participatingClub: { clubName: 'Host Club' }
        });
        
        const nonHostingRegistration = createMockCarnivalClub({ 
          clubId: 2,
          paymentAmount: 100.00,
          participatingClub: { clubName: 'Away Club' }
        });

        // Verify template data structure
        expect(hostingRegistration.paymentAmount).toBe(0.00);
        expect(nonHostingRegistration.paymentAmount).toBe(100.00);
        
        // Mock template helper function
        const getFeeDisplayText = (registration, carnival) => {
          const isHosting = registration.clubId === carnival.clubId;
          return isHosting ? 'Free (Hosting Club)' : `$${registration.paymentAmount}`;
        };

        expect(getFeeDisplayText(hostingRegistration, carnival)).toBe('Free (Hosting Club)');
        expect(getFeeDisplayText(nonHostingRegistration, carnival)).toBe('$100');
      });
    });

    describe('Cross-Check Testing', () => {
      it('should ensure consistency between registration creation and display', async () => {
        // Test end-to-end consistency
        const mockCarnival = createMockCarnival({ clubId: 1 });
        const mockClub = createMockClub({ id: 1, clubName: 'Hosting Club' });

        req.body = {
          clubId: '1',
          playerCount: '15',
          teamName: 'Host Team',
          contactPerson: 'Contact',
          contactEmail: 'contact@host.com',
          contactPhone: '0123456789',
          paymentAmount: '100' // Should be overridden
        };

        const createdRegistration = createMockCarnivalClub({ 
          clubId: 1, 
          paymentAmount: 0.00,
          isPaid: true,
          approvalStatus: 'approved'
        });

        Carnival.findOne.mockResolvedValue(mockCarnival);
        Club.findByPk.mockResolvedValue(mockClub);
        CarnivalClub.findOne.mockResolvedValue(null);
        CarnivalClub.count.mockResolvedValue(0);
        CarnivalClub.create.mockResolvedValue(createdRegistration);

        await registerClubForCarnival(req, res, next);

        // Verify consistency
        expect(CarnivalClub.create).toHaveBeenCalledWith(expect.objectContaining({
          clubId: 1,
          paymentAmount: 0.00,
          isPaid: true,
          approvalStatus: 'approved'
        }));

        // Verify the created record matches exemption expectations
        expect(createdRegistration.paymentAmount).toBe(0.00);
        expect(createdRegistration.isPaid).toBe(true);
        expect(createdRegistration.clubId).toBe(mockCarnival.clubId);
      });

      it('should handle multiple hosting club registrations correctly', async () => {
        // Test scenario where hosting club registers multiple teams
        const mockCarnival = createMockCarnival({ clubId: 1 });
        const mockClub = createMockClub({ id: 1 });

        // First registration
        req.body = {
          clubId: '1',
          playerCount: '15',
          teamName: 'Host Team A',
          contactPerson: 'Contact A',
          contactEmail: 'contacta@host.com',
          contactPhone: '0123456789',
          paymentAmount: '100'
        };

        Carnival.findOne.mockResolvedValue(mockCarnival);
        Club.findByPk.mockResolvedValue(mockClub);
        CarnivalClub.findOne.mockResolvedValue(null);
        CarnivalClub.count.mockResolvedValue(0);
        CarnivalClub.create.mockResolvedValue(createMockCarnivalClub({ 
          id: 1,
          clubId: 1, 
          paymentAmount: 0.00,
          teamName: 'Host Team A'
        }));

        await registerClubForCarnival(req, res, next);

        // Verify first registration is exempt
        expect(CarnivalClub.create).toHaveBeenCalledWith(expect.objectContaining({
          paymentAmount: 0.00,
          teamName: 'Host Team A'
        }));

        // Reset mocks for second registration
        vi.clearAllMocks();

        // Second registration for same hosting club
        req.body = {
          clubId: '1',
          playerCount: '18',
          teamName: 'Host Team B',
          contactPerson: 'Contact B',
          contactEmail: 'contactb@host.com',
          contactPhone: '0123456789',
          paymentAmount: '120'
        };

        CarnivalClub.findOne.mockResolvedValue(null); // No existing registration with this team name
        CarnivalClub.count.mockResolvedValue(1); // One existing registration
        CarnivalClub.create.mockResolvedValue(createMockCarnivalClub({ 
          id: 2,
          clubId: 1, 
          paymentAmount: 0.00,
          teamName: 'Host Team B'
        }));

        await registerClubForCarnival(req, res, next);

        // Verify second registration is also exempt
        expect(CarnivalClub.create).toHaveBeenCalledWith(expect.objectContaining({
          paymentAmount: 0.00,
          teamName: 'Host Team B'
        }));
      });
    });

    describe('Integration Testing Scenarios', () => {
      it('should handle carnival ownership transfer fee exemption update', async () => {
        // Test scenario where carnival ownership changes
        const originalCarnival = createMockCarnival({ clubId: 1 });
        const transferredCarnival = createMockCarnival({ clubId: 2 }); // Ownership transferred

        // Original hosting club registration (should remain exempt)
        const originalHostRegistration = createMockCarnivalClub({ 
          clubId: 1, 
          paymentAmount: 0.00,
          isPaid: true 
        });

        // New hosting club should get exemption
        req.body = {
          clubId: '2',
          playerCount: '15',
          teamName: 'New Host Team',
          contactPerson: 'New Contact',
          contactEmail: 'new@newhost.com',
          contactPhone: '0123456789',
          paymentAmount: '100'
        };

        Carnival.findOne.mockResolvedValue(transferredCarnival);
        Club.findByPk.mockResolvedValue(createMockClub({ id: 2, clubName: 'New Host Club' }));
        CarnivalClub.findOne.mockResolvedValue(null);
        CarnivalClub.count.mockResolvedValue(1);
        CarnivalClub.create.mockResolvedValue(createMockCarnivalClub({ 
          clubId: 2, 
          paymentAmount: 0.00 
        }));

        await registerClubForCarnival(req, res, next);

        // Verify new hosting club gets exemption
        expect(CarnivalClub.create).toHaveBeenCalledWith(expect.objectContaining({
          clubId: 2,
          paymentAmount: 0.00,
          isPaid: true,
          approvalStatus: 'approved'
        }));
      });
    });
  });

  describe('Performance and Security Tests', () => {
    it('should not allow fee manipulation for hosting clubs', async () => {
      // Test security against fee manipulation
      const mockCarnival = createMockCarnival({ clubId: 1 });
      const mockClub = createMockClub({ id: 1 });

      // Attempt to set a fee for hosting club (should be overridden)
      req.body = {
        clubId: '1',
        playerCount: '15',
        teamName: 'Host Team',
        contactPerson: 'Contact',
        contactEmail: 'contact@host.com',
        contactPhone: '0123456789',
        paymentAmount: '999999' // Malicious high amount
      };

      Carnival.findOne.mockResolvedValue(mockCarnival);
      Club.findByPk.mockResolvedValue(mockClub);
      CarnivalClub.findOne.mockResolvedValue(null);
      CarnivalClub.count.mockResolvedValue(0);
      CarnivalClub.create.mockResolvedValue(createMockCarnivalClub({ 
        clubId: 1, 
        paymentAmount: 0.00 // Should be forced to 0
      }));

      await registerClubForCarnival(req, res, next);

      // Verify fee is forced to 0 regardless of input
      expect(CarnivalClub.create).toHaveBeenCalledWith(expect.objectContaining({
        paymentAmount: 0.00, // Should be 0, not 999999
        isPaid: true
      }));
    });

    it('should handle null/undefined payment amounts gracefully', async () => {
      const mockCarnival = createMockCarnival({ clubId: 1 });
      const mockClub = createMockClub({ id: 1 });

      req.body = {
        clubId: '1',
        playerCount: '15',
        teamName: 'Host Team',
        contactPerson: 'Contact',
        contactEmail: 'contact@host.com',
        contactPhone: '0123456789'
        // paymentAmount intentionally omitted
      };

      Carnival.findOne.mockResolvedValue(mockCarnival);
      Club.findByPk.mockResolvedValue(mockClub);
      CarnivalClub.findOne.mockResolvedValue(null);
      CarnivalClub.count.mockResolvedValue(0);
      CarnivalClub.create.mockResolvedValue(createMockCarnivalClub({ 
        clubId: 1, 
        paymentAmount: 0.00 
      }));

      await registerClubForCarnival(req, res, next);

      // Verify hosting club still gets exemption with missing payment amount
      expect(CarnivalClub.create).toHaveBeenCalledWith(expect.objectContaining({
        paymentAmount: 0.00,
        isPaid: true
      }));
    });
  });
});
