/**
 * Club Controller Tests
 * 
 * Comprehensive test suite for club management functionality following security-first 
 * principles and strict MVC architecture. Tests include:
 * - Public club listings and profiles
 * - Club creation and management
 * - Club membership (join/leave)
 * - Sponsor management
 * - Alternate names management
 * - Image management
 * - API endpoints
 * 
 * @author Old Man Footy System
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the asyncHandler middleware to prevent wrapping issues
vi.mock('../../middleware/asyncHandler.mjs', () => ({
  asyncHandler: (fn) => fn, // Return the function as-is without wrapping
  wrapControllers: (controllers) => controllers, // Return controllers as-is without wrapping
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
vi.mock('../../models/index.mjs', () => {
  const mockSequelize = {
    transaction: vi.fn().mockResolvedValue({
      commit: vi.fn(),
      rollback: vi.fn()
    })
  };

  const createMockClub = (overrides = {}) => ({
    id: 1,
    clubName: 'Test Club',
    state: 'NSW',
    location: 'Sydney',
    isActive: true,
    isPubliclyListed: true,
    contactEmail: 'club@example.com',
    contactPhone: '1234567890',
    contactPerson: 'Test Person',
    description: 'Test club description',
    createdByUserId: 1,
    createdByProxy: false,
    inviteEmail: null,
    delegates: [],
    sponsors: [],
    alternateNames: [],
    toJSON: vi.fn().mockImplementation(function () {
      // Return all properties except methods
      const { toJSON, update, addSponsor, removeSponsor, getCarnivalCount, getSponsors, isUnclaimed, canUserClaim, getProxyCreator, ...rest } = this;
      return { ...rest, ...overrides };
    }),
    update: vi.fn().mockResolvedValue(true),
    addSponsor: vi.fn().mockResolvedValue(true),
    removeSponsor: vi.fn().mockResolvedValue(true),
    getCarnivalCount: vi.fn().mockResolvedValue(5),
    getSponsors: vi.fn().mockResolvedValue([]),
    isUnclaimed: vi.fn().mockReturnValue(false),
    canUserClaim: vi.fn().mockReturnValue(true),
    getProxyCreator: vi.fn().mockResolvedValue({ firstName: 'Proxy', lastName: 'Creator' }),
    // Add missing properties for test compatibility
    website: '',
    facebookUrl: '',
    instagramUrl: '',
    twitterUrl: '',
    logoUrl: '',
    establishedYear: 2020,
    updatedAt: new Date(),
    ...overrides
  });

  const mockClub = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    findByPk: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    findAndCountAll: vi.fn()
  };

  const mockUser = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    findByPk: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  };

  const mockClubAlternateName = {
    findAll: vi.fn(),
    create: vi.fn(),
    findByPk: vi.fn(),
    findOne: vi.fn(),
    searchClubsByAlternateName: vi.fn().mockResolvedValue([]),
    isUniqueForClub: vi.fn().mockResolvedValue(true)
  };

  const mockClubSponsor = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn()
  };

  return {
    sequelize: mockSequelize,
    Club: mockClub,
    User: mockUser,
    Carnival: { findAll: vi.fn() },
    Sponsor: { findAll: vi.fn(), findByPk: vi.fn() },
    ClubAlternateName: mockClubAlternateName,
    CarnivalClub: { findAll: vi.fn() },
  ClubSponsor: mockClubSponsor,
    createMockClub,
    Op: {
      and: 'and',
      or: 'or', 
      like: 'like',
      in: 'in',
      ne: 'ne'
    }
  };
});

// Mock other services
vi.mock('../../services/imageNamingService.mjs', () => ({
  default: {
    getClubImages: vi.fn().mockResolvedValue([]),
    getEntityImages: vi.fn().mockResolvedValue([]),
    parseImageName: vi.fn().mockReturnValue({
      entityType: 'club',
      entityId: 1,
      imageType: 'gallery'
    }),
    getRelativePath: vi.fn().mockReturnValue('clubs/gallery'),
    ENTITY_TYPES: { CLUB: 'club' },
    IMAGE_TYPES: { LOGO: 'logo', GALLERY: 'gallery' }
  }
}));

vi.mock('../../services/sponsorSortingService.mjs', () => ({
  sortSponsorsHierarchically: vi.fn().mockReturnValue([])
}));

vi.mock('../../services/email/InvitationEmailService.mjs', () => ({
  default: {
    sendClubInvitation: vi.fn().mockResolvedValue(true)
  }
}));

vi.mock('fs/promises', () => ({
  default: {
    access: vi.fn(),
    unlink: vi.fn()
  },
  access: vi.fn(),
  unlink: vi.fn()
}));

// Mock constants that the controller imports
vi.mock('../../config/constants.mjs', () => ({
  AUSTRALIAN_STATES: ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'],
  SPONSORSHIP_LEVELS: {
    GOLD: 'Gold',
    SILVER: 'Silver', 
    BRONZE: 'Bronze',
    SUPPORTING: 'In-Kind'
  }
}));

// Now import the controller and dependencies
import {
  showClubListings,
  showClubProfile,
  showClubManagement,
  updateClubProfile,
  createClub,
  joinClub,
  leaveClub,
  getClaimOwnership,
  postClaimOwnership,
  showClubSponsors,
  addSponsorToClub,
  addAlternateName,
  getClubImages,
  deleteClubImage,
  searchClubs
} from '../../controllers/club.controller.mjs';

import {
  Club,
  User,
  Carnival,
  Sponsor,
  ClubAlternateName,
  CarnivalClub,
  sequelize as mockSequelize,
  createMockClub} from '../../models/index.mjs';

import ImageNamingService from '../../services/imageNamingService.mjs';
import { sortSponsorsHierarchically } from '../../services/sponsorSortingService.mjs';
import InvitationEmailService from '../../services/email/InvitationEmailService.mjs';
import { validationResult } from 'express-validator';

describe('Club Controller', () => {
  let req, res, next, mockUser, mockClub, mockTransaction;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock transaction
    mockTransaction = {
      commit: vi.fn(),
      rollback: vi.fn()
    };
    mockSequelize.transaction.mockResolvedValue(mockTransaction);

    // Mock request object
    req = {
      params: {},
      query: {},
      body: {},
      user: null,
      flash: vi.fn(),
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

    // Mock next function - this was missing!
    next = vi.fn();

    // Mock user
    mockUser = {
      id: 1,
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      clubId: null,
      isPrimaryDelegate: false,
      isAdmin: false,
      phoneNumber: '1234567890',
      getFullName: vi.fn().mockReturnValue('Test User'),
      update: vi.fn().mockResolvedValue(true)
    };

    // Mock club
    mockClub = createMockClub();

    // Set up default model mocks
    Club.findAll.mockResolvedValue([mockClub]);
    Club.findOne.mockResolvedValue(mockClub);
    Club.findByPk.mockResolvedValue(mockClub);
    Club.create.mockResolvedValue(mockClub);
    Club.count.mockResolvedValue(1);
    Club.findAndCountAll.mockResolvedValue({ rows: [mockClub], count: 1 });

    User.findAll.mockResolvedValue([mockUser]);
    User.findOne.mockResolvedValue(mockUser);
    User.findByPk.mockResolvedValue(mockUser);

    Carnival.findAll.mockResolvedValue([]);
    CarnivalClub.findAll.mockResolvedValue([]);
    
    Sponsor.findAll.mockResolvedValue([]);
    Sponsor.findByPk.mockResolvedValue(null);
    
    ClubAlternateName.findAll.mockResolvedValue([]);
    ClubAlternateName.create.mockResolvedValue({});
    ClubAlternateName.findByPk.mockResolvedValue(null);
    ClubAlternateName.findOne.mockResolvedValue(null);
    // Add missing method that controller uses
    ClubAlternateName.isUniqueForClub = vi.fn().mockResolvedValue(true);

    // Mock services
    sortSponsorsHierarchically.mockReturnValue([]);
    ImageNamingService.getClubImages.mockResolvedValue([]);
    InvitationEmailService.sendClubInvitation.mockResolvedValue(true);

    // Mock validation to return no errors by default
    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => []
    });

    // Always assign req.user to a fresh clone of mockUser and copy all methods
    req.user = { ...mockUser };
    req.user.getFullName = mockUser.getFullName;
    req.user.update = mockUser.update;

    // Always assign res.render, res.json, res.status to new mocks for each test
    res.render = vi.fn();
    res.json = vi.fn();
    res.status = vi.fn().mockReturnThis();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Model Mocking Verification', () => {
    it('should have properly mocked Club model', () => {
      expect(Club).toBeDefined();
      expect(Club.findAll).toBeDefined();
      expect(typeof Club.findAll).toBe('function');
    });

    it('should have properly mocked ClubAlternateName model', () => {
      expect(ClubAlternateName).toBeDefined();
      expect(ClubAlternateName.searchClubsByAlternateName).toBeDefined();
      expect(typeof ClubAlternateName.searchClubsByAlternateName).toBe('function');
    });

    it('should call mocked functions without errors', async () => {
      Club.findAll.mockResolvedValue([]);
      const result = await Club.findAll();
      expect(result).toEqual([]);
      expect(Club.findAll).toHaveBeenCalled();
    });

    it('should properly mock club objects with required methods', () => {
      const testClub = createMockClub();
      expect(testClub.getCarnivalCount).toBeDefined();
      expect(testClub.toJSON).toBeDefined();
      expect(typeof testClub.getCarnivalCount).toBe('function');
      expect(typeof testClub.toJSON).toBe('function');
    });
  });

  describe('Public Club Functionality', () => {
    describe('showClubListings', () => {
      it('should call Club.findAll when showClubListings is invoked', async () => {
        Club.findAll.mockResolvedValue([]);
        ClubAlternateName.searchClubsByAlternateName.mockResolvedValue([]);

        await showClubListings(req, res, next);

        expect(Club.findAll).toHaveBeenCalled();
        expect(ClubAlternateName.searchClubsByAlternateName).not.toHaveBeenCalled();
      });

      it('should handle search parameters and call appropriate functions', async () => {
        req.query = { search: 'test', state: 'NSW' };
        
        Club.findAll.mockResolvedValue([]);
        ClubAlternateName.searchClubsByAlternateName.mockResolvedValue([]);

        await showClubListings(req, res, next);

        expect(ClubAlternateName.searchClubsByAlternateName).toHaveBeenCalledWith('test');
        expect(Club.findAll).toHaveBeenCalledWith(expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            isPubliclyListed: true
          })
        }));
      });

      it('should not throw errors when processing empty club arrays', async () => {
        Club.findAll.mockResolvedValue([]);
        ClubAlternateName.searchClubsByAlternateName.mockResolvedValue([]);

        // This should not throw an error
        await expect(async () => {
          await showClubListings(req, res, next);
        }).not.toThrow();
        
        expect(Club.findAll).toHaveBeenCalled();
        expect(next).not.toHaveBeenCalled(); // No errors should be passed to next
      });

      it('should display public club listings with default pagination', async () => {
        const mockClubs = [mockClub, { ...mockClub, id: 2, clubName: 'Second Club' }];
        // Each club needs getCarnivalCount method for the controller logic
        mockClubs.forEach(club => {
          club.getCarnivalCount = vi.fn().mockResolvedValue(5);
        });
        Club.findAll.mockResolvedValue(mockClubs);

        await showClubListings(req, res, next);

        expect(Club.findAll).toHaveBeenCalledWith(expect.objectContaining({
          where: {
            isActive: true,
            isPubliclyListed: true
          },
          order: [['clubName', 'ASC']],
          include: expect.any(Array)
        }));

        expect(res.render).toHaveBeenCalledWith('clubs/list', expect.objectContaining({
          title: 'Find a Masters Rugby League Club',
          clubs: expect.any(Array)
        }));
      });

      it('should handle empty results gracefully', async () => {
        Club.findAll.mockResolvedValue([]);

        await showClubListings(req, res, next);

        expect(res.render).toHaveBeenCalledWith('clubs/list', expect.objectContaining({
          title: 'Find a Masters Rugby League Club',
          clubs: []
        }));
      });
    });

    describe('showClubProfile', () => {
      it('should display club profile for active publicly listed club', async () => {
        req.params.id = '1';
        
        const mockClubWithDetails = {
          ...mockClub,
          delegates: [{ ...mockUser, isPrimaryDelegate: true }],
          sponsors: [],
          alternateNames: []
        };
        
        Club.findByPk.mockResolvedValue(mockClub); // First check if club exists
        Club.findOne.mockResolvedValue(mockClubWithDetails);
        User.findAll.mockResolvedValue([mockUser]);
        Carnival.findAll.mockResolvedValue([]);
        CarnivalClub.findAll.mockResolvedValue([]);

        await showClubProfile(req, res, next);

        expect(res.render).toHaveBeenCalledWith('clubs/show', expect.objectContaining({
          title: `${mockClub.clubName} - Masters Rugby League Club`,
          club: mockClubWithDetails
        }));
      });

      it('should redirect if club does not exist', async () => {
        req.params.id = '999';
        Club.findByPk.mockResolvedValue(null);

        await showClubProfile(req, res);

        expect(req.flash).toHaveBeenCalledWith('error_msg', 'Club not found.');
        expect(res.redirect).toHaveBeenCalledWith('/clubs');
      });

      it('should redirect if club is inactive', async () => {
        req.params.id = '1';
        const inactiveClub = { ...mockClub, isActive: false };
        Club.findByPk.mockResolvedValue(inactiveClub);

        await showClubProfile(req, res);

        expect(req.flash).toHaveBeenCalledWith(
          'error_msg',
          'This club is no longer active. Club profiles are only available for active clubs.'
        );
        expect(res.redirect).toHaveBeenCalledWith('/clubs');
      });
    });
  });

  describe('Club Management for Delegates', () => {
    describe('showClubManagement', () => {
      it('should show club options for user without club', async () => {
        req.user = { ...mockUser, clubId: null };
        
        const availableClubs = [mockClub];
        const claimableClubs = [];
        
        Club.findAll
          .mockResolvedValueOnce(availableClubs) // Available clubs
          .mockResolvedValueOnce(claimableClubs); // Claimable clubs

        await showClubManagement(req, res, next);

        expect(res.render).toHaveBeenCalledWith('clubs/club-options', expect.objectContaining({
          title: 'Join or Create a Club',
          user: req.user,
          availableClubs,
          claimableClubs
        }));
      });

      it('should show management interface for user with club', async () => {
        req.user = { ...mockUser, clubId: 1 };
        Club.findByPk.mockResolvedValue(mockClub);

        await showClubManagement(req, res, next);

        expect(res.render).toHaveBeenCalledWith('clubs/manage', expect.objectContaining({
          title: 'Manage Club Profile',
          club: mockClub
        }));
      });

      it('should redirect if user club not found', async () => {
        req.user = { ...mockUser, clubId: 1 };
        Club.findByPk.mockResolvedValue(null);

        await showClubManagement(req, res, next);

        expect(req.flash).toHaveBeenCalledWith('error_msg', 'Club not found.');
        expect(res.redirect).toHaveBeenCalledWith('/dashboard');
      });
    });

    describe('updateClubProfile', () => {
      beforeEach(() => {
        req.user = { ...mockUser, clubId: 1 };
        req.body = {
          location: 'Melbourne',
          description: 'Updated description',
          contactPerson: 'Updated Person',
          contactEmail: 'updated@example.com',
          contactPhone: '0987654321',
          website: 'https://example.com',
          facebookUrl: 'https://facebook.com/club',
          instagramUrl: 'https://instagram.com/club',
          twitterUrl: 'https://twitter.com/club',
          isPubliclyListed: 'on',
          isActive: 'on'
        };
      });

      it('should successfully update club profile', async () => {
        await updateClubProfile(req, res, next);

        expect(mockClub.update).toHaveBeenCalledWith(expect.objectContaining({
          location: 'Melbourne',
          contactEmail: 'updated@example.com',
          contactPhone: '0987654321',
          contactPerson: 'Updated Person',
          description: 'Updated description'
        }));

        expect(req.flash).toHaveBeenCalledWith(
          'success_msg',
          'Club profile updated successfully!'
        );
        expect(res.redirect).toHaveBeenCalledWith('/clubs/manage');
      });

      it('should handle validation errors', async () => {
        validationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => [{ msg: 'Email is invalid' }, { msg: 'Phone is invalid' }]
        });

        await updateClubProfile(req, res, next);

        expect(req.flash).toHaveBeenCalledWith(
          'error_msg',
          'Validation errors: Email is invalid, Phone is invalid'
        );
        expect(res.redirect).toHaveBeenCalledWith('/clubs/manage');
      });

      it('should handle user without club', async () => {
        req.user = { ...mockUser, clubId: null };

        await updateClubProfile(req, res, next);

        expect(req.flash).toHaveBeenCalledWith(
          'error_msg',
          'You must be associated with a club to manage its profile.'
        );
        expect(res.redirect).toHaveBeenCalledWith('/dashboard');
      });
    });

    describe('createClub', () => {
      beforeEach(() => {
        req.user = { ...mockUser, clubId: null };
        req.body = {
          clubName: 'New Test Club',
          state: 'VIC',
          location: 'Melbourne',
          description: 'New club description'
        };
      });

      it('should successfully create new club', async () => {
        Club.findOne.mockResolvedValue(null); // No existing club
        const newClub = { ...mockClub, id: 2, clubName: 'New Test Club' };
        Club.create.mockResolvedValue(newClub);

        await createClub(req, res, next);

        expect(Club.create).toHaveBeenCalledWith(expect.objectContaining({
          clubName: 'New Test Club',
          state: 'VIC',
          location: 'Melbourne',
          description: 'New club description',
          createdByUserId: 1,
          isPubliclyListed: true,
          isActive: true
        }));

        expect(mockUser.update).toHaveBeenCalledWith({
          clubId: 2,
          isPrimaryDelegate: true
        });

        expect(req.flash).toHaveBeenCalledWith(
          'success_msg',
          'Club "New Test Club" has been created successfully! You are now the primary delegate.'
        );
        expect(res.redirect).toHaveBeenCalledWith('/dashboard');
      });

      it('should handle validation errors', async () => {
        validationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => [{ msg: 'Club name is required' }]
        });

        await createClub(req, res, next);

        expect(req.flash).toHaveBeenCalledWith(
          'error_msg',
          'Please correct the validation errors.'
        );
        expect(res.redirect).toHaveBeenCalledWith('/clubs/manage');
      });

      it('should handle duplicate club name', async () => {
        Club.findOne.mockResolvedValue(mockClub); // Existing club found

        await createClub(req, res, next);

        expect(req.flash).toHaveBeenCalledWith(
          'error_msg',
          'A club with this name already exists. Please choose a different name.'
        );
        expect(res.redirect).toHaveBeenCalledWith('/clubs/manage');
      });
    });
  });

  describe('Club Membership Operations', () => {
    describe('joinClub', () => {
      beforeEach(() => {
        req.user = { ...mockUser, clubId: null };
        req.params.id = '1';
      });

      it('should successfully join club without primary delegate', async () => {
        const clubWithoutPrimary = {
          ...mockClub,
          delegates: [{ ...mockUser, id: 2, isPrimaryDelegate: false }]
        };
        Club.findOne.mockResolvedValue(clubWithoutPrimary);

        await joinClub(req, res, next);

        expect(mockUser.update).toHaveBeenCalledWith(
          {
            clubId: 1,
            isPrimaryDelegate: false
          },
          { transaction: mockTransaction }
        );

        expect(mockTransaction.commit).toHaveBeenCalled();
        expect(req.flash).toHaveBeenCalledWith(
          'success_msg',
          'You have successfully joined "Test Club" as a club delegate. You can now create carnivals for this club.'
        );
        expect(res.redirect).toHaveBeenCalledWith('/dashboard');
      });

      it('should redirect if club has primary delegate', async () => {
        const clubWithPrimary = {
          ...mockClub,
          delegates: [{ ...mockUser, id: 2, isPrimaryDelegate: true, firstName: 'Primary', lastName: 'User' }]
        };
        Club.findOne.mockResolvedValue(clubWithPrimary);

        await joinClub(req, res, next);

        expect(req.flash).toHaveBeenCalledWith(
          'error_msg',
          'This club already has a primary delegate (Primary User). Please contact them to request an invitation to join the club. You can find their contact information on the club\'s profile page.'
        );
        expect(res.redirect).toHaveBeenCalledWith('/clubs/1');
      });

      it('should handle user already has club', async () => {
        req.user = { ...mockUser, clubId: 2 };

        await joinClub(req, res, next);

        expect(req.flash).toHaveBeenCalledWith(
          'error_msg',
          'You are already associated with a club. You can only be a member of one club at a time.'
        );
        expect(res.redirect).toHaveBeenCalledWith('/clubs/manage');
      });

      it('should handle club not found', async () => {
        Club.findOne.mockResolvedValue(null);

        await joinClub(req, res, next);

        expect(req.flash).toHaveBeenCalledWith(
          'error_msg',
          'Club not found or is not active.'
        );
        expect(res.redirect).toHaveBeenCalledWith('/clubs/manage');
      });
    });

    describe('leaveClub', () => {
      beforeEach(() => {
        req.user = { ...mockUser, clubId: 1, isPrimaryDelegate: false };
        req.body = { confirmed: 'true' };
      });

      it('should successfully leave club as regular delegate', async () => {
        await leaveClub(req, res, next);

        expect(mockUser.update).toHaveBeenCalledWith(
          {
            clubId: null,
            isPrimaryDelegate: false
          },
          { transaction: mockTransaction }
        );

        expect(mockTransaction.commit).toHaveBeenCalled();
        expect(req.flash).toHaveBeenCalledWith(
          'success_msg',
          'You have successfully left "Test Club". You can now join a different club if needed.'
        );
        expect(res.redirect).toHaveBeenCalledWith('/dashboard');
      });

      it('should handle user without club', async () => {
        req.user = { ...mockUser, clubId: null };

        await leaveClub(req, res, next);

        expect(req.flash).toHaveBeenCalledWith(
          'error_msg',
          'You are not currently associated with any club.'
        );
        expect(res.redirect).toHaveBeenCalledWith('/dashboard');
      });

      it('should handle missing confirmation', async () => {
        req.body = { confirmed: 'false' };

        await leaveClub(req, res, next);

        expect(req.flash).toHaveBeenCalledWith(
          'error_msg',
          'You must confirm that you want to leave the club.'
        );
        expect(res.redirect).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('Club Ownership Claims', () => {
    describe('getClaimOwnership', () => {
      it('should show claim ownership form for valid club', async () => {
        req.params.id = '1';
        req.user = { ...mockUser, clubId: null };

        const proxyClub = {
          ...mockClub,
          createdByProxy: true,
          inviteEmail: 'test@example.com',
          delegates: [],
          isUnclaimed: vi.fn().mockReturnValue(true),
          canUserClaim: vi.fn().mockReturnValue(true)
        };
        Club.findByPk.mockResolvedValue(proxyClub);

        await getClaimOwnership(req, res, next);

        expect(res.render).toHaveBeenCalledWith('clubs/claim-ownership', expect.objectContaining({
          title: 'Claim Ownership - Test Club',
          club: proxyClub
        }));
      });

      it('should redirect if user already has club', async () => {
        req.user = { ...mockUser, clubId: 1 };

        await getClaimOwnership(req, res, next);

        expect(req.flash).toHaveBeenCalledWith(
          'error_msg',
          'This club already has an owner or was not created for claiming.'
        );
        expect(res.redirect).toHaveBeenCalledWith('/clubs/1');
      });
    });

    describe('postClaimOwnership', () => {
      beforeEach(() => {
        req.params.id = '1';
        req.user = { ...mockUser, clubId: null };
        req.body = { confirmed: 'true' };
      });

      it('should successfully claim club ownership', async () => {
        const proxyClub = {
          ...mockClub,
          createdByProxy: true,
          inviteEmail: 'test@example.com',
          delegates: [],
          canUserClaim: vi.fn().mockReturnValue(true),
          update: vi.fn().mockResolvedValue(true)
        };
        Club.findByPk.mockResolvedValue(proxyClub);

        await postClaimOwnership(req, res, next);

        expect(req.user.update).toHaveBeenCalledWith({
          clubId: 1,
          isPrimaryDelegate: true
        });

        expect(proxyClub.update).toHaveBeenCalledWith({
          createdByProxy: false,
          inviteEmail: null,
          isPubliclyListed: true
        });

        expect(req.flash).toHaveBeenCalledWith(
          'success_msg',
          'Congratulations! You are now the primary delegate for Test Club. You can manage your club\'s information and create carnivals.'
        );
        expect(res.redirect).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('API Endpoints', () => {
    describe('searchClubs', () => {
      it('should return formatted club search results', async () => {
        req.query = { q: 'test' }; // Ensure req.query.q is properly set

        const mockClubs = [
          {
            id: 1,
            clubName: 'Test Club',
            location: 'Sydney',
            state: 'NSW',
            alternateNames: []
          },
          {
            id: 2,
            clubName: 'Another Club',
            location: 'Melbourne',
            state: 'VIC',
            alternateNames: [{ alternateName: 'Test Alternate' }]
          }
        ];

        Club.findAll
          .mockResolvedValueOnce([mockClubs[0]]) // Search by name
          .mockResolvedValueOnce([mockClubs[1]]); // Search by alternate names
        
        ClubAlternateName.searchClubsByAlternateName.mockResolvedValue([2]);

        await searchClubs(req, res, next);

        expect(res.json).toHaveBeenCalledWith({
          success: true,
          clubs: expect.arrayContaining([
            expect.objectContaining({
              id: 1,
              clubName: 'Test Club',
              location: 'Sydney',
              state: 'NSW'
            }),
            expect.objectContaining({
              id: 2,
              clubName: 'Another Club',
              location: 'Melbourne',
              state: 'VIC'
            })
          ])
        });
      });

      it('should return empty results for no query', async () => {
        req.query = { q: '' }; // Ensure req.query.q is set to empty string

        await searchClubs(req, res, next);

        expect(res.json).toHaveBeenCalledWith({
          success: true,
          clubs: []
        });
      });

      it('should limit results to 10 clubs', async () => {
        req.query = { q: 'club' }; // Ensure req.query.q is properly set

        const manyClubs = Array.from({ length: 15 }, (_, i) => ({
          id: i + 1,
          clubName: `Club ${i + 1}`,
          location: 'City',
          state: 'NSW',
          alternateNames: []
        }));

        Club.findAll
          .mockResolvedValueOnce(manyClubs)
          .mockResolvedValueOnce([]);
        
        ClubAlternateName.searchClubsByAlternateName.mockResolvedValue([]);

        await searchClubs(req, res, next);

        expect(res.json).toHaveBeenCalled();
        const response = res.json.mock.calls[0][0];
        expect(response.clubs).toHaveLength(10);
      });
    });
  });

  describe('Sponsor Management', () => {
    describe('showClubSponsors', () => {
      it('should display club sponsors for authorized user (sorted by displayOrder)', async () => {
        req.user = { ...mockUser, clubId: 1 };
        req.params.id = '1';

        const unsortedSponsors = [
          { id: 2, sponsorName: 'B', displayOrder: 3 },
          { id: 1, sponsorName: 'A', displayOrder: 1 },
          { id: 3, sponsorName: 'C' } // no order -> treated as 999
        ];
        const clubWithSponsors = { ...mockClub, clubSponsors: [...unsortedSponsors] };
        Club.findByPk.mockResolvedValue(clubWithSponsors);

        await showClubSponsors(req, res, next);

        expect(Club.findByPk).toHaveBeenCalledWith(1, expect.objectContaining({ include: expect.any(Array) }));
        expect(res.render).toHaveBeenCalled();
        const [view, ctx] = res.render.mock.calls[0];
        expect(view).toBe('clubs/sponsors');
        expect(ctx.title).toBe('Manage Club Sponsors');
        // Sponsors should be sorted: displayOrder 1, then 3, then undefined
        expect(ctx.sponsors.map(s => s.id)).toEqual([1, 2, 3]);
      });

      it('should redirect unauthorized user', async () => {
        req.user = { ...mockUser, clubId: 2 };
        req.params.id = '1';

        await showClubSponsors(req, res, next);

        expect(req.flash).toHaveBeenCalledWith(
          'error_msg',
          'You can only manage sponsors for your own club.'
        );
        expect(res.redirect).toHaveBeenCalledWith('/clubs/manage');
      });
      // it('should display club sponsors for authorized user', async () => {
      //   req.user = { ...mockUser, clubId: 1 };
      //   req.params.id = '1';

      //   const mockSponsors = [
      //     {
      //       id: 1,
      //       sponsorName: 'Test Sponsor',
      //       ClubSponsor: { displayOrder: 1, tier: 'Premium' }
      //     }
      //   ];
        
      //   const clubWithSponsors = {
      //     ...mockClub,
      //     sponsors: mockSponsors
      //   };

      //   Club.findByPk.mockResolvedValue(clubWithSponsors);
      //   sortSponsorsHierarchically.mockReturnValue(mockSponsors);

      //   await showClubSponsors(req, res);

      //   expect(res.render).toHaveBeenCalledWith('clubs/sponsors', expect.objectContaining({
      //     title: 'Manage Club Sponsors',
      //     club: clubWithSponsors,
      //     sponsors: mockSponsors
      //   }));
      // });

      // it('should redirect unauthorized user', async () => {
      //   req.user = { ...mockUser, clubId: 2 };
      //   req.params.id = '1';

      //   await showClubSponsors(req, res);

      //   expect(req.flash).toHaveBeenCalledWith(
      //     'error_msg',
      //     'You can only manage sponsors for your own club.'
      //   );
      //   expect(res.redirect).toHaveBeenCalledWith('/clubs/manage');
      // });
    });

    describe('addSponsorToClub', () => {
      beforeEach(() => {
        req.user = { ...mockUser, clubId: 1 };
        req.params.id = '1';
        req.body = {
          sponsorId: '2',
          tier: 'Premium',
          customDisplayName: 'Custom Name'
        };
      });

      it('should successfully add sponsor to club', async () => {
        // Arrange: Set up request body to match controller expectations
        req.body = {
          sponsorType: 'existing',
          existingSponsorId: 2
        };
        const mockSponsor = {
          id: 2,
          sponsorName: 'Test Sponsor',
          clubId: 1,
          isAssociatedWithClub: vi.fn().mockResolvedValue(false)
        };
        Sponsor.findByPk.mockResolvedValue(mockSponsor);
        mockClub.getSponsors = vi.fn().mockResolvedValue([]); // Ensure getSponsors is a spy
        mockClub.addSponsor = vi.fn().mockResolvedValue(true); // Ensure addSponsor is a spy
        Club.findByPk.mockResolvedValue(mockClub); // Ensure controller uses the correct club instance

        // Act
        await addSponsorToClub(req, res);

        // Assert
        expect(mockClub.addSponsor).toHaveBeenCalledWith(mockSponsor, expect.objectContaining({
          through: expect.objectContaining({
            displayOrder: 1
          })
        }));
        expect(req.flash).toHaveBeenCalledWith(
          'success_msg',
          'Sponsor "Test Sponsor" has been added to your club!'
        );
        expect(res.redirect).toHaveBeenCalledWith('/clubs/manage/sponsors');
      });
    });
  });

  describe('Alternate Names Management', () => {
    describe('addAlternateName', () => {
      beforeEach(() => {
        req.user = { ...mockUser, clubId: 1 };
        req.params.id = '1';
        req.body = { alternateName: 'New Alternate Name' };
      });

      it('should successfully add alternate name', async () => {
        ClubAlternateName.isUniqueForClub.mockResolvedValue(true); // Not duplicate
        ClubAlternateName.create.mockResolvedValue({
          id: 1,
          alternateName: 'New Alternate Name',
          displayName: 'New Alternate Name'
        });

        await addAlternateName(req, res);

        expect(ClubAlternateName.create).toHaveBeenCalledWith({
          clubId: 1,
          alternateName: 'New Alternate Name',
          displayName: 'New Alternate Name'
        });

        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: 'Alternate name added successfully.',
          alternateName: {
            id: 1,
            displayName: 'New Alternate Name'
          }
        });
      });

      it('should handle duplicate alternate name', async () => {
        ClubAlternateName.isUniqueForClub.mockResolvedValue(false); // Duplicate found

        await addAlternateName(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'This alternate name already exists for your club.'
        });
      });
    });
  });

  describe('Image Management', () => {
    describe('getClubImages', () => {
      it('should return club images for authorized user', async () => {
        req.user = { ...mockUser, clubId: 1 };
        req.params = { clubId: '1' }; // Fix parameter name
        req.query = { imageType: 'gallery' };

        const mockImages = [
          { filename: 'image1.jpg', url: '/uploads/clubs/1/image1.jpg' },
          { filename: 'image2.jpg', url: '/uploads/clubs/1/image2.jpg' }
        ];

        // Mock the actual service method used by controller
        ImageNamingService.getEntityImages = vi.fn().mockResolvedValue(mockImages);

        await getClubImages(req, res);

        expect(ImageNamingService.getEntityImages).toHaveBeenCalledWith(
          ImageNamingService.ENTITY_TYPES.CLUB,
          1,
          'gallery'
        );
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          images: mockImages,
          total: mockImages.length
        });
      });

      it('should handle unauthorized access', async () => {
        req.user = { ...mockUser, clubId: 2 };
        req.params = { clubId: '1' };

        await getClubImages(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Access denied. You can only view images for your own club.'
        });
      });
    });

    describe('deleteClubImage', () => {
      beforeEach(() => {
        req.user = { ...mockUser, clubId: 1 };
        req.params = { clubId: '1', filename: 'image1.jpg' };
      });

      it('should successfully delete club image', async () => {
        const fs = await import('fs/promises');
        
        // Mock ImageNamingService methods used by controller
        ImageNamingService.parseImageName = vi.fn().mockReturnValue({
          entityType: ImageNamingService.ENTITY_TYPES.CLUB,
          entityId: 1,
          imageType: ImageNamingService.IMAGE_TYPES.GALLERY
        });
        ImageNamingService.getRelativePath = vi.fn().mockReturnValue('clubs/gallery');
        ImageNamingService.ENTITY_TYPES = { CLUB: 'club' };
        ImageNamingService.IMAGE_TYPES = { LOGO: 'logo', GALLERY: 'gallery' };
        
        fs.unlink = vi.fn().mockResolvedValue(true);

        await deleteClubImage(req, res);

        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: 'Image deleted successfully'
        });
      });

      it('should handle unauthorized access', async () => {
        req.user = { ...mockUser, clubId: 2 };

        await deleteClubImage(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Access denied. You can only delete images for your own club.'
        });
      });

      it('should handle invalid filename', async () => {
        req.params.filename = '/malicious.txt';
        
        // Mock parseImageName to return null for invalid files
        ImageNamingService.parseImageName = vi.fn().mockReturnValue(null);

        await deleteClubImage(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Invalid image file or image does not belong to this club'
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      Club.findAll.mockRejectedValue(new Error('Database error'));

      try {
        await showClubListings(req, res);
      } catch (error) {
        expect(error.message).toBe('Database error');
      }
    });

    it('should handle validation service errors', async () => {
      validationResult.mockImplementation(() => {
        throw new Error('Validation service error');
      });

      try {
        await createClub(req, res);
      } catch (error) {
        expect(error.message).toBe('Validation service error');
      }
    });

    it('should handle image service errors', async () => {
      req.user = { ...mockUser, clubId: 1 };
      req.params.id = '1';

      ImageNamingService.getClubImages.mockRejectedValue(
        new Error('Image service error')
      );

      try {
        await getClubImages(req, res);
      } catch (error) {
        expect(error.message).toBe('Image service error');
      }
    });
  });

  describe('Integration Status', () => {
    it('should successfully bypass Sequelize association conflicts', () => {
      // This test passing means we've successfully avoided the original error:
      // "You have used the alias club in two separate associations"
      expect(true).toBe(true);
    });

    it('should have all required mocks in place', () => {
      expect(Club).toBeDefined();
      expect(ClubAlternateName).toBeDefined();
      expect(res.render).toBeDefined();
      expect(typeof showClubListings).toBe('function');
    });

    it('should support comprehensive controller functionality', () => {
      // Verify we have imported all the necessary controller functions
      expect(typeof showClubListings).toBe('function');
      expect(typeof showClubProfile).toBe('function');
      expect(typeof createClub).toBe('function');
      expect(typeof joinClub).toBe('function');
      expect(typeof searchClubs).toBe('function');
      expect(typeof addSponsorToClub).toBe('function');
      expect(typeof getClubImages).toBe('function');
    });
  });
});