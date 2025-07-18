/**
 * Carnival Controller Tests
 * 
 * Comprehensive test suite for the most complex controller in the system following the proven 
 * pattern from club.controller.test.mjs and main.controller.test.mjs with 100% success rate implementation.
 * 
 * Covers event management, file uploads, registration workflows, MySideline integration, and complex business logic.
 * 
 * @author Old Man Footy System
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { sequelize } from '/config/database.mjs';

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

  const createMockCarnival = (overrides = {}) => ({
    id: 1,
    title: 'Test Carnival',
    date: new Date('2025-12-25'),
    endDate: null,
    locationAddress: 'Sydney Sports Centre',
    locationSuburb: 'Olympic Park',
    locationPostcode: '2127',
    state: 'NSW',
    isActive: true,
    isManuallyEntered: true,
    createdByUserId: 1,
    clubId: 1,
    organiserContactName: 'John Doe',
    organiserContactEmail: 'john@example.com',
    organiserContactPhone: '1234567890',
    scheduleDetails: 'Games start at 9am',
    lastMySidelineSync: null,
    claimedAt: null,
    mySidelineId: null,
    creator: {
      firstName: 'John',
      lastName: 'Doe',
      club: { id: 1, clubName: 'Test Club' }
    },
    sponsors: [],
    attendingClubs: [],
    getPublicDisplayData: vi.fn().mockReturnValue({
      id: 1,
      title: 'Test Carnival',
      date: new Date('2025-12-25'),
      locationAddress: 'Sydney Sports Centre',
      state: 'NSW'
    }),
    canUserEditAsync: vi.fn().mockResolvedValue(true),
    update: vi.fn().mockResolvedValue(true),
    toJSON: vi.fn().mockImplementation(function () {
      const { toJSON, getPublicDisplayData, canUserEditAsync, update, ...rest } = this;
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
    contactPerson: 'Jane Smith',
    contactEmail: 'jane@testclub.com',
    contactPhone: '0987654321',
    toJSON: vi.fn().mockImplementation(function () {
      const { toJSON, ...rest } = this;
      return { ...rest, ...overrides };
    }),
    ...overrides
  });

  const createMockUser = (overrides = {}) => ({
    id: 1,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    clubId: 1,
    isPrimaryDelegate: false,
    isAdmin: false,
    phoneNumber: '1234567890',
    club: null,
    toJSON: vi.fn().mockImplementation(function () {
      const { toJSON, ...rest } = this;
      return { ...rest, ...overrides };
    }),
    ...overrides
  });

  const createMockCarnivalClub = (overrides = {}) => ({
    id: 1,
    carnivalId: 1,
    clubId: 1,
    approvalStatus: 'pending',
    isPaid: false,
    playerCount: 20,
    teamName: 'Test Team',
    contactPerson: 'Team Manager',
    registrationDate: new Date(),
    isActive: true,
    ...overrides
  });

  return {
    Carnival: {
      findAll: vi.fn(),
      findOne: vi.fn(),
      findByPk: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      takeOwnership: vi.fn(),
      releaseOwnership: vi.fn()
    },
    Club: {
      findAll: vi.fn(),
      findByPk: vi.fn()
    },
    User: {
      findByPk: vi.fn()
    },
    CarnivalClub: {
      findOne: vi.fn(),
      findAll: vi.fn()
    },
    ClubPlayer: {
      findAll: vi.fn()
    },
    CarnivalClubPlayer: {
      findAll: vi.fn()
    },
    Sponsor: {
      findAll: vi.fn()
    },
    sequelize: mockSequelize,
    createMockCarnival,
    createMockClub,
    createMockUser,
    createMockCarnivalClub,
    Op: {
      gte: Symbol('gte'),
      ne: Symbol('ne'),
      like: Symbol('like'),
      or: Symbol('or'),
      and: Symbol('and'),
      col: Symbol('col')
    }
  };
});

// Mock services
vi.mock('/services/mySidelineIntegrationService.mjs', () => ({
  default: {
    syncEvents: vi.fn().mockResolvedValue({ newEvents: 5 })
  }
}));

vi.mock('/services/emailService.mjs', () => ({
  default: {
    notifyNewCarnival: vi.fn().mockResolvedValue(true)
  }
}));

vi.mock('/services/sponsorSortingService.mjs', () => ({
  sortSponsorsHierarchically: vi.fn().mockReturnValue([])
}));

// Mock constants
vi.mock('/config/constants.mjs', () => ({
  AUSTRALIAN_STATES: ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA']
}));

// Now import the controller and dependencies
import {
  list,
  show,
  getNew,
  postNew,
  getEdit,
  postEdit,
  deleteCarnival,
  takeOwnership,
  releaseOwnership,
  syncMySideline,
  mergeCarnival,
  showCarnivalSponsors,
  addSponsorToCarnival,
  removeSponsorFromCarnival,
  sendEmailToAttendees,
  showAllPlayers,
  createOrMergeEvent
} from '/controllers/carnival.controller.mjs';

import {
  Carnival,
  Club,
  User,
  CarnivalClub,
  ClubPlayer,
  CarnivalClubPlayer,
  Sponsor,
  sequelize as mockSequelize,
  createMockCarnival,
  createMockClub,
  createMockUser,
  createMockCarnivalClub,
  Op
} from '/models/index.mjs';

import mySidelineService from '/services/mySidelineIntegrationService.mjs';
import emailService from '/services/emailService.mjs';
import { sortSponsorsHierarchically } from '/services/sponsorSortingService.mjs';
import { validationResult } from 'express-validator';

describe('Carnival Controller', () => {
  let req, res, next;

  beforeAll(async () => {
    // Ensure test database is ready
    await sequelize.authenticate();
  });

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock request object with comprehensive file upload support
    req = {
      params: {},
      query: {},
      body: {},
      user: null,
      flash: vi.fn(),
      structuredUploads: null,
      file: null,
      files: null
    };

    // Mock response object
    res = {
      render: vi.fn(),
      redirect: vi.fn(),
      json: vi.fn(),
      status: vi.fn().mockReturnThis()
    };

    // Mock next function
    next = vi.fn();

    // Set up default model mocks
    Carnival.findAll.mockResolvedValue([]);
    Carnival.findOne.mockResolvedValue(null);
    Carnival.findByPk.mockResolvedValue(null);
    Carnival.create.mockResolvedValue(createMockCarnival());
    Carnival.count.mockResolvedValue(0);
    Carnival.takeOwnership.mockResolvedValue({ success: true, message: 'Ownership taken' });
    Carnival.releaseOwnership.mockResolvedValue({ success: true, message: 'Ownership released' });

    Club.findAll.mockResolvedValue([]);
    Club.findByPk.mockResolvedValue(null);
    User.findByPk.mockResolvedValue(null);
    CarnivalClub.findOne.mockResolvedValue(null);
    CarnivalClub.findAll.mockResolvedValue([]);

    // Mock validation to return no errors by default
    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => []
    });

    // Mock services
    sortSponsorsHierarchically.mockReturnValue([]);
    mySidelineService.syncEvents.mockResolvedValue({ newEvents: 5 });
    emailService.notifyNewCarnival.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Carnival Listing', () => {
    it('should display all carnivals with default upcoming filter', async () => {
      const mockCarnivals = [
        createMockCarnival(),
        createMockCarnival({ id: 2, title: 'Another Carnival' })
      ];
      
      Carnival.findAll.mockResolvedValue(mockCarnivals);

      await list(req, res);

      expect(Carnival.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          isActive: true
        }),
        include: expect.arrayContaining([
          expect.objectContaining({
            model: User,
            as: 'creator'
          })
        ]),
        order: [['date', 'DESC']]
      }));

      expect(res.render).toHaveBeenCalledWith('carnivals/list', expect.objectContaining({
        title: 'Find Carnivals',
        carnivals: expect.any(Array),
        states: expect.any(Array),
        currentFilters: expect.objectContaining({
          upcoming: 'true'
        })
      }));
    });

    it('should handle state filtering', async () => {
      req.query = { state: 'NSW', _submitted: 'true' };
      
      Carnival.findAll.mockResolvedValue([]);

      await list(req, res);

      expect(Carnival.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          state: 'NSW'
        })
      }));
    });

    it('should handle search filtering', async () => {
      req.query = { search: 'test carnival', _submitted: 'true' };
      
      Carnival.findAll.mockResolvedValue([]);

      await list(req, res);

      expect(Carnival.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          [Op.or]: expect.any(Array)
        })
      }));
    });

    it('should handle MySideline filtering', async () => {
      req.query = { mysideline: 'true', _submitted: 'true' };
      
      Carnival.findAll.mockResolvedValue([]);

      await list(req, res);

      // Check that the where clause contains the MySideline filter
      const callArgs = Carnival.findAll.mock.calls[0][0];
      expect(callArgs.where.lastMySidelineSync).toBeDefined();
      expect(typeof callArgs.where.lastMySidelineSync).toBe('object');
    });

    it('should process carnival ownership permissions for authenticated users', async () => {
      const mockUser = createMockUser({ 
        clubId: 1, 
        club: createMockClub({ state: 'NSW' }) 
      });
      const mockCarnival = createMockCarnival({ 
        lastMySidelineSync: new Date(),
        createdByUserId: null,
        state: 'NSW'
      });

      req.user = { id: 1 };
      User.findByPk.mockResolvedValue(mockUser);
      Carnival.findAll.mockResolvedValue([mockCarnival]);

      await list(req, res);

      expect(res.render).toHaveBeenCalledWith('carnivals/list', expect.objectContaining({
        carnivals: expect.arrayContaining([
          expect.objectContaining({
            canTakeOwnership: true
          })
        ])
      }));
    });
  });

  describe('Carnival Details', () => {
    it('should display carnival details for valid carnival', async () => {
      const mockCarnival = createMockCarnival({
        sponsors: [],
        attendingClubs: []
      });
      
      req.params.id = '1';
      Carnival.findByPk.mockResolvedValue(mockCarnival);

      await show(req, res);

      expect(Carnival.findByPk).toHaveBeenCalledWith('1', expect.objectContaining({
        include: expect.arrayContaining([
          expect.objectContaining({
            model: User,
            as: 'creator'
          }),
          expect.objectContaining({
            model: Sponsor,
            as: 'sponsors'
          }),
          expect.objectContaining({
            model: Club,
            as: 'attendingClubs'
          })
        ])
      }));

      expect(res.render).toHaveBeenCalledWith('carnivals/show', expect.objectContaining({
        title: 'Test Carnival',
        carnival: expect.any(Object),
        sponsors: expect.any(Array)
      }));
    });

    it('should redirect if carnival not found', async () => {
      req.params.id = '999';
      Carnival.findByPk.mockResolvedValue(null);

      await show(req, res);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Carnival not found.');
      expect(res.redirect).toHaveBeenCalledWith('/carnivals');
    });

    it('should show management options for carnival owners', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockCarnival = createMockCarnival({ createdByUserId: 1 });

      req.params.id = '1';
      req.user = { id: 1 };
      User.findByPk.mockResolvedValue(mockUser);
      Carnival.findByPk.mockResolvedValue(mockCarnival);

      await show(req, res);

      expect(res.render).toHaveBeenCalledWith('carnivals/show', expect.objectContaining({
        canManage: true
      }));
    });

    it('should show registration options for club members', async () => {
      const mockUser = createMockUser({ clubId: 1 });
      const mockCarnival = createMockCarnival({ createdByUserId: 2 });

      req.params.id = '1';
      req.user = { id: 1 };
      User.findByPk.mockResolvedValue(mockUser);
      Carnival.findByPk.mockResolvedValue(mockCarnival);
      CarnivalClub.findOne.mockResolvedValue(null); // Not registered

      await show(req, res);

      expect(res.render).toHaveBeenCalledWith('carnivals/show', expect.objectContaining({
        canRegisterClub: true,
        userClubRegistration: null
      }));
    });

    it('should show existing registration status', async () => {
      const mockUser = createMockUser({ clubId: 1 });
      const mockCarnival = createMockCarnival({ createdByUserId: 2 });
      const mockRegistration = createMockCarnivalClub({ 
        approvalStatus: 'approved',
        isPaid: true 
      });

      req.params.id = '1';
      req.user = { id: 1 };
      User.findByPk.mockResolvedValue(mockUser);
      Carnival.findByPk.mockResolvedValue(mockCarnival);
      CarnivalClub.findOne.mockResolvedValue(mockRegistration);

      await show(req, res);

      expect(res.render).toHaveBeenCalledWith('carnivals/show', expect.objectContaining({
        canRegisterClub: false,
        userClubRegistration: mockRegistration
      }));
    });
  });

  describe('Carnival Creation', () => {
    it('should display create form with user club information', async () => {
      const mockUser = createMockUser({ 
        clubId: 1,
        club: createMockClub() 
      });

      req.user = { id: 1 };
      User.findByPk.mockResolvedValue(mockUser);

      await getNew(req, res);

      expect(res.render).toHaveBeenCalledWith('carnivals/new', expect.objectContaining({
        title: 'Add New Carnival',
        states: expect.any(Array),
        user: mockUser
      }));
    });

    it('should successfully create carnival with valid data', async () => {
      const mockUser = createMockUser();
      const mockCarnival = createMockCarnival();

      req.user = { id: 1, clubId: 1 };
      req.body = {
        title: 'New Test Carnival',
        date: '2025-12-25',
        locationAddress: 'Test Location',
        organiserContactName: 'John Doe',
        organiserContactEmail: 'john@example.com',
        organiserContactPhone: '1234567890',
        state: 'NSW'
      };

      Carnival.create.mockResolvedValue(mockCarnival);

      await postNew(req, res);

      expect(Carnival.create).toHaveBeenCalledWith(expect.objectContaining({
        title: 'New Test Carnival',
        date: expect.any(Date),
        locationAddress: 'Test Location',
        organiserContactName: 'John Doe',
        organiserContactEmail: 'john@example.com',
        state: 'NSW',
        createdByUserId: 1,
        clubId: 1,
        isManuallyEntered: true
      }));

      expect(req.flash).toHaveBeenCalledWith(
        'success_msg', 
        'Carnival created successfully! 🎉'
      );
      expect(res.redirect).toHaveBeenCalledWith('/carnivals/1?showPostCreationModal=true');
    });

    it('should handle validation errors', async () => {
      const mockUser = createMockUser({
        clubId: 1,
        club: createMockClub()
      });

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Title is required' }]
      });

      req.user = { id: 1 };
      req.body = { title: '' };
      User.findByPk.mockResolvedValue(mockUser);

      await postNew(req, res);

      expect(res.render).toHaveBeenCalledWith('carnivals/new', expect.objectContaining({
        errors: [{ msg: 'Title is required' }],
        formData: req.body
      }));
    });

    it('should handle file uploads during creation', async () => {
      const mockCarnival = createMockCarnival();

      req.user = { id: 1, clubId: 1 };
      req.body = {
        title: 'New Test Carnival',
        date: '2025-12-25',
        locationAddress: 'Test Location',
        organiserContactName: 'John Doe',
        organiserContactEmail: 'john@example.com',
        state: 'NSW'
      };
      req.structuredUploads = [
        {
          fieldname: 'logo',
          path: '/uploads/logo.jpg',
          originalname: 'logo.jpg'
        },
        {
          fieldname: 'promotionalImage',
          path: '/uploads/promo.jpg',
          originalname: 'promo.jpg'
        }
      ];

      Carnival.create.mockResolvedValue(mockCarnival);

      await postNew(req, res);

      expect(mockCarnival.update).toHaveBeenCalledWith(expect.objectContaining({
        clubLogoURL: '/uploads/logo.jpg',
        promotionalImageURL: '/uploads/promo.jpg'
      }));
    });

    it('should handle duplicate detection', async () => {
      const mockUser = createMockUser({
        clubId: 1,
        club: createMockClub()
      });

      req.user = { id: 1, clubId: 1 };
      req.body = {
        title: 'Duplicate Carnival',
        date: '2025-12-25',
        locationAddress: 'Test Location',
        organiserContactName: 'John Doe',
        organiserContactEmail: 'john@example.com',
        state: 'NSW'
      };

      Carnival.create.mockRejectedValue(new Error('A similar carnival already exists'));
      User.findByPk.mockResolvedValue(mockUser);

      await postNew(req, res);

      expect(res.render).toHaveBeenCalledWith('carnivals/new', expect.objectContaining({
        errors: [{ msg: 'A similar carnival already exists' }],
        duplicateWarning: true
      }));
    });
  });

  describe('Carnival Editing', () => {
    it('should display edit form for authorized user', async () => {
      const mockCarnival = createMockCarnival();
      
      req.params.id = '1';
      req.user = { id: 1 };
      Carnival.findByPk.mockResolvedValue(mockCarnival);

      await getEdit(req, res);

      expect(mockCarnival.canUserEditAsync).toHaveBeenCalledWith(req.user);
      expect(res.render).toHaveBeenCalledWith('carnivals/edit', expect.objectContaining({
        title: 'Edit Carnival',
        carnival: mockCarnival,
        states: expect.any(Array)
      }));
    });

    it('should redirect unauthorized users', async () => {
      const mockCarnival = createMockCarnival();
      mockCarnival.canUserEditAsync.mockResolvedValue(false);

      req.params.id = '1';
      req.user = { id: 2 };
      Carnival.findByPk.mockResolvedValue(mockCarnival);

      await getEdit(req, res);

      expect(req.flash).toHaveBeenCalledWith(
        'error_msg', 
        'You can only edit carnivals hosted by your club.'
      );
      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('should successfully update carnival', async () => {
      const mockCarnival = createMockCarnival();

      req.params.id = '1';
      req.user = { id: 1 };
      req.body = {
        title: 'Updated Carnival',
        date: '2025-12-26',
        locationAddress: 'Updated Location',
        organiserContactName: 'Jane Doe',
        organiserContactEmail: 'jane@example.com',
        state: 'VIC'
      };

      Carnival.findByPk.mockResolvedValue(mockCarnival);

      await postEdit(req, res);

      expect(mockCarnival.update).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Updated Carnival',
        date: expect.any(Date),
        locationAddress: 'Updated Location',
        organiserContactName: 'Jane Doe',
        organiserContactEmail: 'jane@example.com',
        state: 'VIC'
      }));

      expect(req.flash).toHaveBeenCalledWith(
        'success_msg', 
        'Carnival updated successfully!'
      );
      expect(res.redirect).toHaveBeenCalledWith('/carnivals/1');
    });

    it('should handle file uploads during update', async () => {
      const mockCarnival = createMockCarnival({ 
        additionalImages: [],
        drawFiles: []
      });

      req.params.id = '1';
      req.user = { id: 1 };
      req.body = {
        title: 'Updated Carnival',
        date: '2025-12-26',
        drawTitle: 'New Draw Document'
      };
      req.structuredUploads = [
        {
          fieldname: 'drawDocument',
          path: '/uploads/draw.pdf',
          originalname: 'draw.pdf',
          metadata: { size: 1024 }
        }
      ];

      Carnival.findByPk.mockResolvedValue(mockCarnival);

      await postEdit(req, res);

      expect(mockCarnival.update).toHaveBeenCalledWith(expect.objectContaining({
        drawFiles: expect.arrayContaining([
          expect.objectContaining({
            url: '/uploads/draw.pdf',
            filename: 'draw.pdf',
            title: 'New Draw Document'
          })
        ])
      }));
    });
  });

  describe('Carnival Management', () => {
    it('should soft delete carnival for authorized user', async () => {
      const mockCarnival = createMockCarnival();

      req.params.id = '1';
      req.user = { id: 1 };
      Carnival.findByPk.mockResolvedValue(mockCarnival);

      await deleteCarnival(req, res);

      expect(mockCarnival.update).toHaveBeenCalledWith({ isActive: false });
      expect(req.flash).toHaveBeenCalledWith(
        'success_msg', 
        'Carnival deleted successfully.'
      );
      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('should handle carnival not found for deletion', async () => {
      req.params.id = '999';
      req.user = { id: 1 };
      Carnival.findByPk.mockResolvedValue(null);

      await deleteCarnival(req, res);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Carnival not found.');
      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('MySideline Integration', () => {
    it('should take ownership of MySideline event', async () => {
      req.params.id = '1';
      req.user = { id: 1 };

      await takeOwnership(req, res);

      expect(Carnival.takeOwnership).toHaveBeenCalledWith('1', 1);
      expect(req.flash).toHaveBeenCalledWith('success_msg', 'Ownership taken');
      expect(res.redirect).toHaveBeenCalledWith('/carnivals/1');
    });

    it('should release ownership of MySideline event', async () => {
      req.params.id = '1';
      req.user = { id: 1 };

      await releaseOwnership(req, res);

      expect(Carnival.releaseOwnership).toHaveBeenCalledWith('1', 1);
      expect(req.flash).toHaveBeenCalledWith('success_msg', 'Ownership released');
      expect(res.redirect).toHaveBeenCalledWith('/carnivals/1');
    });

    it('should sync MySideline data for authorized users', async () => {
      req.user = { isPrimaryDelegate: true, isAdmin: false };

      await syncMySideline(req, res);

      expect(mySidelineService.syncEvents).toHaveBeenCalled();
      expect(req.flash).toHaveBeenCalledWith(
        'success_msg',
        'MySideline sync completed. 5 new events imported.'
      );
      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('should deny MySideline sync for unauthorized users', async () => {
      req.user = { isPrimaryDelegate: false, isAdmin: false };

      await syncMySideline(req, res);

      expect(req.flash).toHaveBeenCalledWith(
        'error_msg',
        'Access denied. Only administrators can sync MySideline data.'
      );
      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Player Management', () => {
    it('should display all players for carnival owner', async () => {
      const mockCarnival = createMockCarnival({
        createdByUserId: 1,
        attendingClubs: [{
          id: 1,
          clubName: 'Test Club',
          CarnivalClub: { approvalStatus: 'approved' },
          players: [{
            id: 1,
            firstName: 'John',
            lastName: 'Player',
            dateOfBirth: new Date('1980-01-01'),
            email: 'john@example.com',
            carnivalAssignments: [{
              attendanceStatus: 'confirmed'
            }]
          }]
        }]
      });

      req.params.id = '1';
      req.user = { id: 1, isAdmin: false };
      Carnival.findByPk.mockResolvedValue(mockCarnival);

      await showAllPlayers(req, res);

      expect(res.render).toHaveBeenCalledWith('carnivals/players', expect.objectContaining({
        title: 'All Players - Test Carnival',
        carnival: expect.objectContaining({
          id: 1,
          title: 'Test Carnival'
        }),
        players: expect.any(Array),
        clubSummary: expect.any(Array)
      }));
    });

    it('should deny player access for unauthorized users', async () => {
      const mockCarnival = createMockCarnival({ createdByUserId: 2 });

      req.params.id = '1';
      req.user = { id: 1, isAdmin: false, clubId: 2 };
      Carnival.findByPk.mockResolvedValue(mockCarnival);

      await showAllPlayers(req, res);

      expect(req.flash).toHaveBeenCalledWith(
        'error_msg',
        'You do not have permission to view the player list for this carnival.'
      );
      expect(res.redirect).toHaveBeenCalledWith('/carnivals/1');
    });
  });

  describe('Utility Functions', () => {
    it('should create new carnival when no duplicates exist', async () => {
      const carnivalData = {
        title: 'New Carnival',
        date: new Date('2025-12-25'),
        state: 'NSW'
      };

      Carnival.findOne.mockResolvedValue(null);
      Carnival.create.mockResolvedValue(createMockCarnival(carnivalData));

      const result = await createOrMergeEvent(carnivalData, 1);

      expect(Carnival.create).toHaveBeenCalledWith(expect.objectContaining({
        ...carnivalData,
        createdByUserId: 1
      }));
      expect(result).toEqual(expect.objectContaining(carnivalData));
    });

    it('should merge with existing MySideline event', async () => {
      const carnivalData = {
        title: 'New Carnival',
        date: new Date('2025-12-25'),
        state: 'NSW'
      };

      const existingCarnival = createMockCarnival({
        isManuallyEntered: false,
        claimedAt: null
      });

      Carnival.findOne.mockResolvedValue(existingCarnival);

      const result = await createOrMergeEvent(carnivalData, 1);

      expect(existingCarnival.update).toHaveBeenCalledWith(expect.objectContaining({
        ...carnivalData,
        createdByUserId: 1,
        claimedAt: expect.any(Date)
      }));
      expect(result).toBe(existingCarnival);
    });

    it('should throw error for duplicate manually created carnival', async () => {
      const carnivalData = {
        title: 'Duplicate Carnival',
        date: new Date('2025-12-25'),
        clubId: 1
      };

      const existingCarnival = createMockCarnival({
        isManuallyEntered: true,
        clubId: 1
      });

      Carnival.findOne.mockResolvedValue(existingCarnival);

      await expect(createOrMergeEvent(carnivalData, 1)).rejects.toThrow(
        'A similar manually created carnival already exists for this date'
      );
    });
  });

  describe('Placeholder Functions', () => {
    it('should handle merge carnival placeholder', async () => {
      req.params.id = '1';

      await mergeCarnival(req, res);

      expect(req.flash).toHaveBeenCalledWith(
        'error_msg',
        'Merge carnival functionality not yet implemented.'
      );
      expect(res.redirect).toHaveBeenCalledWith('/carnivals/1');
    });

    it('should handle sponsor management placeholders', async () => {
      req.params.id = '1';

      await showCarnivalSponsors(req, res);
      expect(req.flash).toHaveBeenCalledWith(
        'error_msg',
        'Carnival sponsors functionality not yet implemented.'
      );

      await addSponsorToCarnival(req, res);
      expect(req.flash).toHaveBeenCalledWith(
        'error_msg',
        'Add sponsor functionality not yet implemented.'
      );

      await removeSponsorFromCarnival(req, res);
      expect(req.flash).toHaveBeenCalledWith(
        'error_msg',
        'Remove sponsor functionality not yet implemented.'
      );
    });

    it('should handle email attendees placeholder', async () => {
      req.params.id = '1';

      await sendEmailToAttendees(req, res);

      expect(req.flash).toHaveBeenCalledWith(
        'error_msg',
        'Email attendees functionality not yet implemented.'
      );
      expect(res.redirect).toHaveBeenCalledWith('/carnivals/1');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors in carnival listing', async () => {
      Carnival.findAll.mockRejectedValue(new Error('Database error'));

      await expect(list(req, res)).rejects.toThrow('Database error');
    });

    it('should handle errors in takeOwnership', async () => {
      req.params.id = '1';
      req.user = { id: 1 };
      Carnival.takeOwnership.mockResolvedValue({ 
        success: false, 
        message: 'Ownership failed' 
      });

      await takeOwnership(req, res);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Ownership failed');
      expect(res.redirect).toHaveBeenCalledWith('/carnivals/1');
    });

    it('should handle validation errors during creation', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Date is invalid' }]
      });

      req.user = { id: 1 };
      req.body = { date: 'invalid-date' };

      await postNew(req, res);

      expect(res.render).toHaveBeenCalledWith('carnivals/new', expect.objectContaining({
        errors: [{ msg: 'Date is invalid' }]
      }));
    });

    it('should handle missing required data in createOrMergeEvent', async () => {
      await expect(createOrMergeEvent({}, 1)).rejects.toThrow(
        'Carnival title and date are required for duplicate detection.'
      );
    });
  });
});