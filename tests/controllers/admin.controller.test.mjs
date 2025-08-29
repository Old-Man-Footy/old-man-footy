/**
 * Admin Controller Tests
 * 
 * Comprehensive test suite for administrative functionality following the proven pattern 
 * from club, main, and carnival controllers with 100% success rate implementation.
 * 
 * Covers user management, club administration, carnival management, system operations,
 * audit logging, sponsor management, and advanced administrative workflows.
 * 
 * @author Old Man Footy System
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { sequelize } from '../../config/database.mjs';
import { Op } from 'sequelize';

// Mock the asyncHandler middleware to prevent wrapping issues
vi.mock('/middleware/asyncHandler.mjs', () => ({
  asyncHandler: (fn) => fn,
  wrapControllers: (controllers) => controllers,
  default: (fn) => fn
}));

// Mock express-validator
vi.mock('express-validator', () => ({
  validationResult: vi.fn(() => ({
    isEmpty: () => true,
    array: () => []
  }))
}));

// Mock all model imports before importing the controller
vi.mock('/models/index.mjs', () => {
  const mockSequelize = {
    transaction: vi.fn().mockResolvedValue({
      commit: vi.fn(),
      rollback: vi.fn()
    }),
    where: vi.fn(),
    fn: vi.fn(),
    col: vi.fn()
  };

  const createMockUser = (overrides = {}) => ({
    id: 1,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    clubId: 1,
    isPrimaryDelegate: false,
    isAdmin: false,
    isActive: true,
    phoneNumber: '1234567890',
    lastLoginAt: new Date(),
    passwordResetToken: null,
    passwordResetExpiry: null,
    club: null,
    update: vi.fn().mockResolvedValue(true),
    toJSON: vi.fn().mockImplementation(function () {
      const { toJSON, update, ...rest } = this;
      return { ...rest, ...overrides };
    }),
    ...overrides
  });

  const createMockClub = (overrides = {}) => ({
    id: 1,
    clubName: 'Test Club',
    state: 'NSW',
    location: 'Sydney',
    isActive: true,
    isPubliclyListed: true,
    logoUrl: '/uploads/logo.jpg',
    contactEmail: 'contact@testclub.com',
    contactPhone: '0987654321',
    delegates: [],
    update: vi.fn().mockResolvedValue(true),
    toJSON: vi.fn().mockImplementation(function () {
      const { toJSON, update, ...rest } = this;
      return { ...rest, ...overrides };
    }),
    ...overrides
  });

  const createMockCarnival = (overrides = {}) => ({
    id: 1,
    title: 'Test Carnival',
    date: new Date('2025-12-25'),
    endDate: null,
    locationAddress: 'Sydney Sports Centre',
    state: 'NSW',
    isActive: true,
    isManuallyEntered: true,
    createdByUserId: 1,
    clubId: 1,
    lastMySidelineSync: null,
    creator: null,
    update: vi.fn().mockResolvedValue(true),
    toJSON: vi.fn().mockImplementation(function () {
      const { toJSON, update, ...rest } = this;
      return { ...rest, ...overrides };
    }),
    ...overrides
  });

  const createMockSponsor = (overrides = {}) => ({
    id: 1,
    sponsorName: 'Test Sponsor',
    businessType: 'Local Business',
    state: 'NSW',
    location: 'Sydney',
    isActive: true,
    isPubliclyVisible: true,
    clubs: [],
    update: vi.fn().mockResolvedValue(true),
    toJSON: vi.fn().mockImplementation(function () {
      const { toJSON, update, ...rest } = this;
      return { ...rest, ...overrides };
    }),
    ...overrides
  });

  const createMockAuditLog = (overrides = {}) => ({
    id: 1,
    userId: 1,
    action: 'USER_UPDATE',
    entityType: 'USER',
    entityId: '1',
    result: 'SUCCESS',
    ipAddress: '127.0.0.1',
    createdAt: new Date(),
    user: null,
    ...overrides
  });

  return {
    User: {
      findAll: vi.fn(),
      findOne: vi.fn(),
      findByPk: vi.fn(),
      findAndCountAll: vi.fn(),
      count: vi.fn()
    },
    Club: {
      findAll: vi.fn(),
      findByPk: vi.fn(),
      findAndCountAll: vi.fn(),
      count: vi.fn()
    },
    Carnival: {
      findAll: vi.fn(),
      findByPk: vi.fn(),
      findAndCountAll: vi.fn(),
      count: vi.fn(),
      adminClaimOnBehalf: vi.fn()
    },
    Sponsor: {
      findAll: vi.fn(),
      findByPk: vi.fn(),
      findAndCountAll: vi.fn(),
      count: vi.fn()
    },
    EmailSubscription: {
      count: vi.fn()
    },
    AuditLog: {
      findAll: vi.fn(),
      findAndCountAll: vi.fn(),
      getAuditStatistics: vi.fn()
    },
    CarnivalClub: {
      findAll: vi.fn()
    },
    CarnivalClubPlayer: {},
    ClubPlayer: {
      calculateAge: vi.fn()
    },
    sequelize: mockSequelize,
    createMockUser,
    createMockClub,
    createMockCarnival,
    createMockSponsor,
    createMockAuditLog,
    Op: {
      gte: Symbol('gte'),
      ne: Symbol('ne'),
      like: Symbol('like'),
      or: Symbol('or'),
      and: Symbol('and'),
      between: Symbol('between'),
      lte: Symbol('lte'),
      lt: Symbol('lt')
    },
    fn: vi.fn()
  };
});

// Mock services
vi.mock('/services/email/AuthEmailService.mjs', () => ({
  default: {
    sendPasswordResetEmail: vi.fn().mockResolvedValue(true)
  }
}));

vi.mock('/services/auditService.mjs', () => ({
  default: {
    logAdminAction: vi.fn().mockResolvedValue(true),
    sanitizeData: vi.fn((data) => data),
    formatAuditLog: vi.fn((log) => log),
    ACTIONS: {
      USER_UPDATE: 'USER_UPDATE',
      USER_PASSWORD_RESET: 'USER_PASSWORD_RESET',
      USER_ACTIVATE: 'USER_ACTIVATE',
      USER_DEACTIVATE: 'USER_DEACTIVATE',
      USER_DELETE: 'USER_DELETE',
      CLUB_ACTIVATE: 'CLUB_ACTIVATE',
      CLUB_DEACTIVATE: 'CLUB_DEACTIVATE',
      CLUB_SHOW: 'CLUB_SHOW',
      CLUB_HIDE: 'CLUB_HIDE',
      CARNIVAL_ACTIVATE: 'CARNIVAL_ACTIVATE',
      CARNIVAL_DEACTIVATE: 'CARNIVAL_DEACTIVATE',
      SPONSOR_DEACTIVATE: 'SPONSOR_DEACTIVATE',
      ADMIN_DATA_EXPORT: 'ADMIN_DATA_EXPORT',
      ADMIN_SYSTEM_SYNC: 'ADMIN_SYSTEM_SYNC'
    },
    ENTITIES: {
      USER: 'USER',
      CLUB: 'CLUB',
      CARNIVAL: 'CARNIVAL',
      SPONSOR: 'SPONSOR',
      SYSTEM: 'SYSTEM'
    }
  }
}));

vi.mock('/services/mySidelineIntegrationService.mjs', () => ({
  default: {
    syncMySidelineEvents: vi.fn().mockResolvedValue({
      success: true,
      eventsProcessed: 10,
      eventsCreated: 5,
      eventsUpdated: 3
    })
  }
}));

// Mock crypto
vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn().mockReturnValue({
      toString: vi.fn().mockReturnValue('random-token-string')
    })
  }
}));

// Now import the controller and dependencies
import {
  getAdminDashboard,
  getUserManagement,
  showEditUser,
  updateUser,
  issuePasswordReset,
  toggleUserStatus,
  getClubManagement,
  showEditClub,
  updateClub,
  deactivateClub,
  getCarnivalManagement,
  showEditCarnival,
  updateCarnival,
  toggleCarnivalStatus,
  toggleClubStatus,
  toggleClubVisibility,
  generateReport,
  deleteUser,
  showClaimCarnivalForm,
  adminClaimCarnival,
  showCarnivalPlayers,
  getSponsorManagement,
  showEditSponsor,
  deleteSponsor,
  getAuditLogs,
  getAuditStatistics,
  exportAuditLogs,
  syncMySideline
} from '../../controllers/admin.controller.mjs';

import {
  User,
  Club,
  Carnival,
  Sponsor,
  EmailSubscription,
  AuditLog,
  CarnivalClub,
  CarnivalClubPlayer,
  ClubPlayer,
  sequelize as mockSequelize,
  createMockUser,
  createMockClub,
  createMockCarnival,
  createMockSponsor,
  createMockAuditLog,
  Op,
  fn
} from '../../models/index.mjs';

import AuditService from '../../services/auditService.mjs';
import AuthEmailService from '../../services/email/AuthEmailService.mjs';
import mySidelineService from '../../services/mySidelineIntegrationService.mjs';
import crypto from 'crypto';
import { validationResult } from 'express-validator';

describe('Admin Controller', () => {
  let req, res, next;

    beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock request object
    req = {
      params: {},
      query: {},
      body: {},
      user: createMockUser({ id: 1, isAdmin: true, email: 'admin@example.com' }),
      flash: vi.fn(),
      structuredUploads: null
    };

    // Mock response object
    res = {
      render: vi.fn(),
      redirect: vi.fn(),
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      send: vi.fn()
    };

    // Mock next function
    next = vi.fn();

    // Set up default model mocks
    User.findAll.mockResolvedValue([]);
    User.findOne.mockResolvedValue(null);
    User.findByPk.mockResolvedValue(null);
    User.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    User.count.mockResolvedValue(0);

    Club.findAll.mockResolvedValue([]);
    Club.findByPk.mockResolvedValue(null);
    Club.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    Club.count.mockResolvedValue(0);

    Carnival.findAll.mockResolvedValue([]);
    Carnival.findByPk.mockResolvedValue(null);
    Carnival.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    Carnival.count.mockResolvedValue(0);
    Carnival.adminClaimOnBehalf.mockResolvedValue({ success: true, message: 'Carnival claimed successfully' });

    Sponsor.findAll.mockResolvedValue([]);
    Sponsor.findByPk.mockResolvedValue(null);
    Sponsor.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    Sponsor.count.mockResolvedValue(0);

    EmailSubscription.count.mockResolvedValue(0);

    AuditLog.findAll.mockResolvedValue([]);
    AuditLog.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    AuditLog.getAuditStatistics.mockResolvedValue({});

    CarnivalClub.findAll.mockResolvedValue([]);
    ClubPlayer.calculateAge.mockReturnValue(35);

    // Mock validation to return no errors by default
    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => []
    });

    // Mock services
    AuditService.logAdminAction.mockResolvedValue(true);
    AuthEmailService.sendPasswordResetEmail.mockResolvedValue(true);
    mySidelineService.syncMySidelineEvents.mockResolvedValue({
      success: true,
      eventsProcessed: 10,
      eventsCreated: 5,
      eventsUpdated: 3
    });

    // Mock crypto
    crypto.randomBytes.mockReturnValue({
      toString: vi.fn().mockReturnValue('random-token-string')
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Admin Dashboard', () => {
    it('should display admin dashboard with system statistics', async () => {
      // Mock system statistics data
      User.count.mockImplementation(({ where } = {}) => {
        if (!where) return Promise.resolve(100);
        if (where.isActive === false) return Promise.resolve(5);
        if (where.createdAt) return Promise.resolve(10);
        return Promise.resolve(0);
      });

      Club.count.mockImplementation(({ where } = {}) => {
        if (!where) return Promise.resolve(50);
        if (where.isActive === false) return Promise.resolve(3);
        return Promise.resolve(0);
      });

      Carnival.count.mockImplementation(({ where } = {}) => {
        if (where.isActive === true && where.date) return Promise.resolve(8);
        if (where.isActive === true && where.createdAt) return Promise.resolve(5);
        return Promise.resolve(25);
      });

      Sponsor.count.mockResolvedValue(15);
      EmailSubscription.count.mockResolvedValue(200);

      // Mock recent activity
      User.findAll.mockResolvedValue([
        createMockUser({ id: 1, firstName: 'John', lastName: 'Doe' }),
        createMockUser({ id: 2, firstName: 'Jane', lastName: 'Smith' })
      ]);

      Carnival.findAll.mockResolvedValue([
        createMockCarnival({ id: 1, title: 'Test Carnival 1' }),
        createMockCarnival({ id: 2, title: 'Test Carnival 2' })
      ]);

      await getAdminDashboard(req, res);

      expect(res.render).toHaveBeenCalledWith('admin/dashboard', expect.objectContaining({
        title: 'Administrator Dashboard - Old Man Footy',
        stats: expect.objectContaining({
          totalUsers: 100,
          totalClubs: 50,
          totalCarnivals: 25,
          totalSponsors: 15,
          totalSubscriptions: 200,
          inactiveUsers: 5,
          inactiveClubs: 3
        }),
        recentActivity: expect.objectContaining({
          users: expect.any(Array),
          carnivals: expect.any(Array)
        }),
        additionalCSS: ['/styles/admin.styles.css']
      }));
    });
  });

  describe('User Management', () => {
    it('should display user management page with pagination and filters', async () => {
      const mockUsers = [
        createMockUser({ id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' }),
        createMockUser({ id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' })
      ];

      User.findAndCountAll.mockResolvedValue({
        count: 50,
        rows: mockUsers
      });

      req.query = { page: '1', search: 'john', status: 'active' };

      await getUserManagement(req, res);

      expect(User.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          [Op.or]: expect.any(Array),
          isActive: true
        }),
        include: expect.arrayContaining([
          expect.objectContaining({
            model: Club,
            as: 'club'
          })
        ]),
        order: [['createdAt', 'DESC']],
        limit: 20,
        offset: 0
      }));

      expect(res.render).toHaveBeenCalledWith('admin/users', expect.objectContaining({
        title: 'User Management - Admin Dashboard',
        users: mockUsers,
        filters: expect.objectContaining({
          search: 'john',
          status: 'active'
        }),
        pagination: expect.objectContaining({
          currentPage: 1,
          totalPages: 3,
          totalItems: 50
        })
      }));
    });

    it('should show edit user form with user details and clubs', async () => {
      const mockUser = createMockUser({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        club: createMockClub()
      });

      const mockClubs = [
        createMockClub({ id: 1, clubName: 'Club A' }),
        createMockClub({ id: 2, clubName: 'Club B' })
      ];

      req.params.id = '1';
      User.findByPk.mockResolvedValue(mockUser);
      Club.findAll.mockResolvedValue(mockClubs);

      await showEditUser(req, res);

      expect(User.findByPk).toHaveBeenCalledWith('1', expect.objectContaining({
        include: expect.arrayContaining([
          expect.objectContaining({
            model: Club,
            as: 'club'
          })
        ])
      }));

      expect(res.render).toHaveBeenCalledWith('admin/edit-user', expect.objectContaining({
        title: 'Edit John Doe - Admin Dashboard',
        editUser: mockUser,
        clubs: mockClubs
      }));
    });

    it('should update user successfully with audit logging', async () => {
      const mockUser = createMockUser({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        isAdmin: false // Start with false to test the conversion
      });

      req.params.id = '1';
      req.body = {
        firstName: 'Johnny',
        lastName: 'Doe',
        email: 'johnny@example.com',
        clubId: '2',
        isPrimaryDelegate: 'true',
        isAdmin: 'true', // This should convert to true via !!isAdmin
        isActive: 'true'
      };

      User.findByPk.mockResolvedValue(mockUser);
      User.findOne.mockResolvedValue(null); // No email conflict

      await updateUser(req, res);

      // The controller converts string values to booleans using !!
      expect(mockUser.update).toHaveBeenCalledWith({
        firstName: 'Johnny',
        lastName: 'Doe',
        email: 'johnny@example.com',
        clubId: '2',
        isPrimaryDelegate: true,
        isAdmin: true, // Should be true when 'true' string is passed
        isActive: true
      });

      expect(AuditService.logAdminAction).toHaveBeenCalledWith(
        AuditService.ACTIONS.USER_UPDATE,
        req,
        AuditService.ENTITIES.USER,
        '1',
        expect.objectContaining({
          oldValues: expect.any(Object),
          newValues: expect.any(Object),
          targetUserId: '1'
        })
      );

      expect(req.flash).toHaveBeenCalledWith('success_msg', 'User Johnny Doe has been updated successfully');
      expect(res.redirect).toHaveBeenCalledWith('/admin/users');
    });

    it('should handle email conflict during user update', async () => {
      const mockUser = createMockUser({
        id: 1,
        email: 'john@example.com'
      });

      const conflictUser = createMockUser({
        id: 2,
        email: 'existing@example.com'
      });

      req.params.id = '1';
      req.body = { email: 'existing@example.com' };

      User.findByPk.mockResolvedValue(mockUser);
      User.findOne.mockResolvedValue(conflictUser); // Email conflict

      await updateUser(req, res);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Email address is already in use by another user');
      expect(res.redirect).toHaveBeenCalledWith('/admin/users/1/edit');
    });

    it('should issue password reset with email notification', async () => {
      const mockUser = createMockUser({
        id: 1,
        firstName: 'John',
        email: 'john@example.com'
      });

      req.params.id = '1';
      User.findByPk.mockResolvedValue(mockUser);

      await issuePasswordReset(req, res);

      expect(mockUser.update).toHaveBeenCalledWith(expect.objectContaining({
        passwordResetToken: 'random-token-string',
        passwordResetExpiry: expect.any(Date)
      }));

      expect(AuthEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'john@example.com',
        'John',
        expect.stringContaining('random-token-string')
      );

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset email sent to john@example.com'
      });
    });

    it('should toggle user status with audit logging', async () => {
      const mockUser = createMockUser({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        isActive: true
      });

      req.params.id = '1';
      req.body = { isActive: false };

      User.findByPk.mockResolvedValue(mockUser);

      await toggleUserStatus(req, res);

      expect(mockUser.update).toHaveBeenCalledWith({ isActive: false });

      expect(AuditService.logAdminAction).toHaveBeenCalledWith(
        AuditService.ACTIONS.USER_DEACTIVATE,
        req,
        AuditService.ENTITIES.USER,
        '1',
        expect.objectContaining({
          oldValues: { isActive: true },
          newValues: { isActive: false }
        })
      );

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User "John Doe" has been deactivated successfully',
        newStatus: false
      });
    });

    it('should delete user with proper safeguards and delegation transfer', async () => {
      // Mock for the admin performing the action
      const mockCurrentUser = { id: 99, email: 'admin@example.com', isAdmin: true };
  
      // Mock for the user being deleted, including the nested club and an update method
      const mockUser = createMockUser({
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          isPrimaryDelegate: true,
          clubId: 1,
          club: { clubName: 'Test Club' },
          update: vi.fn().mockResolvedValue(this)
      });
  
      // Mock for the delegate receiving the new role, including an update method
      const alternateDelegate = createMockUser({
          id: 2,
          isPrimaryDelegate: false,
          clubId: 1,
          update: vi.fn().mockResolvedValue(this)
      });
  
      // Mock transaction
      const mockTransaction = {
          commit: vi.fn(),
          rollback: vi.fn()
      };
      mockSequelize.transaction.mockResolvedValue(mockTransaction);
  
      // Set up request and response objects
      // The ID from req.params is always a string, so we mock it as '1'.
      const req = { params: { id: '1' }, user: mockCurrentUser };
      const res = { json: vi.fn(), status: vi.fn(() => res) };
  
      // --- CHANGE IS HERE ---
      // Replace the generic mock with a specific implementation.
      // This ensures the mock only works when called exactly like it is in the handler
      // (with an ID and an options object), fixing the "user not found" issue.
      User.findByPk.mockImplementation((id, options) => {
          if (id === '1' && options && options.include) {
              return Promise.resolve(mockUser);
          }
          return Promise.resolve(null);
      });
  
      User.findOne.mockResolvedValue(alternateDelegate);
  
      // Execute delete user
      await deleteUser(req, res);
  
      // 1. Verify the mock was called exactly once.
      expect(User.findOne).toHaveBeenCalledTimes(1);

      // 2. Get the arguments from the actual call to the mock.
      const findOneCallArgs = User.findOne.mock.calls[0][0];

      // 3. Verify the simple values within the 'where' clause.
      expect(findOneCallArgs.where.clubId).toBe(1);
      expect(findOneCallArgs.where.isActive).toBe(true);
      expect(findOneCallArgs.where.isPrimaryDelegate).toBe(false);

      // 4. Verify the [Op.ne] value without comparing the symbol itself.
      // First, get an array of all symbol keys used in the 'id' object.
      const idConditionSymbols = Object.getOwnPropertySymbols(findOneCallArgs.where.id);
      
      // There should be exactly one symbol key ([Op.ne]).
      expect(idConditionSymbols.length).toBe(1);
      
      // Now, get the value using the *actual symbol key from the handler's call*.
      const notEqualValue = findOneCallArgs.where.id[idConditionSymbols[0]];
      
      // Finally, assert that the value matches the user's ID.
      expect(notEqualValue).toBe(1);

      // 5. Verify that the correct transaction object instance was passed.
      expect(findOneCallArgs.transaction).toBe(mockTransaction);      
  });

    it('should prevent admin from deleting their own account', async () => {
      const mockUser = createMockUser({ id: 1 });
      req.params.id = '1';
      req.user.id = 1; // Same as target user

      User.findByPk.mockResolvedValue(mockUser);

      await deleteUser(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You cannot delete your own account'
      });
    });
  });

  describe('Club Management', () => {
    it('should display club management page with filters and pagination', async () => {
      const mockClubs = [
        createMockClub({
          id: 1,
          clubName: 'Test Club A',
          delegates: [createMockUser({ isPrimaryDelegate: true })]
        }),
        createMockClub({
          id: 2,
          clubName: 'Test Club B',
          delegates: []
        })
      ];

      Club.findAndCountAll.mockResolvedValue({
        count: 25,
        rows: mockClubs
      });

      req.query = { search: 'test', state: 'NSW', status: 'active' };

      await getClubManagement(req, res);

      expect(Club.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          clubName: expect.objectContaining({
            [Op.like]: '%test%'
          }),
          state: 'NSW',
          isActive: true
        },
        include: [
          { 
            model: User, 
            as: 'delegates',
            where: { 
              isPrimaryDelegate: true,
              isActive: true 
            },
            required: false,
            attributes: ['id', 'firstName', 'lastName', 'email', 'isPrimaryDelegate']
          }
        ],
        order: [['clubName', 'ASC']],
        limit: 20,
        offset: 0
      }));

      expect(res.render).toHaveBeenCalledWith('admin/clubs', expect.objectContaining({
        title: 'Club Management - Admin Dashboard',
        clubs: expect.any(Array),
        filters: expect.objectContaining({
          search: 'test',
          state: 'NSW',
          status: 'active'
        })
      }));
    });

    it('should show edit club form with club details', async () => {
      const mockClub = createMockClub({
        id: 1,
        clubName: 'Test Club',
        delegates: [createMockUser({ isPrimaryDelegate: true })]
      });

      req.params.id = '1';
      Club.findByPk.mockResolvedValue(mockClub);

      await showEditClub(req, res);

      expect(res.render).toHaveBeenCalledWith('admin/edit-club', expect.objectContaining({
        title: 'Edit Test Club - Admin Dashboard',
        club: expect.objectContaining({
          clubName: 'Test Club',
          primaryDelegate: expect.any(Object)
        })
      }));
    });

    it('should update club with file upload handling', async () => {
      const mockClub = createMockClub({ id: 1, clubName: 'Test Club' });

      req.params.id = '1';
      req.body = {
        clubName: 'Updated Club',
        state: 'VIC',
        location: 'Melbourne',
        isActive: 'true',
        isPubliclyListed: 'true'
      };
      req.structuredUploads = [
        {
          fieldname: 'logo',
          path: '/uploads/new-logo.jpg',
          originalname: 'logo.jpg'
        }
      ];

      Club.findByPk.mockResolvedValue(mockClub);

      await updateClub(req, res);

      expect(mockClub.update).toHaveBeenCalledWith(expect.objectContaining({
        clubName: 'Updated Club',
        state: 'VIC',
        location: 'Melbourne',
        logoUrl: '/uploads/new-logo.jpg',
        isActive: true,
        isPubliclyListed: true
      }));

      expect(req.flash).toHaveBeenCalledWith(
        'success_msg',
        'Club Updated Club has been updated successfully, including new logo upload'
      );
    });

    it('should deactivate club with proper warnings about delegates and carnivals', async () => {
      const mockClub = createMockClub({
        id: 1,
        clubName: 'Test Club',
        isActive: true,
        delegates: [
          createMockUser({ id: 1, isActive: true }),
          createMockUser({ id: 2, isActive: true })
        ]
      });

      // Mock transaction properly
      const mockTransaction = {
        commit: vi.fn(),
        rollback: vi.fn()
      };
      mockSequelize.transaction.mockResolvedValue(mockTransaction);

      req.params.id = '1';
      Club.findByPk.mockResolvedValue(mockClub);
      Carnival.count.mockResolvedValue(3);

      await deactivateClub(req, res);

      expect(mockClub.update).toHaveBeenCalledWith({
        isActive: false,
        isPubliclyListed: false,
        updatedAt: expect.any(Date)
      }, { transaction: mockTransaction });

      expect(mockTransaction.commit).toHaveBeenCalled();

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: expect.stringContaining('2 active delegate(s)'),
        action: 'deactivated'
      });
    });

    it('should toggle club status', async () => {
      const mockClub = createMockClub({
        id: 1,
        clubName: 'Test Club',
        isActive: true
      });

      req.params.id = '1';
      req.body = { isActive: false };

      Club.findByPk.mockResolvedValue(mockClub);

      await toggleClubStatus(req, res);

      expect(mockClub.update).toHaveBeenCalledWith({ isActive: false });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Club "Test Club" has been deactivated successfully',
        newStatus: false
      });
    });

    it('should toggle club visibility', async () => {
      const mockClub = createMockClub({
        id: 1,
        clubName: 'Test Club',
        isPubliclyListed: true
      });

      req.params.id = '1';
      req.body = { isPubliclyListed: false };

      Club.findByPk.mockResolvedValue(mockClub);

      await toggleClubVisibility(req, res);

      expect(mockClub.update).toHaveBeenCalledWith({ isPubliclyListed: false });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Club "Test Club" is now hidden from public listing',
        newVisibility: false
      });
    });
  });

  describe('Carnival Management', () => {
    it('should display carnival management page with filtering', async () => {
      const mockCarnivals = [
        createMockCarnival({
          id: 1,
          title: 'Test Carnival 1',
          creator: createMockUser()
        }),
        createMockCarnival({
          id: 2,
          title: 'Test Carnival 2',
          creator: createMockUser()
        })
      ];

      Carnival.findAndCountAll.mockResolvedValue({
        count: 15,
        rows: mockCarnivals
      });

      req.query = { search: 'test', state: 'NSW', status: 'upcoming' };

      await getCarnivalManagement(req, res);

      expect(Carnival.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          title: expect.objectContaining({
            [Op.like]: '%test%'
          }),
          state: 'NSW',
          date: expect.objectContaining({
            [Op.gte]: expect.any(Date)
          })
        }),
        include: [{ model: User, as: 'creator' }],
        order: [['date', 'DESC']],
        limit: 20,
        offset: 0
      }));

      expect(res.render).toHaveBeenCalledWith('admin/carnivals', expect.objectContaining({
        title: 'Carnival Management - Admin Dashboard',
        carnivals: mockCarnivals
      }));
    });

    it('should show edit carnival form', async () => {
      const mockCarnival = createMockCarnival({
        id: 1,
        title: 'Test Carnival',
        creator: createMockUser()
      });

      req.params.id = '1';
      Carnival.findByPk.mockResolvedValue(mockCarnival);

      await showEditCarnival(req, res);

      expect(res.render).toHaveBeenCalledWith('admin/edit-carnival', expect.objectContaining({
        title: 'Edit Test Carnival - Admin Dashboard',
        carnival: mockCarnival
      }));
    });

    it('should update carnival with file uploads', async () => {
      const mockCarnival = createMockCarnival({
        id: 1,
        title: 'Test Carnival',
        additionalImages: [],
        drawFiles: []
      });

      req.params.id = '1';
      req.body = {
        title: 'Updated Carnival',
        date: '2025-12-26',
        locationAddress: 'Updated Location',
        state: 'VIC',
        isActive: 'true'
      };
      req.structuredUploads = [
        {
          fieldname: 'logo',
          path: '/uploads/carnival-logo.jpg',
          originalname: 'logo.jpg'
        },
        {
          fieldname: 'drawFile',
          path: '/uploads/draw.pdf',
          originalname: 'draw.pdf',
          metadata: { size: 1024 }
        }
      ];

      Carnival.findByPk.mockResolvedValue(mockCarnival);

      await updateCarnival(req, res);

      expect(mockCarnival.update).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Updated Carnival',
        date: expect.any(Date),
        locationAddress: 'Updated Location',
        state: 'VIC',
        isActive: true,
        clubLogoURL: '/uploads/carnival-logo.jpg',
        drawFiles: expect.arrayContaining([
          expect.objectContaining({
            url: '/uploads/draw.pdf',
            filename: 'draw.pdf'
          })
        ])
      }));

      expect(req.flash).toHaveBeenCalledWith(
        'success_msg',
        'Carnival Updated Carnival has been updated successfully, including 2 file upload(s)'
      );
    });

    it('should toggle carnival status', async () => {
      const mockCarnival = createMockCarnival({
        id: 1,
        title: 'Test Carnival',
        isActive: true
      });

      req.params.id = '1';
      req.body = { isActive: false };

      Carnival.findByPk.mockResolvedValue(mockCarnival);

      await toggleCarnivalStatus(req, res);

      expect(mockCarnival.update).toHaveBeenCalledWith({ isActive: false });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Carnival "Test Carnival" has been deactivated successfully',
        newStatus: false
      });
    });

    it('should show claim carnival form for MySideline events', async () => {
      const mockCarnival = createMockCarnival({
        id: 1,
        title: 'MySideline Carnival',
        isManuallyEntered: false,
        lastMySidelineSync: new Date(),
        createdByUserId: null
      });

      const mockClubs = [
        createMockClub({
          id: 1,
          clubName: 'Club A',
          delegates: [createMockUser({ isPrimaryDelegate: true })]
        })
      ];

      req.params.id = '1';
      Carnival.findByPk.mockResolvedValue(mockCarnival);
      Club.findAll.mockResolvedValue(mockClubs);

      await showClaimCarnivalForm(req, res);

      expect(res.render).toHaveBeenCalledWith('admin/claim-carnival', expect.objectContaining({
        title: 'Claim Carnival - MySideline Carnival',
        carnival: mockCarnival,
        clubs: mockClubs
      }));
    });

    it('should process admin claim carnival on behalf of club', async () => {
      req.params.id = '1';
      req.body = { targetClubId: '2' };

      Carnival.adminClaimOnBehalf.mockResolvedValue({
        success: true,
        message: 'Carnival claimed successfully for Test Club'
      });

      await adminClaimCarnival(req, res);

      expect(Carnival.adminClaimOnBehalf).toHaveBeenCalledWith('1', 1, 2);
      expect(req.flash).toHaveBeenCalledWith('success_msg', 'Carnival claimed successfully for Test Club');
      expect(res.redirect).toHaveBeenCalledWith('/admin/carnivals');
    });

    it('should show comprehensive carnival players list', async () => {
      const mockCarnival = createMockCarnival({
        id: 1,
        title: 'Test Carnival'
      });

      const mockRegistrations = [
        {
          participatingClub: { id: 1, clubName: 'Club A', state: 'NSW' },
          playerAssignments: [
            {
              attendanceStatus: 'confirmed',
              clubPlayer: {
                id: 1,
                firstName: 'John',
                lastName: 'Player',
                dateOfBirth: new Date('1980-01-01'),
                email: 'john@example.com'
              }
            }
          ]
        }
      ];

      req.params.id = '1';
      Carnival.findByPk.mockResolvedValue(mockCarnival);
      CarnivalClub.findAll.mockResolvedValue(mockRegistrations);
      ClubPlayer.calculateAge.mockReturnValue(45);

      await showCarnivalPlayers(req, res);

      expect(res.render).toHaveBeenCalledWith('admin/carnival-players', expect.objectContaining({
        title: 'All Players - Test Carnival (Admin View)',
        carnival: mockCarnival,
        allPlayers: expect.any(Array),
        clubSummary: expect.any(Object),
        totalPlayers: expect.any(Number)
      }));
    });
  });

  describe('System Operations', () => {
    it('should generate comprehensive system reports', async () => {
      // Mock various count queries for the report
      User.count.mockImplementation(({ where } = {}) => {
        if (!where) return Promise.resolve(150);
        if (where.isActive === true) return Promise.resolve(140);
        if (where.isActive === false) return Promise.resolve(10);
        if (where.isAdmin === true) return Promise.resolve(5);
        if (where.isPrimaryDelegate === true) return Promise.resolve(30);
        if (where.lastLoginAt) return Promise.resolve(80);
        return Promise.resolve(0);
      });

      Club.count.mockResolvedValue(45);
      Club.findAll.mockResolvedValue([
        { state: 'NSW', count: 20 },
        { state: 'VIC', count: 15 },
        { state: 'QLD', count: 10 }
      ]);

      Carnival.count.mockResolvedValue(30);
      Carnival.findAll.mockResolvedValue([
        { state: 'NSW', count: 15 },
        { state: 'VIC', count: 10 },
        { state: 'QLD', count: 5 }
      ]);

      Sponsor.count.mockResolvedValue(25);
      EmailSubscription.count.mockResolvedValue(300);

      await generateReport(req, res);

      expect(res.render).toHaveBeenCalledWith('admin/reports', expect.objectContaining({
        title: 'System Reports - Admin Dashboard',
        report: expect.objectContaining({
          generatedAt: expect.any(Date),
          users: expect.objectContaining({
            total: 150,
            active: 140,
            inactive: 10,
            admins: 5,
            primaryDelegates: 30
          }),
          clubs: expect.objectContaining({
            total: 45,
            byState: expect.any(Array)
          }),
          carnivals: expect.objectContaining({
            total: 30,
            byState: expect.any(Array)
          })
        })
      }));
    });

    it('should trigger MySideline sync manually', async () => {
      mySidelineService.syncMySidelineEvents.mockResolvedValue({
        success: true,
        eventsProcessed: 15,
        eventsCreated: 8,
        eventsUpdated: 4
      });

      await syncMySideline(req, res);

      expect(mySidelineService.syncMySidelineEvents).toHaveBeenCalled();
      expect(AuditService.logAdminAction).toHaveBeenCalledWith(
        AuditService.ACTIONS.ADMIN_SYSTEM_SYNC,
        req,
        AuditService.ENTITIES.SYSTEM,
        null,
        expect.objectContaining({
          metadata: expect.objectContaining({
            adminAction: 'Manual MySideline sync triggered',
            syncResult: expect.objectContaining({
              success: true,
              eventsProcessed: 15,
              eventsCreated: 8,
              eventsUpdated: 4
            })
          })
        })
      );

      expect(req.flash).toHaveBeenCalledWith(
        'success_msg',
        'MySideline sync completed successfully! Processed 15 events (8 new, 4 updated)'
      );
      expect(res.redirect).toHaveBeenCalledWith('/admin/dashboard');
    });

    it('should handle MySideline sync failures', async () => {
      const syncError = new Error('Sync service unavailable');
      mySidelineService.syncMySidelineEvents.mockRejectedValue(syncError);

      await syncMySideline(req, res);

      expect(AuditService.logAdminAction).toHaveBeenCalledWith(
        AuditService.ACTIONS.ADMIN_SYSTEM_SYNC,
        req,
        AuditService.ENTITIES.SYSTEM,
        null,
        expect.objectContaining({
          result: 'FAILURE',
          errorMessage: 'Sync service unavailable'
        })
      );

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'MySideline sync failed: Sync service unavailable');
      expect(res.redirect).toHaveBeenCalledWith('/admin/dashboard');
    });
  });

  describe('Sponsor Management', () => {
    it('should display sponsor management page with filters', async () => {
      const mockSponsors = [
        createMockSponsor({
          id: 1,
          sponsorName: 'Test Sponsor A',
          clubs: [createMockClub()]
        }),
        createMockSponsor({
          id: 2,
          sponsorName: 'Test Sponsor B',
          clubs: []
        })
      ];

      Sponsor.findAndCountAll.mockResolvedValue({
        count: 20,
        rows: mockSponsors
      });

      req.query = { search: 'test', state: 'NSW', status: 'active' };

      await getSponsorManagement(req, res);

      expect(Sponsor.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          [Op.or]: expect.any(Array),
          state: 'NSW',
          isActive: true
        }),
        include: expect.arrayContaining([
          expect.objectContaining({
            model: Club,
            as: 'club'
          })
        ])
      }));

      expect(res.render).toHaveBeenCalledWith('admin/sponsors', expect.objectContaining({
        title: 'Sponsor Management - Admin Dashboard',
        sponsors: expect.any(Array)
      }));
    });

    it('should show edit sponsor form with club associations', async () => {
      const mockSponsor = createMockSponsor({
        id: 1,
        sponsorName: 'Test Sponsor',
        clubs: [createMockClub()]
      });

      const mockAllClubs = [
        createMockClub({ id: 1, clubName: 'Club A' }),
        createMockClub({ id: 2, clubName: 'Club B' })
      ];

      req.params.id = '1';
      Sponsor.findByPk.mockResolvedValue(mockSponsor);
      Club.findAll.mockResolvedValue(mockAllClubs);

      await showEditSponsor(req, res);

      expect(res.render).toHaveBeenCalledWith('admin/edit-sponsor', expect.objectContaining({
        title: 'Edit Test Sponsor - Admin Dashboard',
        sponsor: mockSponsor,
        allClubs: mockAllClubs
      }));
    });

    it('should delete sponsor with proper deactivation', async () => {
      const mockSponsor = createMockSponsor({
        id: 1,
        sponsorName: 'Test Sponsor',
        isActive: true,
        club: createMockClub({ id: 1, clubName: 'Club A' })
      });

      req.params.id = '1';
      Sponsor.findByPk.mockResolvedValue(mockSponsor);

      await deleteSponsor(req, res);

      expect(mockSponsor.update).toHaveBeenCalledWith({
        isActive: false,
        isPubliclyVisible: false,
        updatedAt: expect.any(Date)
      });

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: expect.stringContaining('Sponsor "Test Sponsor" has been deactivated successfully'),
        action: 'deactivated'
      });
    });
  });

  describe('Audit Management', () => {
    it('should display audit logs with filtering and pagination', async () => {
      const mockAuditLogs = [
        createMockAuditLog({
          id: 1,
          action: 'USER_UPDATE',
          user: createMockUser()
        }),
        createMockAuditLog({
          id: 2,
          action: 'CLUB_CREATE',
          user: createMockUser()
        })
      ];

      const mockUsers = [createMockUser()];
      const mockActions = [{ action: 'USER_UPDATE' }, { action: 'CLUB_CREATE' }];
      const mockEntityTypes = [{ entityType: 'USER' }, { entityType: 'CLUB' }];

      AuditLog.findAndCountAll.mockResolvedValue({
        count: 100,
        rows: mockAuditLogs
      });

      User.findAll.mockResolvedValue(mockUsers);
      AuditLog.findAll.mockImplementation((options) => {
        if (options.attributes && options.attributes.includes('action')) {
          return Promise.resolve(mockActions);
        }
        if (options.attributes && options.attributes.includes('entityType')) {
          return Promise.resolve(mockEntityTypes);
        }
        return Promise.resolve([]);
      });

      req.query = { userId: '1', action: 'USER_UPDATE', page: '1' };

      await getAuditLogs(req, res);

      expect(AuditLog.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          userId: 1,
          action: 'USER_UPDATE'
        }),
        include: expect.arrayContaining([
          expect.objectContaining({
            model: User,
            as: 'user'
          })
        ])
      }));

      expect(res.render).toHaveBeenCalledWith('admin/audit-logs', expect.objectContaining({
        title: 'Audit Logs - Admin Dashboard',
        auditLogs: expect.any(Array),
        filters: expect.objectContaining({
          userId: '1',
          action: 'USER_UPDATE'
        })
      }));
    });

    it('should get audit statistics', async () => {
      const mockStats = {
        totalActions: 500,
        successfulActions: 480,
        failedActions: 20,
        topActions: ['USER_UPDATE', 'CLUB_CREATE']
      };

      AuditLog.getAuditStatistics.mockResolvedValue(mockStats);

      await getAuditStatistics(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        stats: mockStats
      });
    });

    it('should export audit logs as CSV', async () => {
      const mockAuditLogs = [
        createMockAuditLog({
          id: 1,
          action: 'USER_UPDATE',
          createdAt: new Date('2025-01-01'),
          user: createMockUser({ firstName: 'John', lastName: 'Doe', email: 'john@example.com' })
        })
      ];

      req.query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        action: 'USER_UPDATE'
      };

      AuditLog.findAll.mockResolvedValue(mockAuditLogs);

      await exportAuditLogs(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('audit_logs_'));
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Timestamp,User,User Email'));
    });
  });

  describe('Error Handling', () => {
    it('should handle user not found in edit user', async () => {
      req.params.id = '999';
      User.findByPk.mockResolvedValue(null);

      await showEditUser(req, res);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'User not found');
      expect(res.redirect).toHaveBeenCalledWith('/admin/users');
    });

    it('should handle club not found in edit club', async () => {
      req.params.id = '999';
      Club.findByPk.mockResolvedValue(null);

      await showEditClub(req, res);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Club not found');
      expect(res.redirect).toHaveBeenCalledWith('/admin/clubs');
    });

    it('should handle carnival not found in edit carnival', async () => {
      req.params.id = '999';
      Carnival.findByPk.mockResolvedValue(null);

      await showEditCarnival(req, res);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Carnival not found');
      expect(res.redirect).toHaveBeenCalledWith('/admin/carnivals');
    });

    it('should handle validation errors in user update', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Email is invalid' }]
      });

      req.params.id = '1';

      await updateUser(req, res);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Email is invalid');
      expect(res.redirect).toHaveBeenCalledWith('/admin/users/1/edit');
    });

    it('should handle password reset for non-existent user', async () => {
      req.params.id = '999';
      User.findByPk.mockResolvedValue(null);

      await issuePasswordReset(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
    });

    it('should handle claim carnival form for manually entered carnival', async () => {
      const mockCarnival = createMockCarnival({
        id: 1,
        isManuallyEntered: true
      });

      req.params.id = '1';
      Carnival.findByPk.mockResolvedValue(mockCarnival);

      await showClaimCarnivalForm(req, res);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Can only claim ownership of MySideline imported events');
      expect(res.redirect).toHaveBeenCalledWith('/admin/carnivals');
    });
  });
});