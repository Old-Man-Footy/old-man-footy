/**
 * Sponsor Controller Tests
 * 
 * Comprehensive test suite for sponsor management functionality following the proven pattern 
 * from club, main, carnival, and admin controllers with 100% success rate implementation.
 * 
 * Covers sponsor CRUD operations, club relationships, visibility management, file uploads,
 * search functionality, and business logic validation.
 * 
 * @author Old Man Footy System
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { AUSTRALIAN_STATES, SPONSORSHIP_LEVELS } from '/config/constants.mjs';

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
  const createMockSponsor = (overrides = {}) => ({
    id: 1,
    sponsorName: 'Test Sponsor',
    businessType: 'Local Business',
    contactPerson: 'John Doe',
    contactEmail: 'john@testsponsor.com',
    contactPhone: '1234567890',
    website: 'https://testsponsor.com',
    state: 'NSW',
    location: 'Sydney',
    isActive: true,
    isPubliclyVisible: true,
    logoUrl: '/uploads/sponsor-logo.jpg',
    description: 'Test sponsor description',
    clubId: 1,
    club: null,
    update: vi.fn().mockResolvedValue(true),
    toJSON: vi.fn().mockImplementation(function () {
      const { toJSON, update, setClubs, getClubCount, ...rest } = this;
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
    contactEmail: 'contact@testclub.com',
    contactPhone: '0987654321',
    delegates: [],
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
    isActive: true,
    club: null,
    ...overrides
  });

  return {
    Sponsor: {
      findAll: vi.fn(),
      findOne: vi.fn(),
      findByPk: vi.fn(),
      create: vi.fn(),
      sequelize: {
        fn: vi.fn(),
        col: vi.fn()
      }
    },
    Club: {
      findAll: vi.fn(),
      findByPk: vi.fn(),
      findOne: vi.fn()
    },
    User: {
      findByPk: vi.fn()
    },
    createMockSponsor,
    createMockClub,
    createMockUser,
    Op: {
      gte: Symbol('gte'),
      ne: Symbol('ne'),
      like: Symbol('like'),
      or: Symbol('or'),
      and: Symbol('and'),
      in: Symbol('in')
    }
  };
});

// Now import the controller and dependencies
import {
  showSponsorListings,
  showSponsorProfile,
  showCreateSponsor,
  createSponsor,
  showEditSponsor,
  updateSponsor,
  deleteSponsor,
  toggleSponsorStatus,
  checkDuplicateSponsor
} from '/controllers/sponsor.controller.mjs';

import {
  Sponsor,
  Club,
  User,
  createMockSponsor,
  createMockClub,
  createMockUser,
  Op
} from '/models/index.mjs';

import { validationResult } from 'express-validator';
import { AUSTRALIAN_STATES, SPONSORSHIP_LEVELS } from '/config/constants.mjs';

describe('Sponsor Controller', () => {
  let req, res, next;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock request object
    req = {
      params: {},
      query: {},
      body: {},
      user: createMockUser({ id: 1, isAdmin: true }),
      flash: vi.fn(),
      structuredUploads: null
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
    Sponsor.findAll.mockResolvedValue([]);
    Sponsor.findOne.mockResolvedValue(null);
    Sponsor.findByPk.mockResolvedValue(null);
    Sponsor.create.mockResolvedValue(createMockSponsor());

    Club.findAll.mockResolvedValue([]);
    Club.findByPk.mockResolvedValue(null);
    Club.findOne.mockResolvedValue(null);

    User.findByPk.mockResolvedValue(null);

    // Mock validation to return no errors by default
    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => []
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Sponsor Listing and Display', () => {
    it('should display public sponsor listings with search and filters', async () => {
      const mockSponsors = [
        createMockSponsor({
          id: 1,
          sponsorName: 'Test Sponsor A',
          state: 'NSW',
          businessType: 'Local Business'
        }),
        createMockSponsor({
          id: 2,
          sponsorName: 'Test Sponsor B',
          state: 'VIC',
          businessType: 'Corporate Partner'
        })
      ];

      Sponsor.findAll.mockResolvedValue(mockSponsors);

      req.query = { search: 'test', state: 'NSW' };

      await showSponsorListings(req, res);

      expect(Sponsor.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          isPubliclyVisible: true,
          state: 'NSW',
          [Op.or]: expect.any(Array)
        }),
        include: expect.arrayContaining([
          expect.objectContaining({
            model: Club,
            as: 'club'
          })
        ]),
        order: [['sponsorName', 'ASC']]
      }));

      expect(res.render).toHaveBeenCalledWith('sponsors/list', expect.objectContaining({
        title: 'Find Masters Rugby League Sponsors',
        sponsors: expect.any(Array),
        filters: expect.objectContaining({
          search: 'test',
          state: 'NSW'
        }),
        states: AUSTRALIAN_STATES
      }));
    });

    it('should display individual sponsor profile', async () => {
      const mockSponsor = createMockSponsor({
        id: 1,
        sponsorName: 'Test Sponsor',
        club: createMockClub({ id: 1, clubName: 'Club A' })
      });

      req.params.id = '1';
      Sponsor.findOne.mockResolvedValue(mockSponsor);

      await showSponsorProfile(req, res);

      expect(Sponsor.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          id: '1',
          isActive: true,
          isPubliclyVisible: true
        }),
        include: expect.arrayContaining([
          expect.objectContaining({
            model: Club,
            as: 'club'
          })
        ])
      }));

      expect(res.render).toHaveBeenCalledWith('sponsors/show', expect.objectContaining({
        title: 'Test Sponsor - Sponsor Profile',
        sponsor: mockSponsor,
        club: mockSponsor.club
      }));
    });

    it('should handle sponsor not found in profile view', async () => {
      req.params.id = '999';
      Sponsor.findOne.mockResolvedValue(null);

      await showSponsorProfile(req, res);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Sponsor not found.');
      expect(res.redirect).toHaveBeenCalledWith('/sponsors');
    });
  });

  describe('Sponsor CRUD Operations', () => {
    it('should show create sponsor form for admin users', async () => {
      const mockClubs = [
        createMockClub({ id: 1, clubName: 'Club A' }),
        createMockClub({ id: 2, clubName: 'Club B' })
      ];

      Club.findAll.mockResolvedValue(mockClubs);

      await showCreateSponsor(req, res);

      expect(res.render).toHaveBeenCalledWith('sponsors/create', expect.objectContaining({
        title: 'Add New Sponsor',
        user: req.user,
        states: AUSTRALIAN_STATES,
        sponsorshipLevels: SPONSORSHIP_LEVELS
      }));
    });

    it('should deny access to create form for non-admin users', async () => {
      req.user = createMockUser({ id: 1, isAdmin: false });

      await showCreateSponsor(req, res);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Access denied. Admin privileges required.');
      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('should create new sponsor with file upload', async () => {
      const mockSponsor = createMockSponsor({
        id: 1,
        sponsorName: 'New Sponsor',
        contactEmail: 'contact@newsponsor.com'
      });

      req.body = {
        sponsorName: 'New Sponsor',
        businessType: 'Local Business',
        contactPerson: 'John Doe',
        contactEmail: 'contact@newsponsor.com',
        contactPhone: '1234567890',
        website: 'https://newsponsor.com',
        state: 'NSW',
        location: 'Sydney',
        description: 'New sponsor description',
        clubId: '1', // Corrected from associatedClub
        isPubliclyVisible: 'on'
      };

      req.structuredUploads = [
        {
          fieldname: 'logo',
          path: '/uploads/sponsor-logo.jpg',
          originalname: 'logo.jpg'
        }
      ];

      // Ensure Sponsor.create is a spy and can be tracked
      Sponsor.create = vi.fn().mockResolvedValue(mockSponsor);
      Club.findOne.mockResolvedValue(createMockClub({ id: 1 })); // Add mock for club validation
      Club.findAll.mockResolvedValue([
        createMockClub({ id: 1 }),
        createMockClub({ id: 2 })
      ]);

      // Ensure validation passes and user is admin
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });
      req.user = createMockUser({ id: 1, isAdmin: true });

      await createSponsor(req, res);

      expect(Sponsor.create).toHaveBeenCalledWith(expect.objectContaining({
        sponsorName: 'New Sponsor',
        businessType: 'Local Business',
        contactPerson: 'John Doe',
        contactEmail: 'contact@newsponsor.com',
        logoUrl: '/uploads/sponsor-logo.jpg',
        state: 'NSW',
        location: 'Sydney',
        isPubliclyVisible: true
      }));

      expect(req.flash).toHaveBeenCalledWith('success_msg', 'Sponsor created successfully!');
      expect(res.redirect).toHaveBeenCalledWith('/sponsors/1');
    });

    it('should show edit sponsor form for admin users', async () => {
      const mockSponsor = createMockSponsor({
        id: 1,
        sponsorName: 'Test Sponsor',
        club: createMockClub()
      });

      req.params.id = '1';
      Sponsor.findOne.mockResolvedValue(mockSponsor);

      await showEditSponsor(req, res);

      expect(res.render).toHaveBeenCalledWith('sponsors/edit', expect.objectContaining({
        title: 'Edit Sponsor',
        sponsor: mockSponsor,
        states: AUSTRALIAN_STATES,
        sponsorshipLevels: SPONSORSHIP_LEVELS
      }));
    });

    it('should update sponsor with file upload handling', async () => {
      const mockSponsor = createMockSponsor({
        id: 1,
        sponsorName: 'Test Sponsor',
        update: vi.fn().mockResolvedValue(true)
      });

      req.params.id = '1';
      req.body = {
        sponsorName: 'Updated Sponsor',
        businessType: 'Corporate Partner',
        contactEmail: 'updated@sponsor.com',
        state: 'VIC',
        location: 'Melbourne',
        isPubliclyVisible: 'on',
        clubId: '2' // Corrected from associatedClub
      };

      req.structuredUploads = [
        {
          fieldname: 'logo',
          path: '/uploads/updated-logo.jpg',
          originalname: 'updated-logo.jpg'
        }
      ];

      Sponsor.findOne.mockResolvedValue(mockSponsor);
      Club.findOne.mockResolvedValue(createMockClub({ id: 2 })); // Add mock for club validation
      Club.findAll.mockResolvedValue([
        createMockClub({ id: 2 }),
        createMockClub({ id: 3 })
      ]);

      // Ensure validation passes and user is admin
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });
      req.user = createMockUser({ id: 1, isAdmin: true });

      await updateSponsor(req, res);

      expect(mockSponsor.update).toHaveBeenCalledWith(expect.objectContaining({
        sponsorName: 'Updated Sponsor',
        businessType: 'Corporate Partner',
        contactEmail: 'updated@sponsor.com',
        logoUrl: '/uploads/updated-logo.jpg',
        state: 'VIC',
        location: 'Melbourne',
        isPubliclyVisible: true
      }));

      expect(req.flash).toHaveBeenCalledWith('success_msg', 'Sponsor updated successfully!');
      expect(res.redirect).toHaveBeenCalledWith('/sponsors/1');
    });

    it('should delete sponsor with proper deactivation', async () => {
      const mockSponsor = createMockSponsor({
        id: 1,
        sponsorName: 'Test Sponsor',
        isActive: true
      });

      req.params.id = '1';
      Sponsor.findOne.mockResolvedValue(mockSponsor);

      await deleteSponsor(req, res);

      expect(mockSponsor.update).toHaveBeenCalledWith({ isActive: false });

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Sponsor deleted successfully.'
      });
    });
  });

  describe('Sponsor Status Management', () => {
    it('should toggle sponsor status', async () => {
      const mockSponsor = createMockSponsor({
        id: 1,
        sponsorName: 'Test Sponsor',
        isActive: true
      });

      req.params.id = '1';
      req.body = { isActive: false };

      Sponsor.findByPk.mockResolvedValue(mockSponsor);

      await toggleSponsorStatus(req, res);

      expect(mockSponsor.update).toHaveBeenCalledWith({ isActive: false });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Sponsor deactivated successfully.',
        isActive: mockSponsor.isActive
      });
    });

    it('should handle sponsor not found for status toggle', async () => {
      req.params.id = '999';
      req.body = { isActive: false };

      Sponsor.findByPk.mockResolvedValue(null);

      await toggleSponsorStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Sponsor not found.'
      });
    });
  });

  describe('Duplicate Sponsor Check', () => {
    it('should check for duplicate sponsor names', async () => {
      const existingSponsor = createMockSponsor({
        id: 2,
        sponsorName: 'Existing Sponsor'
      });

      req.body = { sponsorName: 'Existing Sponsor' };

      Sponsor.findOne.mockResolvedValue(existingSponsor);

      await checkDuplicateSponsor(req, res);

      expect(Sponsor.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          [Op.or]: expect.any(Array)
        })
      }));

      expect(res.json).toHaveBeenCalledWith({
        isDuplicate: true,
        existingSponsor: expect.objectContaining({
          id: 2,
          sponsorName: 'Existing Sponsor'
        })
      });
    });

    it('should return no duplicate for short sponsor names', async () => {
      req.body = { sponsorName: 'AB' };

      await checkDuplicateSponsor(req, res);

      expect(res.json).toHaveBeenCalledWith({
        isDuplicate: false,
        existingSponsor: null
      });
    });
  });

  describe('Error Handling and Authorization', () => {
    it('should handle validation errors during sponsor creation', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          { msg: 'Sponsor name is required' },
          { msg: 'Valid email address is required' }
        ]
      });

      await createSponsor(req, res);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Please correct the validation errors.');
      expect(res.render).toHaveBeenCalledWith('sponsors/create', expect.objectContaining({
        errors: expect.any(Array),
        formData: req.body
      }));
    });

    it('should handle authorization errors for non-admin users', async () => {
      req.user = createMockUser({ 
        id: 1, 
        isAdmin: false
      });

      await createSponsor(req, res);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Access denied. Admin privileges required.');
      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('should handle sponsor not found during edit', async () => {
      req.params.id = '999';
      Sponsor.findOne.mockResolvedValue(null);

      await showEditSponsor(req, res);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Sponsor not found.');
      expect(res.redirect).toHaveBeenCalledWith('/sponsors');
    });

    it('should handle authorization for delete operations', async () => {
      req.user = createMockUser({ isAdmin: false });

      await deleteSponsor(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    });
  });
});
