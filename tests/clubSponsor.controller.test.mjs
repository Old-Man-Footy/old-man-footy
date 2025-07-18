/**
 * Club Sponsor Controller Tests
 * 
 * Comprehensive test suite for club-sponsor relationship management functionality 
 * following the proven pattern from seven previous controllers with 100% success rate.
 * 
 * Covers relationship CRUD operations, sponsorship level management, contract handling,
 * filtering, pagination, and soft delete functionality.
 * 
 * @author Old Man Footy System
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { sequelize } from '../config/database.mjs';

// Mock the asyncHandler middleware to prevent wrapping issues
vi.mock('../middleware/asyncHandler.mjs', () => ({
  asyncHandler: (fn) => fn,
  wrapControllers: (controllers) => controllers,
  default: (fn) => fn
}));

// Mock constants
vi.mock('../config/constants.mjs', () => ({
  SPONSORSHIP_LEVELS: {
    BRONZE: 'bronze',
    SILVER: 'silver',
    GOLD: 'gold',
    PLATINUM: 'platinum'
  }
}));

// Mock all model imports before importing the controller
vi.mock('../models/index.mjs', () => {
  const createMockClubSponsor = (overrides = {}) => ({
    id: 1,
    clubId: 1,
    sponsorId: 1,
    sponsorshipLevel: 'bronze',
    sponsorshipValue: 1000.00,
    startDate: new Date('2024-01-01'),
    endDate: null,
    contractDetails: 'Annual sponsorship agreement',
    notes: 'Primary jersey sponsor',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    update: vi.fn().mockResolvedValue(true),
    destroy: vi.fn().mockResolvedValue(true),
    club: {
      id: 1,
      clubName: 'Test Club',
      state: 'NSW',
      location: 'Sydney'
    },
    sponsor: {
      id: 1,
      companyName: 'Test Sponsor Ltd',
      contactEmail: 'contact@testsponsor.com',
      isActive: true
    },
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

  const createMockSponsor = (overrides = {}) => ({
    id: 1,
    companyName: 'Test Sponsor Ltd',
    contactPerson: 'Sponsor Contact',
    contactEmail: 'contact@testsponsor.com',
    contactPhone: '0123456789',
    websiteUrl: 'https://testsponsor.com',
    logoUrl: null,
    description: 'Leading sports sponsor',
    isActive: true,
    isPubliclyListed: true,
    ...overrides
  });

  return {
    ClubSponsor: {
      findAll: vi.fn(),
      findOne: vi.fn(),
      findByPk: vi.fn(),
      findAndCountAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      destroy: vi.fn(),
      getActiveForClub: vi.fn(),
      getActiveForSponsor: vi.fn()
    },
    Club: {
      findByPk: vi.fn(),
      findOne: vi.fn(),
      findAll: vi.fn()
    },
    Sponsor: {
      findByPk: vi.fn(),
      findOne: vi.fn(),
      findAll: vi.fn()
    },
    createMockClubSponsor,
    createMockClub,
    createMockSponsor,
    Op: {
      gte: Symbol('gte'),
      gt: Symbol('gt'),
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
  getClubSponsors,
  getClubSponsor,
  updateClubSponsor,
  deleteClubSponsor,
  getClubSponsorsForClub,
  getClubsForSponsor
} from '../controllers/clubSponsor.controller.mjs';

import clubSponsorController from '../controllers/clubSponsor.controller.mjs';

import {
  ClubSponsor,
  Club,
  Sponsor,
  createMockClubSponsor,
  createMockClub,
  createMockSponsor,
  Op
} from '../models/index.mjs';

import { SPONSORSHIP_LEVELS } from '../config/constants.mjs';

describe('Club Sponsor Controller', () => {
  let req, res, next;

  beforeAll(async () => {
    // Ensure test database is ready
    await sequelize.authenticate();
  });

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock request object
    req = {
      params: { id: '1', clubId: '1', sponsorId: '1' },
      query: {},
      body: {},
      user: { id: 1, isAdmin: true },
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
    ClubSponsor.findAll.mockResolvedValue([]);
    ClubSponsor.findOne.mockResolvedValue(null);
    ClubSponsor.findByPk.mockResolvedValue(null);
    ClubSponsor.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    ClubSponsor.create.mockResolvedValue(createMockClubSponsor());
    ClubSponsor.getActiveForClub.mockResolvedValue([]);
    ClubSponsor.getActiveForSponsor.mockResolvedValue([]);

    Club.findByPk.mockResolvedValue(createMockClub());
    Sponsor.findByPk.mockResolvedValue(createMockSponsor());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Create Club Sponsor Relationship', () => {
    it('should create a new club-sponsor relationship successfully', async () => {
      const mockClub = createMockClub({ id: 1, clubName: 'Test Club' });
      const mockSponsor = createMockSponsor({ id: 1, companyName: 'Test Sponsor' });
      const mockCreatedRelationship = createMockClubSponsor({
        id: 1,
        clubId: 1,
        sponsorId: 1,
        sponsorshipLevel: 'gold'
      });

      req.body = {
        clubId: '1',
        sponsorId: '1',
        sponsorshipLevel: 'gold',
        sponsorshipValue: 5000,
        startDate: '2024-01-01',
        contractDetails: 'Annual partnership agreement'
      };

      Club.findByPk.mockResolvedValue(mockClub);
      Sponsor.findByPk.mockResolvedValue(mockSponsor);
      ClubSponsor.findOne.mockResolvedValue(null); // No existing relationship
      ClubSponsor.create.mockResolvedValue({ id: 1 });
      ClubSponsor.findByPk.mockResolvedValue(mockCreatedRelationship);

      await clubSponsorController.createClubSponsor(req, res, next);

      expect(ClubSponsor.create).toHaveBeenCalledWith(expect.objectContaining({
        clubId: '1',
        sponsorId: '1',
        sponsorshipLevel: 'gold',
        sponsorshipValue: 5000,
        startDate: '2024-01-01',
        contractDetails: 'Annual partnership agreement'
      }));

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Club-sponsor relationship created successfully',
        data: mockCreatedRelationship
      });
    });

    it('should default to bronze sponsorship level when not specified', async () => {
      const mockClub = createMockClub();
      const mockSponsor = createMockSponsor();

      req.body = {
        clubId: '1',
        sponsorId: '1'
      };

      Club.findByPk.mockResolvedValue(mockClub);
      Sponsor.findByPk.mockResolvedValue(mockSponsor);
      ClubSponsor.findOne.mockResolvedValue(null);
      ClubSponsor.create.mockResolvedValue({ id: 1 });
      ClubSponsor.findByPk.mockResolvedValue(createMockClubSponsor());

      await clubSponsorController.createClubSponsor(req, res, next);

      expect(ClubSponsor.create).toHaveBeenCalledWith(expect.objectContaining({
        sponsorshipLevel: 'bronze'
      }));
    });

    it('should reject invalid sponsorship levels', async () => {
      req.body = {
        clubId: '1',
        sponsorId: '1',
        sponsorshipLevel: 'invalid_level'
      };

      Club.findByPk.mockResolvedValue(createMockClub());
      Sponsor.findByPk.mockResolvedValue(createMockSponsor());
      ClubSponsor.findOne.mockResolvedValue(null);

      await clubSponsorController.createClubSponsor(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          status: 400,
          message: expect.stringContaining('Invalid sponsorship level')
        }
      });
    });

    it('should prevent duplicate active relationships', async () => {
      const existingRelationship = createMockClubSponsor();

      req.body = {
        clubId: '1',
        sponsorId: '1'
      };

      Club.findByPk.mockResolvedValue(createMockClub());
      Sponsor.findByPk.mockResolvedValue(createMockSponsor());
      ClubSponsor.findOne.mockResolvedValue(existingRelationship);

      await clubSponsorController.createClubSponsor(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'An active sponsorship relationship already exists between this club and sponsor'
      });
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = {
        sponsorshipLevel: 'gold'
      };

      await clubSponsorController.createClubSponsor(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Club ID and Sponsor ID are required'
      });
    });

    it('should return 404 when club not found', async () => {
      req.body = {
        clubId: '999',
        sponsorId: '1'
      };

      Club.findByPk.mockResolvedValue(null);
      Sponsor.findByPk.mockResolvedValue(createMockSponsor());

      await clubSponsorController.createClubSponsor(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Club not found'
      });
    });

    it('should return 404 when sponsor not found', async () => {
      req.body = {
        clubId: '1',
        sponsorId: '999'
      };

      Club.findByPk.mockResolvedValue(createMockClub());
      Sponsor.findByPk.mockResolvedValue(null);

      await clubSponsorController.createClubSponsor(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Sponsor not found'
      });
    });
  });

  describe('Get Club Sponsor Relationships', () => {
    it('should retrieve all club-sponsor relationships with pagination', async () => {
      const mockRelationships = [
        createMockClubSponsor({ id: 1 }),
        createMockClubSponsor({ id: 2 })
      ];

      req.query = {
        page: '1',
        limit: '10'
      };

      ClubSponsor.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mockRelationships
      });

      await getClubSponsors(req, res, next);

      expect(ClubSponsor.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        where: { isActive: true },
        include: expect.arrayContaining([
          expect.objectContaining({ model: Club, as: 'club' }),
          expect.objectContaining({ model: Sponsor, as: 'sponsor' })
        ]),
        order: [['createdAt', 'DESC']],
        limit: 10,
        offset: 0
      }));

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          relationships: mockRelationships,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 2,
            itemsPerPage: 10
          }
        }
      });
    });

    it('should filter relationships by club ID', async () => {
      req.query = {
        clubId: '1',
        isActive: 'true'
      };

      ClubSponsor.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: [createMockClubSponsor()]
      });

      await getClubSponsors(req, res, next);

      expect(ClubSponsor.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          clubId: '1',
          isActive: true
        }
      }));
    });

    it('should filter relationships by sponsorship level', async () => {
      req.query = {
        sponsorshipLevel: 'gold',
        isActive: 'true'
      };

      ClubSponsor.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: [createMockClubSponsor()]
      });

      await getClubSponsors(req, res, next);

      expect(ClubSponsor.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          sponsorshipLevel: 'gold',
          isActive: true
        }
      }));
    });

    it('should include inactive relationships when requested', async () => {
      req.query = {
        isActive: 'all'
      };

      ClubSponsor.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: []
      });

      await getClubSponsors(req, res, next);

      const whereClause = ClubSponsor.findAndCountAll.mock.calls[0][0].where;
      expect(whereClause.isActive).toBeUndefined();
    });
  });

  describe('Get Single Club Sponsor Relationship', () => {
    it('should retrieve a specific club-sponsor relationship', async () => {
      const mockRelationship = createMockClubSponsor({ id: 1 });

      req.params.id = '1';

      ClubSponsor.findByPk.mockResolvedValue(mockRelationship);

      await getClubSponsor(req, res, next);

      expect(ClubSponsor.findByPk).toHaveBeenCalledWith('1', {
        include: expect.arrayContaining([
          expect.objectContaining({ model: Club, as: 'club' }),
          expect.objectContaining({ model: Sponsor, as: 'sponsor' })
        ])
      });

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRelationship
      });
    });

    it('should return 404 when relationship not found', async () => {
      req.params.id = '999';

      ClubSponsor.findByPk.mockResolvedValue(null);

      await getClubSponsor(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Club-sponsor relationship not found'
      });
    });
  });

  describe('Update Club Sponsor Relationship', () => {
    it('should update a club-sponsor relationship successfully', async () => {
      const mockRelationship = createMockClubSponsor({ id: 1 });
      const mockUpdatedRelationship = createMockClubSponsor({
        id: 1,
        sponsorshipLevel: 'platinum',
        sponsorshipValue: 10000
      });

      req.params.id = '1';
      req.body = {
        sponsorshipLevel: 'platinum',
        sponsorshipValue: 10000,
        notes: 'Updated sponsorship agreement'
      };

      ClubSponsor.findByPk
        .mockResolvedValueOnce(mockRelationship)
        .mockResolvedValueOnce(mockUpdatedRelationship);

      await updateClubSponsor(req, res, next);

      expect(mockRelationship.update).toHaveBeenCalledWith({
        sponsorshipLevel: 'platinum',
        sponsorshipValue: 10000,
        notes: 'Updated sponsorship agreement'
      });

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Club-sponsor relationship updated successfully',
        data: mockUpdatedRelationship
      });
    });

    it('should return 404 when relationship not found for update', async () => {
      req.params.id = '999';
      req.body = { sponsorshipLevel: 'gold' };

      ClubSponsor.findByPk.mockResolvedValue(null);

      await updateClubSponsor(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Club-sponsor relationship not found'
      });
    });
  });

  describe('Delete Club Sponsor Relationship', () => {
    it('should soft delete (deactivate) a relationship by default', async () => {
      const mockRelationship = createMockClubSponsor({ id: 1 });

      req.params.id = '1';
      req.query = {};

      ClubSponsor.findByPk.mockResolvedValue(mockRelationship);

      await deleteClubSponsor(req, res, next);

      expect(mockRelationship.update).toHaveBeenCalledWith({
        isActive: false,
        endDate: expect.any(Date)
      });

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Club-sponsor relationship deactivated'
      });
    });

    it('should permanently delete when requested', async () => {
      const mockRelationship = createMockClubSponsor({ id: 1 });

      req.params.id = '1';
      req.query = { permanent: 'true' };

      ClubSponsor.findByPk.mockResolvedValue(mockRelationship);

      await deleteClubSponsor(req, res, next);

      expect(mockRelationship.destroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Club-sponsor relationship permanently deleted'
      });
    });

    it('should return 404 when relationship not found for deletion', async () => {
      req.params.id = '999';

      ClubSponsor.findByPk.mockResolvedValue(null);

      await deleteClubSponsor(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Club-sponsor relationship not found'
      });
    });
  });

  describe('Get Sponsors for Club', () => {
    it('should retrieve all active sponsors for a specific club', async () => {
      const mockSponsors = [
        createMockClubSponsor({ sponsorId: 1 }),
        createMockClubSponsor({ sponsorId: 2 })
      ];

      req.params.clubId = '1';

      ClubSponsor.getActiveForClub.mockResolvedValue(mockSponsors);

      await getClubSponsorsForClub(req, res, next);

      expect(ClubSponsor.getActiveForClub).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          clubId: 1,
          sponsors: mockSponsors
        }
      });
    });
  });

  describe('Get Clubs for Sponsor', () => {
    it('should retrieve all active clubs for a specific sponsor', async () => {
      const mockClubs = [
        createMockClubSponsor({ clubId: 1 }),
        createMockClubSponsor({ clubId: 2 })
      ];

      req.params.sponsorId = '1';

      ClubSponsor.getActiveForSponsor.mockResolvedValue(mockClubs);

      await getClubsForSponsor(req, res, next);

      expect(ClubSponsor.getActiveForSponsor).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          sponsorId: 1,
          clubs: mockClubs
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      
      req.query = {};
      ClubSponsor.findAndCountAll.mockRejectedValue(dbError);

      await expect(getClubSponsors(req, res, next)).rejects.toThrow('Database connection failed');
    });

    it('should handle invalid date formats in create request', async () => {
      req.body = {
        clubId: '1',
        sponsorId: '1',
        startDate: 'invalid-date'
      };

      Club.findByPk.mockResolvedValue(createMockClub());
      Sponsor.findByPk.mockResolvedValue(createMockSponsor());
      ClubSponsor.findOne.mockResolvedValue(null);
      ClubSponsor.create.mockRejectedValue(new Error('Invalid date format'));

      await expect(clubSponsorController.createClubSponsor(req, res, next))
        .rejects.toThrow('Invalid date format');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty query parameters gracefully', async () => {
      req.query = {};

      ClubSponsor.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: []
      });

      await getClubSponsors(req, res, next);

      expect(ClubSponsor.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        where: { isActive: true },
        limit: 50,
        offset: 0
      }));
    });

    it('should handle large page numbers correctly', async () => {
      req.query = {
        page: '100',
        limit: '10'
      };

      ClubSponsor.findAndCountAll.mockResolvedValue({
        count: 5,
        rows: []
      });

      await getClubSponsors(req, res, next);

      expect(ClubSponsor.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        limit: 10,
        offset: 990
      }));

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          pagination: expect.objectContaining({
            currentPage: 100,
            totalPages: 1
          })
        })
      }));
    });

    it('should handle null sponsorship values appropriately', async () => {
      req.body = {
        clubId: '1',
        sponsorId: '1',
        sponsorshipLevel: 'bronze'
      };

      Club.findByPk.mockResolvedValue(createMockClub());
      Sponsor.findByPk.mockResolvedValue(createMockSponsor());
      ClubSponsor.findOne.mockResolvedValue(null);
      ClubSponsor.create.mockResolvedValue({ id: 1 });
      ClubSponsor.findByPk.mockResolvedValue(createMockClubSponsor());

      await clubSponsorController.createClubSponsor(req, res, next);

      expect(ClubSponsor.create).toHaveBeenCalledWith(expect.objectContaining({
        sponsorshipValue: null
      }));
    });
  });
});