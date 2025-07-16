/**
 * Carnival Sponsor Controller Unit Tests
 * 
 * Comprehensive test suite for carnival sponsor controller following security-first principles
 * and strict MVC architecture. Tests cover CRUD operations for carnival-sponsor relationships.
 */

import { describe, test, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CarnivalSponsor, Carnival, Sponsor } from '../models/index.mjs';
import { SPONSORSHIP_LEVELS } from '../config/constants.mjs';
import * as controller from '../controllers/carnivalSponsor.controller.mjs';

// Mock models using Vitest
vi.mock('../models/index.mjs', () => ({
  CarnivalSponsor: {
    create: vi.fn(),
    findOne: vi.fn(),
    findByPk: vi.fn(),
    findAndCountAll: vi.fn(),
    update: vi.fn(),
    getActiveForCarnival: vi.fn(),
    getActiveForSponsor: vi.fn(),
    getSponsorshipSummary: vi.fn(),
  },
  Carnival: {
    create: vi.fn(),
    findByPk: vi.fn(),
  },
  Sponsor: {
    create: vi.fn(),
    findByPk: vi.fn(),
  },
}));

function createMockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('CarnivalSponsor Controller', () => {
  let mockCarnival, mockSponsor, mockReq, mockRes;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock data
    mockCarnival = { 
      id: 1, 
      title: 'Test Carnival', 
      isActive: true 
    };
    
    mockSponsor = { 
      id: 1, 
      sponsorName: 'Test Sponsor', 
      businessName: 'Test Sponsor Pty Ltd', 
      isActive: true 
    };

    mockRes = createMockRes();
    
    // Setup default mock implementations
    Carnival.findByPk.mockResolvedValue(mockCarnival);
    Sponsor.findByPk.mockResolvedValue(mockSponsor);
    CarnivalSponsor.findOne.mockResolvedValue(null); // No existing relationship by default
  });

  describe('createCarnivalSponsor', () => {
    it('should create a carnival-sponsor relationship successfully', async () => {
      // Arrange
      const mockCreatedRelationship = {
        id: 1,
        carnivalId: 1,
        sponsorId: 1,
        sponsorshipLevel: SPONSORSHIP_LEVELS.BRONZE,
        isActive: true,
        carnival: mockCarnival,
        sponsor: mockSponsor,
      };

      mockReq = { 
        body: { 
          carnivalId: 1, 
          sponsorId: 1,
          sponsorshipLevel: SPONSORSHIP_LEVELS.GOLD
        } 
      };

      CarnivalSponsor.create.mockResolvedValue({ id: 1 });
      CarnivalSponsor.findByPk.mockResolvedValue(mockCreatedRelationship);

      // Act
      await controller.createCarnivalSponsor(mockReq, mockRes);

      // Assert
      expect(Carnival.findByPk).toHaveBeenCalledWith(1);
      expect(Sponsor.findByPk).toHaveBeenCalledWith(1);
      expect(CarnivalSponsor.findOne).toHaveBeenCalledWith({
        where: {
          carnivalId: 1,
          sponsorId: 1,
          isActive: true,
        },
      });
      expect(CarnivalSponsor.create).toHaveBeenCalledWith(
        expect.objectContaining({
          carnivalId: 1,
          sponsorId: 1,
          sponsorshipLevel: SPONSORSHIP_LEVELS.GOLD,
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          success: true,
          message: 'Carnival-sponsor relationship created successfully'
        })
      );
    });

    it('should return 400 when missing carnival ID', async () => {
      // Arrange
      mockReq = { body: { sponsorId: 1 } };

      // Act
      await controller.createCarnivalSponsor(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Carnival ID and Sponsor ID are required',
      });
    });

    it('should return 400 when missing sponsor ID', async () => {
      // Arrange
      mockReq = { body: { carnivalId: 1 } };

      // Act
      await controller.createCarnivalSponsor(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Carnival ID and Sponsor ID are required',
      });
    });

    it('should return 404 when carnival not found', async () => {
      // Arrange
      mockReq = { body: { carnivalId: 999, sponsorId: 1 } };
      Carnival.findByPk.mockResolvedValue(null);

      // Act
      await controller.createCarnivalSponsor(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Carnival not found',
      });
    });

    it('should return 404 when sponsor not found', async () => {
      // Arrange
      mockReq = { body: { carnivalId: 1, sponsorId: 999 } };
      Sponsor.findByPk.mockResolvedValue(null);

      // Act
      await controller.createCarnivalSponsor(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Sponsor not found',
      });
    });

    it('should return 409 when relationship already exists', async () => {
      // Arrange
      mockReq = { body: { carnivalId: 1, sponsorId: 1 } };
      CarnivalSponsor.findOne.mockResolvedValue({ id: 1, isActive: true });

      // Act
      await controller.createCarnivalSponsor(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'An active sponsorship relationship already exists between this carnival and sponsor',
      });
    });

    it('should use default bronze level when not provided', async () => {
      // Arrange
      mockReq = { body: { carnivalId: 1, sponsorId: 1 } };
      CarnivalSponsor.create.mockResolvedValue({ id: 1 });
      CarnivalSponsor.findByPk.mockResolvedValue({});

      // Act
      await controller.createCarnivalSponsor(mockReq, mockRes);

      // Assert
      expect(CarnivalSponsor.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sponsorshipLevel: SPONSORSHIP_LEVELS.BRONZE,
        })
      );
    });

    it('should return 400 for invalid sponsorship level', async () => {
      // Arrange
      mockReq = { 
        body: { 
          carnivalId: 1, 
          sponsorId: 1, 
          sponsorshipLevel: 'INVALID_LEVEL' 
        } 
      };

      // Act
      await controller.createCarnivalSponsor(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            status: 400,
            message: expect.stringContaining('Invalid sponsorship level'),
          }),
        })
      );
    });
  });

  describe('getCarnivalSponsors', () => {
    it('should get all carnival-sponsor relationships with filtering', async () => {
      // Arrange
      const mockRelationships = [
        {
          id: 1,
          carnivalId: 1,
          sponsorId: 1,
          carnival: mockCarnival,
          sponsor: mockSponsor,
        },
      ];

      mockReq = { query: { carnivalId: '1' } };
      CarnivalSponsor.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: mockRelationships,
      });

      // Act
      await controller.getCarnivalSponsors(mockReq, mockRes);

      // Assert
      expect(CarnivalSponsor.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { carnivalId: '1', isActive: true },
          include: [
            { model: Carnival, as: 'carnival' },
            { model: Sponsor, as: 'sponsor' },
          ],
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          success: true,
          data: expect.objectContaining({
            relationships: mockRelationships,
            pagination: expect.any(Object),
          }),
        })
      );
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      mockReq = { query: { page: '2', limit: '10' } };
      CarnivalSponsor.findAndCountAll.mockResolvedValue({
        count: 25,
        rows: [],
      });

      // Act
      await controller.getCarnivalSponsors(mockReq, mockRes);

      // Assert
      expect(CarnivalSponsor.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 10, // (page 2 - 1) * limit 10
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pagination: {
              currentPage: 2,
              totalPages: 3,
              totalItems: 25,
              itemsPerPage: 10,
            },
          }),
        })
      );
    });
  });

  describe('getCarnivalSponsor', () => {
    it('should get a specific carnival-sponsor relationship', async () => {
      // Arrange
      const mockRelationship = {
        id: 1,
        carnivalId: 1,
        sponsorId: 1,
        carnival: mockCarnival,
        sponsor: mockSponsor,
      };

      mockReq = { params: { id: '1' } };
      CarnivalSponsor.findByPk.mockResolvedValue(mockRelationship);

      // Act
      await controller.getCarnivalSponsor(mockReq, mockRes);

      // Assert
      expect(CarnivalSponsor.findByPk).toHaveBeenCalledWith('1', {
        include: [
          { model: Carnival, as: 'carnival' },
          { model: Sponsor, as: 'sponsor' },
        ],
      });
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          success: true,
          data: mockRelationship,
        })
      );
    });

    it('should return 404 when relationship not found', async () => {
      // Arrange
      mockReq = { params: { id: '999' } };
      CarnivalSponsor.findByPk.mockResolvedValue(null);

      // Act
      await controller.getCarnivalSponsor(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Carnival-sponsor relationship not found',
      });
    });
  });

  describe('updateCarnivalSponsor', () => {
    it('should update a carnival-sponsor relationship', async () => {
      // Arrange
      const mockRelationship = {
        id: 1,
        update: vi.fn().mockResolvedValue(),
      };
      const updatedRelationship = {
        id: 1,
        sponsorshipLevel: SPONSORSHIP_LEVELS.GOLD,
        carnival: mockCarnival,
        sponsor: mockSponsor,
      };

      mockReq = { 
        params: { id: '1' }, 
        body: { sponsorshipLevel: SPONSORSHIP_LEVELS.GOLD } 
      };
      
      CarnivalSponsor.findByPk
        .mockResolvedValueOnce(mockRelationship)
        .mockResolvedValueOnce(updatedRelationship);

      // Act
      await controller.updateCarnivalSponsor(mockReq, mockRes);

      // Assert
      expect(mockRelationship.update).toHaveBeenCalledWith({
        sponsorshipLevel: SPONSORSHIP_LEVELS.GOLD,
      });
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          success: true,
          message: 'Carnival-sponsor relationship updated successfully',
          data: updatedRelationship,
        })
      );
    });

    it('should return 404 when relationship not found for update', async () => {
      // Arrange
      mockReq = { params: { id: '999' }, body: {} };
      CarnivalSponsor.findByPk.mockResolvedValue(null);

      // Act
      await controller.updateCarnivalSponsor(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Carnival-sponsor relationship not found',
      });
    });
  });

  describe('deleteCarnivalSponsor', () => {
    it('should soft delete a carnival-sponsor relationship', async () => {
      // Arrange
      const mockRelationship = {
        id: 1,
        update: vi.fn().mockResolvedValue(),
      };

      mockReq = { params: { id: '1' }, query: {} };
      CarnivalSponsor.findByPk.mockResolvedValue(mockRelationship);

      // Act
      await controller.deleteCarnivalSponsor(mockReq, mockRes);

      // Assert
      expect(mockRelationship.update).toHaveBeenCalledWith({
        isActive: false,
      });
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          success: true,
          message: 'Carnival-sponsor relationship deactivated',
        })
      );
    });

    it('should hard delete a carnival-sponsor relationship', async () => {
      // Arrange
      const mockRelationship = {
        id: 1,
        destroy: vi.fn().mockResolvedValue(),
      };

      mockReq = { params: { id: '1' }, query: { permanent: 'true' } };
      CarnivalSponsor.findByPk.mockResolvedValue(mockRelationship);

      // Act
      await controller.deleteCarnivalSponsor(mockReq, mockRes);

      // Assert
      expect(mockRelationship.destroy).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          success: true,
          message: 'Carnival-sponsor relationship permanently deleted',
        })
      );
    });

    it('should return 404 when relationship not found for deletion', async () => {
      // Arrange
      mockReq = { params: { id: '999' }, query: {} };
      CarnivalSponsor.findByPk.mockResolvedValue(null);

      // Act
      await controller.deleteCarnivalSponsor(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Carnival-sponsor relationship not found',
      });
    });
  });

  describe('getCarnivalSponsorsForCarnival', () => {
    it('should get sponsors for a specific carnival', async () => {
      // Arrange
      const mockSponsors = [
        { id: 1, sponsor: mockSponsor, sponsorshipLevel: SPONSORSHIP_LEVELS.GOLD },
      ];

      mockReq = { params: { carnivalId: '1' }, query: {} };
      CarnivalSponsor.getActiveForCarnival.mockResolvedValue(mockSponsors);

      // Act
      await controller.getCarnivalSponsorsForCarnival(mockReq, mockRes);

      // Assert
      expect(CarnivalSponsor.getActiveForCarnival).toHaveBeenCalledWith('1');
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            carnivalId: 1,
            sponsors: mockSponsors,
          },
        })
      );
    });
  });

  describe('getCarnivalsForSponsor', () => {
    it('should get carnivals for a specific sponsor', async () => {
      // Arrange
      const mockCarnivals = [
        { id: 1, carnival: mockCarnival, sponsorshipLevel: SPONSORSHIP_LEVELS.SILVER },
      ];

      mockReq = { params: { sponsorId: '1' } };
      CarnivalSponsor.getActiveForSponsor.mockResolvedValue(mockCarnivals);

      // Act
      await controller.getCarnivalsForSponsor(mockReq, mockRes);

      // Assert
      expect(CarnivalSponsor.getActiveForSponsor).toHaveBeenCalledWith('1');
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            sponsorId: 1,
            carnivals: mockCarnivals,
          },
        })
      );
    });
  });

  describe('getCarnivalSponsorshipSummary', () => {
    it('should get sponsorship summary for a carnival', async () => {
      // Arrange
      const mockSummary = {
        totalSponsors: 5,
        sponsorshipLevels: {
          [SPONSORSHIP_LEVELS.PLATINUM]: 1,
          [SPONSORSHIP_LEVELS.GOLD]: 2,
          [SPONSORSHIP_LEVELS.SILVER]: 1,
          [SPONSORSHIP_LEVELS.BRONZE]: 1,
        },
        totalValue: 50000,
      };

      mockReq = { params: { carnivalId: '1' } };
      CarnivalSponsor.getSponsorshipSummary.mockResolvedValue(mockSummary);

      // Act
      await controller.getCarnivalSponsorshipSummary(mockReq, mockRes);

      // Assert
      expect(CarnivalSponsor.getSponsorshipSummary).toHaveBeenCalledWith('1');
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            carnivalId: 1,
            summary: mockSummary,
          },
        })
      );
    });
  });

  describe('reorderCarnivalSponsors', () => {
    it('should reorder carnival sponsors successfully', async () => {
      // Arrange
      const sponsorOrders = [
        { id: 1, displayOrder: 1 },
        { id: 2, displayOrder: 2 },
      ];
      const updatedSponsors = [
        { id: 1, displayOrder: 1 },
        { id: 2, displayOrder: 2 },
      ];

      mockReq = { 
        params: { carnivalId: '1' }, 
        body: { sponsorOrders } 
      };
      CarnivalSponsor.update.mockResolvedValue([1]);
      CarnivalSponsor.getActiveForCarnival.mockResolvedValue(updatedSponsors);

      // Act
      await controller.reorderCarnivalSponsors(mockReq, mockRes);

      // Assert
      expect(CarnivalSponsor.update).toHaveBeenCalledTimes(2);
      expect(CarnivalSponsor.getActiveForCarnival).toHaveBeenCalledWith('1');
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Carnival sponsor display order updated successfully',
          data: {
            carnivalId: 1,
            sponsors: updatedSponsors,
          },
        })
      );
    });

    it('should return 400 when sponsorOrders is not an array', async () => {
      // Arrange
      mockReq = { 
        params: { carnivalId: '1' }, 
        body: { sponsorOrders: 'not-an-array' } 
      };

      // Act
      await controller.reorderCarnivalSponsors(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'sponsorOrders must be an array',
      });
    });
  });
});
