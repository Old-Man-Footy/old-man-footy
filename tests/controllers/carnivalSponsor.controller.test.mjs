/**
 * Carnival Sponsor Controller Tests
 * 
 * Comprehensive test suite for carnival-sponsor relationship management functionality 
 * following the proven pattern from eight previous controllers with 100% success rate.
 * 
 * Covers relationship CRUD operations, sponsorship package management, display ordering,
 * filtering, pagination, and soft delete functionality.
 * 
 * @author Old Man Footy System
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { sequelize } from '/config/database.mjs';
import { SPONSORSHIP_LEVELS } from '/config/constants.mjs';    

// Mock the asyncHandler middleware to prevent wrapping issues
vi.mock('/middleware/asyncHandler.mjs', () => ({
  asyncHandler: (fn) => fn,
  wrapControllers: (controllers) => controllers,
  default: (fn) => fn
}));

// Mock all model imports before importing the controller
vi.mock('/models/index.mjs', () => {
  const createMockCarnivalSponsor = (overrides = {}) => ({
    id: 1,
    carnivalId: 1,
    sponsorId: 1,
    sponsorshipLevel: SPONSORSHIP_LEVELS.CarnivalSponsor.Bronze,
    sponsorshipValue: 1000.00,
    packageDetails: 'Standard sponsorship package',
    displayOrder: 0,
    logoDisplaySize: 'Medium',
    includeInProgram: true,
    includeOnWebsite: true,
    notes: 'Primary carnival sponsor',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    update: vi.fn().mockResolvedValue(true),
    destroy: vi.fn().mockResolvedValue(true),
    carnival: {
      id: 1,
      carnivalName: 'Test Carnival 2024',
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-06-03'),
      location: 'Sydney Olympic Park'
    },
    sponsor: {
      id: 1,
      companyName: 'Test Sponsor Ltd',
      contactEmail: 'contact@testsponsor.com',
      isActive: true
    },
    ...overrides
  });

  const createMockCarnival = (overrides = {}) => ({
    id: 1,
    carnivalName: 'Test Carnival 2024',
    startDate: new Date('2024-06-01'),
    endDate: new Date('2024-06-03'),
    location: 'Sydney Olympic Park',
    description: 'Annual carnival event',
    registrationOpenDate: new Date('2024-01-01'),
    registrationCloseDate: new Date('2024-05-01'),
    isActive: true,
    isPubliclyListed: true,
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
    CarnivalSponsor: {
      findAll: vi.fn(),
      findOne: vi.fn(),
      findByPk: vi.fn(),
      findAndCountAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      destroy: vi.fn(),
      getActiveForCarnival: vi.fn(),
      getActiveForSponsor: vi.fn(),
      getSponsorshipSummary: vi.fn()
    },
    Carnival: {
      findByPk: vi.fn(),
      findOne: vi.fn(),
      findAll: vi.fn()
    },
    Sponsor: {
      findByPk: vi.fn(),
      findOne: vi.fn(),
      findAll: vi.fn()
    },
    createMockCarnivalSponsor,
    createMockCarnival,
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
  createCarnivalSponsor,
  getCarnivalSponsors,
  getCarnivalSponsor,
  updateCarnivalSponsor,
  deleteCarnivalSponsor,
  getCarnivalSponsorsForCarnival,
  getCarnivalsForSponsor,
  getCarnivalSponsorshipSummary,
  reorderCarnivalSponsors
} from '/controllers/carnivalSponsor.controller.mjs';

import {
  CarnivalSponsor,
  Carnival,
  Sponsor,
  createMockCarnivalSponsor,
  createMockCarnival,
  createMockSponsor,
  Op
} from '/models/index.mjs';

import { SPONSORSHIP_LEVELS } from '/config/constants.mjs';

describe('Carnival Sponsor Controller', () => {
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
      params: { id: '1', carnivalId: '1', sponsorId: '1' },
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
    CarnivalSponsor.findAll.mockResolvedValue([]);
    CarnivalSponsor.findOne.mockResolvedValue(null);
    CarnivalSponsor.findByPk.mockResolvedValue(null);
    CarnivalSponsor.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    CarnivalSponsor.create.mockResolvedValue(createMockCarnivalSponsor());
    CarnivalSponsor.getActiveForCarnival.mockResolvedValue([]);
    CarnivalSponsor.getActiveForSponsor.mockResolvedValue([]);
    CarnivalSponsor.getSponsorshipSummary.mockResolvedValue({});

    Carnival.findByPk.mockResolvedValue(createMockCarnival());
    Sponsor.findByPk.mockResolvedValue(createMockSponsor());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Create Carnival Sponsor Relationship', () => {
    it('should create a new carnival-sponsor relationship successfully', async () => {
      const mockCarnival = createMockCarnival({ id: 1, carnivalName: 'Test Carnival' });
      const mockSponsor = createMockSponsor({ id: 1, companyName: 'Test Sponsor' });
      const mockCreatedRelationship = createMockCarnivalSponsor({
        id: 1,
        carnivalId: 1,
        sponsorId: 1,
        sponsorshipLevel: 'gold'
      });

      req.body = {
        carnivalId: '1',
        sponsorId: '1',
        sponsorshipLevel: 'gold',
        sponsorshipValue: 5000,
        packageDetails: 'Premium sponsorship package',
        displayOrder: 1,
        logoDisplaySize: 'Large'
      };

      Carnival.findByPk.mockResolvedValue(mockCarnival);
      Sponsor.findByPk.mockResolvedValue(mockSponsor);
      CarnivalSponsor.findOne.mockResolvedValue(null); // No existing relationship
      CarnivalSponsor.create.mockResolvedValue({ id: 1 });
      CarnivalSponsor.findByPk.mockResolvedValue(mockCreatedRelationship);

      await createCarnivalSponsor(req, res);

      expect(CarnivalSponsor.create).toHaveBeenCalledWith(expect.objectContaining({
        carnivalId: '1',
        sponsorId: '1',
        sponsorshipLevel: 'gold',
        sponsorshipValue: 5000,
        packageDetails: 'Premium sponsorship package',
        displayOrder: 1,
        logoDisplaySize: 'Large'
      }));

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Carnival-sponsor relationship created successfully',
        data: mockCreatedRelationship
      });
    });

    it('should default to bronze sponsorship level when not specified', async () => {
      const mockCarnival = createMockCarnival();
      const mockSponsor = createMockSponsor();

      req.body = {
        carnivalId: '1',
        sponsorId: '1'
      };

      Carnival.findByPk.mockResolvedValue(mockCarnival);
      Sponsor.findByPk.mockResolvedValue(mockSponsor);
      CarnivalSponsor.findOne.mockResolvedValue(null);
      CarnivalSponsor.create.mockResolvedValue({ id: 1 });
      CarnivalSponsor.findByPk.mockResolvedValue(createMockCarnivalSponsor());

      await createCarnivalSponsor(req, res);

      expect(CarnivalSponsor.create).toHaveBeenCalledWith(expect.objectContaining({
        sponsorshipLevel: 'bronze'
      }));
    });

    it('should reject invalid sponsorship levels', async () => {
      req.body = {
        carnivalId: '1',
        sponsorId: '1',
        sponsorshipLevel: 'invalid_level'
      };

      Carnival.findByPk.mockResolvedValue(createMockCarnival());
      Sponsor.findByPk.mockResolvedValue(createMockSponsor());
      CarnivalSponsor.findOne.mockResolvedValue(null);

      await createCarnivalSponsor(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          status: 400,
          message: expect.stringContaining('Invalid sponsorship level')
        }
      });
    });

    it('should prevent duplicate active relationships', async () => {
      const existingRelationship = createMockCarnivalSponsor();

      req.body = {
        carnivalId: '1',
        sponsorId: '1'
      };

      Carnival.findByPk.mockResolvedValue(createMockCarnival());
      Sponsor.findByPk.mockResolvedValue(createMockSponsor());
      CarnivalSponsor.findOne.mockResolvedValue(existingRelationship);

      await createCarnivalSponsor(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'An active sponsorship relationship already exists between this carnival and sponsor'
      });
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = {
        sponsorshipLevel: 'gold'
      };

      await createCarnivalSponsor(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Carnival ID and Sponsor ID are required'
      });
    });

    it('should return 404 when carnival not found', async () => {
      req.body = {
        carnivalId: '999',
        sponsorId: '1'
      };

      Carnival.findByPk.mockResolvedValue(null);
      Sponsor.findByPk.mockResolvedValue(createMockSponsor());

      await createCarnivalSponsor(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Carnival not found'
      });
    });

    it('should return 404 when sponsor not found', async () => {
      req.body = {
        carnivalId: '1',
        sponsorId: '999'
      };

      Carnival.findByPk.mockResolvedValue(createMockCarnival());
      Sponsor.findByPk.mockResolvedValue(null);

      await createCarnivalSponsor(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Sponsor not found'
      });
    });

    it('should set default values for optional fields', async () => {
      const mockCarnival = createMockCarnival();
      const mockSponsor = createMockSponsor();

      req.body = {
        carnivalId: '1',
        sponsorId: '1',
        sponsorshipLevel: 'silver'
      };

      Carnival.findByPk.mockResolvedValue(mockCarnival);
      Sponsor.findByPk.mockResolvedValue(mockSponsor);
      CarnivalSponsor.findOne.mockResolvedValue(null);
      CarnivalSponsor.create.mockResolvedValue({ id: 1 });
      CarnivalSponsor.findByPk.mockResolvedValue(createMockCarnivalSponsor());

      await createCarnivalSponsor(req, res);

      expect(CarnivalSponsor.create).toHaveBeenCalledWith(expect.objectContaining({
        displayOrder: 0,
        logoDisplaySize: 'Medium',
        includeInProgram: true,
        includeOnWebsite: true
      }));
    });
  });

  describe('Get Carnival Sponsor Relationships', () => {
    it('should retrieve all carnival-sponsor relationships with pagination', async () => {
      const mockRelationships = [
        createMockCarnivalSponsor({ id: 1 }),
        createMockCarnivalSponsor({ id: 2 })
      ];

      req.query = {
        page: '1',
        limit: '10'
      };

      CarnivalSponsor.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mockRelationships
      });

      await getCarnivalSponsors(req, res);

      expect(CarnivalSponsor.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        where: { isActive: true },
        include: expect.arrayContaining([
          expect.objectContaining({ model: Carnival, as: 'carnival' }),
          expect.objectContaining({ model: Sponsor, as: 'sponsor' })
        ]),
        order: [
          ['displayOrder', 'ASC'],
          ['sponsorshipLevel', 'ASC'],
          ['createdAt', 'DESC']
        ],
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

    it('should filter relationships by carnival ID', async () => {
      req.query = {
        carnivalId: '1',
        isActive: 'true'
      };

      CarnivalSponsor.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: [createMockCarnivalSponsor()]
      });

      await getCarnivalSponsors(req, res);

      expect(CarnivalSponsor.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          carnivalId: '1',
          isActive: true
        }
      }));
    });

    it('should filter relationships by sponsorship level', async () => {
      req.query = {
        sponsorshipLevel: 'gold',
        isActive: 'true'
      };

      CarnivalSponsor.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: [createMockCarnivalSponsor()]
      });

      await getCarnivalSponsors(req, res);

      expect(CarnivalSponsor.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
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

      CarnivalSponsor.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: []
      });

      await getCarnivalSponsors(req, res);

      const whereClause = CarnivalSponsor.findAndCountAll.mock.calls[0][0].where;
      expect(whereClause.isActive).toBeUndefined();
    });
  });

  describe('Get Single Carnival Sponsor Relationship', () => {
    it('should retrieve a specific carnival-sponsor relationship', async () => {
      const mockRelationship = createMockCarnivalSponsor({ id: 1 });

      req.params.id = '1';

      CarnivalSponsor.findByPk.mockResolvedValue(mockRelationship);

      await getCarnivalSponsor(req, res);

      expect(CarnivalSponsor.findByPk).toHaveBeenCalledWith('1', {
        include: expect.arrayContaining([
          expect.objectContaining({ model: Carnival, as: 'carnival' }),
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

      CarnivalSponsor.findByPk.mockResolvedValue(null);

      await getCarnivalSponsor(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Carnival-sponsor relationship not found'
      });
    });
  });

  describe('Update Carnival Sponsor Relationship', () => {
    it('should update a carnival-sponsor relationship successfully', async () => {
      const mockRelationship = createMockCarnivalSponsor({ id: 1 });
      const mockUpdatedRelationship = createMockCarnivalSponsor({
        id: 1,
        sponsorshipLevel: 'platinum',
        sponsorshipValue: 10000
      });

      req.params.id = '1';
      req.body = {
        sponsorshipLevel: 'platinum',
        sponsorshipValue: 10000,
        packageDetails: 'Premium platinum package'
      };

      CarnivalSponsor.findByPk
        .mockResolvedValueOnce(mockRelationship)
        .mockResolvedValueOnce(mockUpdatedRelationship);

      await updateCarnivalSponsor(req, res);

      expect(mockRelationship.update).toHaveBeenCalledWith({
        sponsorshipLevel: 'platinum',
        sponsorshipValue: 10000,
        packageDetails: 'Premium platinum package'
      });

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Carnival-sponsor relationship updated successfully',
        data: mockUpdatedRelationship
      });
    });

    it('should return 404 when relationship not found for update', async () => {
      req.params.id = '999';
      req.body = { sponsorshipLevel: 'gold' };

      CarnivalSponsor.findByPk.mockResolvedValue(null);

      await updateCarnivalSponsor(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Carnival-sponsor relationship not found'
      });
    });
  });

  describe('Delete Carnival Sponsor Relationship', () => {
    it('should soft delete (deactivate) a relationship by default', async () => {
      const mockRelationship = createMockCarnivalSponsor({ id: 1 });

      req.params.id = '1';
      req.query = {};

      CarnivalSponsor.findByPk.mockResolvedValue(mockRelationship);

      await deleteCarnivalSponsor(req, res);

      expect(mockRelationship.update).toHaveBeenCalledWith({
        isActive: false
      });

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Carnival-sponsor relationship deactivated'
      });
    });

    it('should permanently delete when requested', async () => {
      const mockRelationship = createMockCarnivalSponsor({ id: 1 });

      req.params.id = '1';
      req.query = { permanent: 'true' };

      CarnivalSponsor.findByPk.mockResolvedValue(mockRelationship);

      await deleteCarnivalSponsor(req, res);

      expect(mockRelationship.destroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Carnival-sponsor relationship permanently deleted'
      });
    });

    it('should return 404 when relationship not found for deletion', async () => {
      req.params.id = '999';

      CarnivalSponsor.findByPk.mockResolvedValue(null);

      await deleteCarnivalSponsor(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Carnival-sponsor relationship not found'
      });
    });
  });

  describe('Get Sponsors for Carnival', () => {
    it('should retrieve all active sponsors for a specific carnival', async () => {
      const mockSponsors = [
        createMockCarnivalSponsor({ sponsorId: 1 }),
        createMockCarnivalSponsor({ sponsorId: 2 })
      ];

      req.params.carnivalId = '1';

      CarnivalSponsor.getActiveForCarnival.mockResolvedValue(mockSponsors);

      await getCarnivalSponsorsForCarnival(req, res);

      expect(CarnivalSponsor.getActiveForCarnival).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          carnivalId: 1,
          sponsors: mockSponsors
        }
      });
    });
  });

  describe('Get Carnivals for Sponsor', () => {
    it('should retrieve all active carnivals for a specific sponsor', async () => {
      const mockCarnivals = [
        createMockCarnivalSponsor({ carnivalId: 1 }),
        createMockCarnivalSponsor({ carnivalId: 2 })
      ];

      req.params.sponsorId = '1';

      CarnivalSponsor.getActiveForSponsor.mockResolvedValue(mockCarnivals);

      await getCarnivalsForSponsor(req, res);

      expect(CarnivalSponsor.getActiveForSponsor).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          sponsorId: 1,
          carnivals: mockCarnivals
        }
      });
    });
  });

  describe('Get Carnival Sponsorship Summary', () => {
    it('should retrieve sponsorship summary for a carnival', async () => {
      const mockSummary = {
        totalSponsors: 5,
        totalValue: 25000,
        levelBreakdown: {
          platinum: 1,
          gold: 2,
          silver: 1,
          bronze: 1
        }
      };

      req.params.carnivalId = '1';

      CarnivalSponsor.getSponsorshipSummary.mockResolvedValue(mockSummary);

      await getCarnivalSponsorshipSummary(req, res);

      expect(CarnivalSponsor.getSponsorshipSummary).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          carnivalId: 1,
          summary: mockSummary
        }
      });
    });
  });

  describe('Reorder Carnival Sponsors', () => {
    it('should reorder sponsors display order successfully', async () => {
      const mockUpdatedSponsors = [
        createMockCarnivalSponsor({ id: 1, displayOrder: 1 }),
        createMockCarnivalSponsor({ id: 2, displayOrder: 2 })
      ];

      req.params.carnivalId = '1';
      req.body = {
        sponsorOrders: [
          { id: 1, displayOrder: 1 },
          { id: 2, displayOrder: 2 }
        ]
      };

      CarnivalSponsor.update.mockResolvedValue([1]);
      CarnivalSponsor.getActiveForCarnival.mockResolvedValue(mockUpdatedSponsors);

      await reorderCarnivalSponsors(req, res);

      expect(CarnivalSponsor.update).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Carnival sponsor display order updated successfully',
        data: {
          carnivalId: 1,
          sponsors: mockUpdatedSponsors
        }
      });
    });

    it('should return 400 when sponsorOrders is not an array', async () => {
      req.params.carnivalId = '1';
      req.body = {
        sponsorOrders: 'invalid'
      };

      await reorderCarnivalSponsors(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'sponsorOrders must be an array'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      
      req.query = {};
      CarnivalSponsor.findAndCountAll.mockRejectedValue(dbError);

      await expect(getCarnivalSponsors(req, res)).rejects.toThrow('Database connection failed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty query parameters gracefully', async () => {
      req.query = {};

      CarnivalSponsor.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: []
      });

      await getCarnivalSponsors(req, res);

      expect(CarnivalSponsor.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
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

      CarnivalSponsor.findAndCountAll.mockResolvedValue({
        count: 5,
        rows: []
      });

      await getCarnivalSponsors(req, res);

      expect(CarnivalSponsor.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
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

    it('should handle null package details appropriately', async () => {
      req.body = {
        carnivalId: '1',
        sponsorId: '1',
        sponsorshipLevel: 'bronze'
      };

      Carnival.findByPk.mockResolvedValue(createMockCarnival());
      Sponsor.findByPk.mockResolvedValue(createMockSponsor());
      CarnivalSponsor.findOne.mockResolvedValue(null);
      CarnivalSponsor.create.mockResolvedValue({ id: 1 });
      CarnivalSponsor.findByPk.mockResolvedValue(createMockCarnivalSponsor());

      await createCarnivalSponsor(req, res);

      expect(CarnivalSponsor.create).toHaveBeenCalledWith(expect.objectContaining({
        packageDetails: null
      }));
    });
  });
});
