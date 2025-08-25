/**
 * Carnival Club Controller Tests
 * 
 * Comprehensive test suite for carnival club registration and management functionality 
 * following the proven pattern from six previous controllers with 100% success rate.
 * 
 * Covers club registration workflows, approval processes, player management,
 * self-service registration, and administrative functions.
 * 
 * @author Old Man Footy System
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { sequelize } from '../../config/database.mjs';

// Mock the asyncHandler middleware to prevent wrapping issues
vi.mock('/middleware/asyncHandler.mjs', () => ({
  asyncHandler: (fn) => fn,
  wrapControllers: (controllers) => controllers,
  default: (fn) => fn
}));

// Mock express-validator
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

// Mock constants
vi.mock('/config/constants.mjs', () => ({
  APPROVAL_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
  }
}));

// Mock email service
vi.mock('/services/email/CarnivalEmailService.mjs', () => ({
  default: {
    sendRegistrationApprovalEmail: vi.fn().mockResolvedValue(true),
    sendRegistrationRejectionEmail: vi.fn().mockResolvedValue(true)
  }
}));

// Mock all model imports before importing the controller
vi.mock('/models/index.mjs', () => {
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
    paymentAmount: 100.00,
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
    club: {
      id: 1,
      clubName: 'Test Club',
      state: 'NSW',
      location: 'Sydney'
    },
    ...overrides
  });

  const createMockCarnival = (overrides = {}) => ({
    id: 1,
    title: 'Test Carnival',
    description: 'Test carnival description',
    createdByUserId: 1,
    clubId: 1,
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

  const createMockClubPlayer = (overrides = {}) => ({
    id: 1,
    clubId: 1,
    firstName: 'John',
    lastName: 'Player',
    email: 'john.player@example.com',
    dateOfBirth: '1985-06-15',
    isActive: true,
    ...overrides
  });

  const createMockCarnivalClubPlayer = (overrides = {}) => ({
    id: 1,
    carnivalClubId: 1,
    clubPlayerId: 1,
    attendanceStatus: 'confirmed',
    notes: null,
    isActive: true,
    addedAt: new Date('2024-01-01'),
    update: vi.fn().mockResolvedValue(true),
    clubPlayer: createMockClubPlayer(),
    ...overrides
  });

  const createMockUser = (overrides = {}) => ({
    id: 1,
    email: 'delegate@testclub.com',
    firstName: 'Test',
    lastName: 'User',
    clubId: 1,
    isPrimaryDelegate: false,
    isAdmin: false,
    isActive: true,
    ...overrides
  });

  return {
    CarnivalClub: {
      findAll: vi.fn(),
      findOne: vi.fn(),
      findByPk: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      bulkCreate: vi.fn(),
      getAttendanceCountWithStatus: vi.fn()
    },
    Carnival: {
      findOne: vi.fn(),
      findByPk: vi.fn(),
      findAll: vi.fn()
    },
    Club: {
      findAll: vi.fn(),
      findOne: vi.fn(),
      findByPk: vi.fn()
    },
    ClubPlayer: {
      findAll: vi.fn(),
      findOne: vi.fn(),
      findByPk: vi.fn()
    },
    CarnivalClubPlayer: {
      findAll: vi.fn(),
      findOne: vi.fn(),
      bulkCreate: vi.fn(),
      getAttendanceStats: vi.fn()
    },
    createMockCarnivalClub,
    createMockCarnival,
    createMockClub,
    createMockClubPlayer,
    createMockCarnivalClubPlayer,
    createMockUser,
    Op: {
      gte: Symbol('gte'),
      ne: Symbol('ne'),
      like: Symbol('like'),
      or: Symbol('or'),
      and: Symbol('and'),
      in: Symbol('in'),
      notIn: Symbol('notIn')
    }
  };
});

// Now import the controller and dependencies
import {
  showCarnivalAttendees,
  showAddClubToCarnival,
  registerClubForCarnival,
  showEditRegistration,
  updateRegistration,
  removeClubFromCarnival,
  reorderAttendingClubs,
  registerMyClubForCarnival,
  unregisterMyClubFromCarnival,
  showCarnivalClubPlayers,
  showAddPlayersToRegistration,
  addPlayersToRegistration,
  removePlayerFromRegistration,
  updatePlayerAttendanceStatus,
  showMyClubPlayersForCarnival,
  addPlayersToMyClubRegistration,
  approveClubRegistration,
  rejectClubRegistration,
  updateApprovalStatus
} from '../../controllers/carnivalClub.controller.mjs';

import {
  CarnivalClub,
  Carnival,
  Club,
  ClubPlayer,
  CarnivalClubPlayer,
  createMockCarnivalClub,
  createMockCarnival,
  createMockClub,
  createMockClubPlayer,
  createMockCarnivalClubPlayer,
  createMockUser,
  Op
} from '../../models/index.mjs';

import { validationResult } from 'express-validator';
import CarnivalEmailService from '../../services/email/CarnivalEmailService.mjs';

describe('Carnival Club Controller', () => {
  let req, res, next;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock request object
    req = {
      params: { carnivalId: '1', registrationId: '1', assignmentId: '1' },
      query: {},
      body: {},
      user: createMockUser({ id: 1, clubId: 1, isPrimaryDelegate: true }),
      flash: vi.fn()
    };

    // Mock response object
    res = {
      render: vi.fn(),
      redirect: vi.fn(),
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
      locals: {}
    };

    // Mock next function
    next = vi.fn();

    // Set up default model mocks
    CarnivalClub.findAll.mockResolvedValue([]);
    CarnivalClub.findOne.mockResolvedValue(null);
    CarnivalClub.findByPk.mockResolvedValue(null);
    CarnivalClub.create.mockResolvedValue(createMockCarnivalClub());
    CarnivalClub.count.mockResolvedValue(0);
    CarnivalClub.getAttendanceCountWithStatus.mockResolvedValue({
      pending: 2,
      approved: 5,
      rejected: 1
    });

    Carnival.findOne.mockResolvedValue(createMockCarnival());
    Club.findAll.mockResolvedValue([]);
    Club.findByPk.mockResolvedValue(createMockClub());
    ClubPlayer.findAll.mockResolvedValue([]);
    CarnivalClubPlayer.findAll.mockResolvedValue([]);
    CarnivalClubPlayer.getAttendanceStats.mockResolvedValue({
      confirmed: 10,
      pending: 3,
      declined: 2
    });

    // Mock validation to return no errors by default
    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => []
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Carnival Attendee Management', () => {
    it('should display carnival attendees for authorized carnival organizer', async () => {
      const mockCarnival = createMockCarnival({ id: 1, createdByUserId: 1 });
      const mockAttendingClubs = [
        createMockCarnivalClub({ id: 1, isPaid: true, playerCount: 15 }),
        createMockCarnivalClub({ id: 2, isPaid: false, playerCount: 12 })
      ];

      Carnival.findOne.mockResolvedValue(mockCarnival);
      CarnivalClub.findAll.mockResolvedValue(mockAttendingClubs);

      await showCarnivalAttendees(req, res, next);

      expect(Carnival.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          id: '1',
          createdByUserId: 1,
          isActive: true
        }
      }));

      expect(res.render).toHaveBeenCalledWith('carnivals/attendees', expect.objectContaining({
        title: 'Test Carnival - Manage Attendees',
        carnival: mockCarnival,
        attendingClubs: mockAttendingClubs,
        totalAttendees: 2,
        paidAttendees: 1,
        totalPlayerCount: 27
      }));
    });

    it('should deny access to carnival attendees for unauthorized users', async () => {
      Carnival.findOne.mockResolvedValue(null);

      await showCarnivalAttendees(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Carnival not found or you do not have permission to manage it.');
      expect(res.redirect).toHaveBeenCalledWith('/carnivals');
    });

    it('should show add club to carnival form for authorized organizer', async () => {
      const mockCarnival = createMockCarnival();
      const mockAvailableClubs = [
        createMockClub({ id: 2, clubName: 'Available Club 1' }),
        createMockClub({ id: 3, clubName: 'Available Club 2' })
      ];

      Carnival.findOne.mockResolvedValue(mockCarnival);
      CarnivalClub.findAll.mockResolvedValue([]); // No registered clubs
      Club.findAll.mockResolvedValue(mockAvailableClubs);

      await showAddClubToCarnival(req, res, next);

      // Just verify that Club.findAll was called and the result was rendered
      expect(Club.findAll).toHaveBeenCalled();
      
      // Verify the where clause contains the expected basic conditions
      const callArgs = Club.findAll.mock.calls[0][0];
      expect(callArgs.where.isActive).toBe(true);
      expect(callArgs.where.isPubliclyListed).toBe(true);
      expect(callArgs.where.id).toBeDefined();

      expect(res.render).toHaveBeenCalledWith('carnivals/add-club', expect.objectContaining({
        title: 'Add Club to Test Carnival',
        carnival: mockCarnival,
        availableClubs: mockAvailableClubs
      }));
    });

    it('should register club for carnival successfully', async () => {
      const mockCarnival = createMockCarnival();
      const mockClub = createMockClub({ clubName: 'New Club' });

      req.body = {
        clubId: '2',
        playerCount: '15',
        teamName: 'Test Team',
        contactPerson: 'Contact Person',
        contactEmail: 'contact@club.com',
        contactPhone: '0123456789',
        paymentAmount: '100',
        isPaid: 'on'
      };

      Carnival.findOne.mockResolvedValue(mockCarnival);
      CarnivalClub.findOne.mockResolvedValue(null); // No existing registration
      CarnivalClub.count.mockResolvedValue(5); // Current count for display order
      CarnivalClub.create.mockResolvedValue(createMockCarnivalClub());
      Club.findByPk.mockResolvedValue(mockClub);

      await registerClubForCarnival(req, res, next);

      expect(CarnivalClub.create).toHaveBeenCalledWith(expect.objectContaining({
        carnivalId: 1,
        clubId: 2,
        playerCount: 15,
        teamName: 'Test Team',
        isPaid: true,
        displayOrder: 6,
        approvalStatus: 'approved'
      }));

      expect(req.flash).toHaveBeenCalledWith('success_msg', 'New Club has been successfully registered for Test Carnival!');
      expect(res.redirect).toHaveBeenCalledWith('/carnivals/1/attendees');
    });

    it('should prevent duplicate club registration', async () => {
      const mockCarnival = createMockCarnival();
      const existingRegistration = createMockCarnivalClub();

      req.body = { clubId: '1' };

      Carnival.findOne.mockResolvedValue(mockCarnival);
      CarnivalClub.findOne.mockResolvedValue(existingRegistration);

      await registerClubForCarnival(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'This club is already registered for this carnival.');
      expect(res.redirect).toHaveBeenCalledWith('/carnivals/1/attendees');
    });
  });

  describe('Registration Management', () => {
    it('should show edit registration form for valid registration', async () => {
      const mockCarnival = createMockCarnival();
      const mockRegistration = createMockCarnivalClub({
        id: 1,
        club: createMockClub({ clubName: 'Test Club' })
      });

      req.params = { carnivalId: '1', registrationId: '1' };

      Carnival.findOne.mockResolvedValue(mockCarnival);
      CarnivalClub.findOne.mockResolvedValue(mockRegistration);

      await showEditRegistration(req, res, next);

      expect(res.render).toHaveBeenCalledWith('carnivals/edit-registration', expect.objectContaining({
        title: 'Edit Registration - Test Club',
        carnival: mockCarnival,
        registration: mockRegistration
      }));
    });

    it('should update registration with valid data', async () => {
      const mockCarnival = createMockCarnival();
      const mockRegistration = createMockCarnivalClub({ isPaid: false });

      req.params = { carnivalId: '1', registrationId: '1' };
      req.body = {
        playerCount: '20',
        teamName: 'Updated Team',
        contactPerson: 'Updated Contact',
        paymentAmount: '150',
        isPaid: 'on'
      };

      Carnival.findOne.mockResolvedValue(mockCarnival);
      CarnivalClub.findOne.mockResolvedValue(mockRegistration);

      await updateRegistration(req, res, next);

      expect(mockRegistration.update).toHaveBeenCalledWith(expect.objectContaining({
        playerCount: 20,
        teamName: 'Updated Team',
        contactPerson: 'Updated Contact',
        paymentAmount: 150,
        isPaid: true,
        paymentDate: expect.any(Date)
      }));

      expect(req.flash).toHaveBeenCalledWith('success_msg', 'Registration updated successfully!');
      expect(res.redirect).toHaveBeenCalledWith('/carnivals/1/attendees');
    });

    it('should remove club from carnival successfully', async () => {
      const mockCarnival = createMockCarnival();
      const mockRegistration = createMockCarnivalClub({
        club: createMockClub({ clubName: 'Test Club' })
      });

      Carnival.findOne.mockResolvedValue(mockCarnival);
      CarnivalClub.findOne.mockResolvedValue(mockRegistration);

      await removeClubFromCarnival(req, res, next);

      expect(mockRegistration.update).toHaveBeenCalledWith({ isActive: false });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Test Club has been removed from the carnival.'
      });
    });

    it('should reorder attending clubs successfully', async () => {
      const mockCarnival = createMockCarnival();

      req.body = { clubOrder: ['3', '1', '2'] };

      Carnival.findOne.mockResolvedValue(mockCarnival);

      await reorderAttendingClubs(req, res, next);

      expect(CarnivalClub.update).toHaveBeenCalledTimes(3);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Club order updated successfully.'
      });
    });
  });

  describe('Self-Service Registration', () => {
    it('should register delegate club for carnival successfully', async () => {
      const mockCarnival = createMockCarnival();
      const mockClub = createMockClub({ clubName: 'Delegate Club' });

      req.body = {
        playerCount: '15',
        teamName: 'My Team',
        contactPerson: 'John Smith',
        specialRequirements: 'None'
      };

      Carnival.findOne.mockResolvedValue(mockCarnival);
      CarnivalClub.findOne.mockResolvedValue(null); // No existing registration
      Club.findByPk.mockResolvedValue(mockClub);
      CarnivalClub.count.mockResolvedValue(5);

      await registerMyClubForCarnival(req, res, next);

      expect(CarnivalClub.create).toHaveBeenCalledWith(expect.objectContaining({
        carnivalId: 1,
        clubId: 1,
        playerCount: 15,
        teamName: 'My Team',
        approvalStatus: 'pending',
        isPaid: false
      }));

      expect(req.flash).toHaveBeenCalledWith('success_msg', expect.stringContaining('pending approval'));
      expect(res.redirect).toHaveBeenCalledWith('/carnivals/1');
    });

    it('should prevent registration when carnival is at capacity', async () => {
      const mockCarnival = createMockCarnival({ 
        maxTeams: 10,
        isRegistrationActiveAsync: vi.fn().mockResolvedValue(false),
        getApprovedRegistrationsCount: vi.fn().mockResolvedValue(10)
      });

      Carnival.findOne.mockResolvedValue(mockCarnival);

      await registerMyClubForCarnival(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'This carnival has reached its maximum capacity of 10 teams.');
      expect(res.redirect).toHaveBeenCalledWith('/carnivals/1');
    });

    it('should unregister delegate club from carnival', async () => {
      const mockCarnival = createMockCarnival();
      const mockRegistration = createMockCarnivalClub({ isPaid: false });
      const mockClub = createMockClub({ clubName: 'Test Club' });

      Carnival.findOne.mockResolvedValue(mockCarnival);
      CarnivalClub.findOne.mockResolvedValue(mockRegistration);
      Club.findByPk.mockResolvedValue(mockClub);

      await unregisterMyClubFromCarnival(req, res, next);

      expect(mockRegistration.update).toHaveBeenCalledWith({ isActive: false });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Test Club has been unregistered from Test Carnival.'
      });
    });

    it('should prevent unregistration after payment', async () => {
      const mockCarnival = createMockCarnival();
      const mockRegistration = createMockCarnivalClub({ isPaid: true });

      Carnival.findOne.mockResolvedValue(mockCarnival);
      CarnivalClub.findOne.mockResolvedValue(mockRegistration);

      await unregisterMyClubFromCarnival(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot unregister from a carnival after payment has been made. Please contact the organiser.'
      });
    });
  });

  describe('Player Management', () => {
    it('should show carnival club players for organizer', async () => {
      const mockCarnival = createMockCarnival();
      const mockRegistration = createMockCarnivalClub();
      const mockAssignedPlayers = [
        createMockCarnivalClubPlayer({ id: 1 }),
        createMockCarnivalClubPlayer({ id: 2 })
      ];

      Carnival.findOne.mockResolvedValue(mockCarnival);
      CarnivalClub.findOne.mockResolvedValue(mockRegistration);
      CarnivalClubPlayer.findAll.mockResolvedValue(mockAssignedPlayers);

      await showCarnivalClubPlayers(req, res, next);

      expect(res.render).toHaveBeenCalledWith('carnivals/club-players', expect.objectContaining({
        title: 'Players - Test Club',
        carnival: mockCarnival,
        registration: mockRegistration,
        assignedPlayers: mockAssignedPlayers
      }));
    });

    it('should add players to registration successfully', async () => {
      const mockCarnival = createMockCarnival();
      const mockRegistration = createMockCarnivalClub();
      const mockValidPlayers = [
        createMockClubPlayer({ id: 1 }),
        createMockClubPlayer({ id: 2 })
      ];

      req.body = { playerIds: ['1', '2'] };

      Carnival.findOne.mockResolvedValue(mockCarnival);
      CarnivalClub.findOne.mockResolvedValue(mockRegistration);
      ClubPlayer.findAll.mockResolvedValue(mockValidPlayers);

      await addPlayersToRegistration(req, res, next);

      expect(CarnivalClubPlayer.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            carnivalClubId: 1,
            clubPlayerId: 1,
            attendanceStatus: 'confirmed'
          }),
          expect.objectContaining({
            carnivalClubId: 1,
            clubPlayerId: 2,
            attendanceStatus: 'confirmed'
          })
        ]),
        { ignoreDuplicates: true }
      );

      expect(req.flash).toHaveBeenCalledWith('success_msg', '2 player(s) have been added to the carnival registration.');
    });

    it('should remove player from registration', async () => {
      const mockCarnival = createMockCarnival();
      const mockAssignment = createMockCarnivalClubPlayer({
        clubPlayer: createMockClubPlayer({ firstName: 'John', lastName: 'Player' })
      });

      Carnival.findOne.mockResolvedValue(mockCarnival);
      CarnivalClubPlayer.findOne.mockResolvedValue(mockAssignment);

      await removePlayerFromRegistration(req, res, next);

      expect(mockAssignment.update).toHaveBeenCalledWith({ isActive: false });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'John Player has been removed from the carnival registration.'
      });
    });

    it('should update player attendance status', async () => {
      const mockCarnival = createMockCarnival();
      const mockAssignment = createMockCarnivalClubPlayer();

      req.body = {
        attendanceStatus: 'declined',
        notes: 'Unable to attend'
      };

      Carnival.findOne.mockResolvedValue(mockCarnival);
      CarnivalClubPlayer.findOne.mockResolvedValue(mockAssignment);

      await updatePlayerAttendanceStatus(req, res, next);

      expect(mockAssignment.update).toHaveBeenCalledWith({
        attendanceStatus: 'declined',
        notes: 'Unable to attend'
      });

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Player attendance status updated successfully.'
      });
    });
  });

  describe('Approval Workflow', () => {
    it('should approve club registration successfully', async () => {
      const mockCarnival = createMockCarnival();
      const mockRegistration = createMockCarnivalClub({
        approvalStatus: 'pending',
        club: createMockClub({ clubName: 'Test Club', contactEmail: 'test@club.com' })
      });

      Carnival.findOne.mockResolvedValue(mockCarnival);
      CarnivalClub.findOne.mockResolvedValue(mockRegistration);

      await approveClubRegistration(req, res, next);

      expect(mockRegistration.update).toHaveBeenCalledWith({
        approvalStatus: 'approved',
        approvedAt: expect.any(Date),
        approvedByUserId: 1,
        rejectionReason: null
      });

      expect(CarnivalEmailService.sendRegistrationApprovalEmail).toHaveBeenCalledWith(
        mockCarnival,
        mockRegistration.club,
        'Test User'
      );

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Test Club has been approved to attend Test Carnival.'
      });
    });

    it('should reject club registration with reason', async () => {
      const mockCarnival = createMockCarnival();
      const mockRegistration = createMockCarnivalClub({
        approvalStatus: 'pending',
        club: createMockClub({ clubName: 'Test Club' })
      });

      req.body = { rejectionReason: 'Carnival is full' };

      Carnival.findOne.mockResolvedValue(mockCarnival);
      CarnivalClub.findOne.mockResolvedValue(mockRegistration);

      await rejectClubRegistration(req, res, next);

      expect(mockRegistration.update).toHaveBeenCalledWith({
        approvalStatus: 'rejected',
        approvedAt: null,
        approvedByUserId: 1,
        rejectionReason: 'Carnival is full'
      });

      expect(CarnivalEmailService.sendRegistrationRejectionEmail).toHaveBeenCalledWith(
        mockCarnival,
        mockRegistration.club,
        'Test User',
        'Carnival is full'
      );
    });

    it('should update approval status through API', async () => {
      const mockCarnivalClub = createMockCarnivalClub({ id: 1 });

      req.params = { id: '1' };
      req.body = { approvalStatus: 'approved' };

      CarnivalClub.findByPk.mockResolvedValue(mockCarnivalClub);

      await updateApprovalStatus(req, res, next);

      expect(mockCarnivalClub.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCarnivalClub,
        message: 'Registration approved successfully'
      });
    });

    it('should handle invalid approval status', async () => {
      req.params = { id: '1' };
      req.body = { approvalStatus: 'invalid' };

      await updateApprovalStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          status: 400,
          message: expect.stringContaining('Invalid approval status')
        }
      });
    });
  });

  describe('Security and Authorization', () => {
    it('should prevent unauthorized access to carnival management', async () => {
      req.user = createMockUser({ id: 2 }); // Different user
      Carnival.findOne.mockResolvedValue(null); // No carnival found for this user

      await showCarnivalAttendees(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Carnival not found or you do not have permission to manage it.');
      expect(res.redirect).toHaveBeenCalledWith('/carnivals');
    });

    it('should prevent registration without club association', async () => {
      req.user = createMockUser({ clubId: null });

      await registerMyClubForCarnival(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'You must be associated with a club to register for carnivals.');
      expect(res.redirect).toHaveBeenCalledWith('/carnivals/1');
    });

    it('should prevent cross-carnival player management', async () => {
      req.user = createMockUser({ id: 2 }); // Different user
      Carnival.findOne.mockResolvedValue(null); // No carnival found

      await showCarnivalClubPlayers(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Carnival not found or you do not have permission to manage it.');
      expect(res.redirect).toHaveBeenCalledWith('/carnivals');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      Carnival.findOne.mockRejectedValue(dbError);

      // Since the controller functions are wrapped with asyncHandler,
      // errors should be caught and passed to next() automatically
      await expect(showCarnivalAttendees(req, res, next)).rejects.toThrow('Database connection failed');
    });

    it('should handle validation errors during registration', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Invalid player count' }]
      });

      await registerClubForCarnival(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Please correct the validation errors.');
      expect(res.redirect).toHaveBeenCalledWith('/carnivals/1/attendees/add');
    });

    it('should handle missing carnival in approval workflow', async () => {
      req.params = { id: '999' };
      req.body = { approvalStatus: 'approved' };

      CarnivalClub.findByPk.mockResolvedValue(null);

      await updateApprovalStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          status: 404,
          message: 'Carnival club registration not found'
        }
      });
    });
  });
});