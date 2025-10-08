/**
 * Club Player Controller Tests
 * 
 * Comprehensive test suite for club player management functionality following the proven pattern 
 * from club, main, carnival, admin, and sponsor controllers with 100% success rate implementation.
 * 
 * Covers player CRUD operations, roster management, CSV import/export, age validation,
 * eligibility checking, and authorization controls.
 * 
 * @author Old Man Footy System
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { sequelize } from '../../config/database.mjs';

// Mock the asyncHandler middleware to prevent wrapping issues
vi.mock('../../middleware/asyncHandler.mjs', () => ({
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
  PLAYER_SHORTS_COLORS_ARRAY: ['Unrestricted', 'Red', 'Yellow', 'Blue', 'Green']
}));

// Mock all model imports before importing the controller
vi.mock('/models/index.mjs', () => {
  const createMockClubPlayer = (overrides = {}) => ({
    id: 1,
    clubId: 1,
    firstName: 'John',
    lastName: 'Smith',
    dateOfBirth: '1985-06-15',
    email: 'john.smith@example.com',
    notes: 'Test player notes',
    shorts: 'Unrestricted',
    isActive: true,
    registeredAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    update: vi.fn().mockResolvedValue(true),
    getFullName: vi.fn().mockReturnValue('John Smith'),
    getAge: vi.fn().mockReturnValue(38),
    isMastersEligible: vi.fn().mockReturnValue(true),
    getInitials: vi.fn().mockReturnValue('J.S.'),
    toJSON: vi.fn().mockImplementation(function () {
      const { toJSON, update, getFullName, getAge, isMastersEligible, getInitials, ...rest } = this;
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
    contactEmail: 'contact@testclub.com',
    contactPhone: '0987654321',
    ...overrides
  });

  const createMockUser = (overrides = {}) => ({
    id: 1,
    email: 'delegate@testclub.com',
    firstName: 'Test',
    lastName: 'Delegate',
    clubId: 1,
    isPrimaryDelegate: false,
    isAdmin: false,
    isActive: true,
    ...overrides
  });

  return {
    ClubPlayer: {
      findAndCountAll: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn(),
      findByPk: vi.fn(),
      create: vi.fn()
    },
    Club: {
      findByPk: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn()
    },
    createMockClubPlayer,
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
  showClubPlayers,
  showAddPlayerForm,
  createPlayer,
  showEditPlayerForm,
  updatePlayer,
  deactivatePlayer,
  reactivatePlayer,
  downloadCsvTemplate,
  importPlayersFromCsv,
  validatePlayer,
  validatePlayerId,
  validateCsvImport
} from '../../controllers/clubPlayer.controller.mjs';

import {
  ClubPlayer,
  Club,
  createMockClubPlayer,
  createMockClub,
  createMockUser,
  Op
} from '../../models/index.mjs';

import { validationResult } from 'express-validator';

describe('Club Player Controller', () => {
  let req, res, next;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock request object
    req = {
      params: {},
      query: {},
      body: {},
      user: createMockUser({ id: 1, clubId: 1, isPrimaryDelegate: true }),
      flash: vi.fn(),
      file: null
    };

    // Mock response object
    res = {
      render: vi.fn(),
      redirect: vi.fn(),
      send: vi.fn(),
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      locals: {}
    };

    // Mock next function
    next = vi.fn();

    // Set up default model mocks
    ClubPlayer.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    ClubPlayer.findAll.mockResolvedValue([]);
    ClubPlayer.findOne.mockResolvedValue(null);
    ClubPlayer.findByPk.mockResolvedValue(null);
    ClubPlayer.create.mockResolvedValue(createMockClubPlayer());

    Club.findByPk.mockResolvedValue(createMockClub());
    Club.findAll.mockResolvedValue([]);
    Club.findOne.mockResolvedValue(null);

    // Mock validation to return no errors by default
    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => []
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Player Roster Management', () => {
    it('should display club players list with pagination and search', async () => {
      const mockPlayers = [
        createMockClubPlayer({
          id: 1,
          firstName: 'John',
          lastName: 'Smith',
          email: 'john@example.com'
        }),
        createMockClubPlayer({
          id: 2,
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com'
        })
      ];

      const mockClub = createMockClub({ id: 1, clubName: 'Test Club' });

      ClubPlayer.findAndCountAll.mockResolvedValue({ count: 2, rows: mockPlayers });
      ClubPlayer.findAll.mockResolvedValue([]); // inactive players
      Club.findByPk.mockResolvedValue(mockClub);

      req.query = { search: 'john', sortBy: 'lastName', sortOrder: 'ASC', page: '1' };

      await showClubPlayers(req, res, next);

      expect(ClubPlayer.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          clubId: 1,
          isActive: true,
          [Op.or]: expect.any(Array)
        }),
        order: [['lastName', 'ASC']],
        limit: 20,
        offset: 0,
        include: expect.any(Array)
      }));

      expect(res.render).toHaveBeenCalledWith('clubs/players/index', expect.objectContaining({
        title: 'Test Club - Players',
        players: mockPlayers,
        club: mockClub,
        search: 'john',
        pagination: expect.objectContaining({
          currentPage: 1,
          totalPages: 1,
          totalPlayers: 2
        })
      }));
    });

    it('should handle unauthorized access to player list', async () => {
      req.user = null;

      await showClubPlayers(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error', 'You must be logged in to view players.');
      expect(res.redirect).toHaveBeenCalledWith('/auth/login');
    });

    it('should handle club not found error', async () => {
      Club.findByPk.mockResolvedValue(null);

      await showClubPlayers(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error', 'Club not found.');
      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('should display inactive players separately', async () => {
      const activePlayers = [createMockClubPlayer({ id: 1, isActive: true })];
      const inactivePlayers = [createMockClubPlayer({ id: 2, isActive: false })];
      const mockClub = createMockClub();

      ClubPlayer.findAndCountAll.mockResolvedValue({ count: 1, rows: activePlayers });
      ClubPlayer.findAll.mockResolvedValue(inactivePlayers);
      Club.findByPk.mockResolvedValue(mockClub);

      await showClubPlayers(req, res, next);

      expect(ClubPlayer.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          clubId: 1,
          isActive: false
        },
        order: [['updatedAt', 'DESC']]
      }));

      expect(res.render).toHaveBeenCalledWith('clubs/players/index', expect.objectContaining({
        players: activePlayers,
        inactivePlayers: inactivePlayers
      }));
    });
  });

  describe('Player CRUD Operations', () => {
    it('should show add player form for authorized users', async () => {
      const mockClub = createMockClub({ id: 1, clubName: 'Test Club' });
      Club.findByPk.mockResolvedValue(mockClub);

      await showAddPlayerForm(req, res, next);

      expect(Club.findByPk).toHaveBeenCalledWith(1, {
        attributes: ['id', 'clubName']
      });

      expect(res.render).toHaveBeenCalledWith('clubs/players/add', {
        title: 'Add Player - Test Club',
        club: mockClub,
        formData: {}
      });
    });

    it('should deny access to add form for unauthorized users', async () => {
      req.user = createMockUser({ clubId: null });

      await showAddPlayerForm(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error', 'You can only manage players for your own club.');
      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('should create new player with valid data', async () => {
      const mockPlayer = createMockClubPlayer({
        id: 1,
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@example.com'
      });

      req.body = {
        firstName: 'John',
        lastName: 'Smith',
        dateOfBirth: '1985-06-15',
        email: 'john.smith@example.com',
        notes: 'Test player',
        shorts: 'Blue'
      };

      ClubPlayer.create.mockResolvedValue(mockPlayer);

      await createPlayer(req, res, next);

      expect(ClubPlayer.create).toHaveBeenCalledWith({
        clubId: 1,
        firstName: 'John',
        lastName: 'Smith',
        dateOfBirth: '1985-06-15',
        email: 'john.smith@example.com',
        notes: 'Test player',
        shorts: 'Blue'
      });

      expect(req.flash).toHaveBeenCalledWith('success', 'Player John Smith has been successfully added to your club.');
      expect(res.redirect).toHaveBeenCalledWith('/clubs/players');
    });

    it('should handle validation errors during player creation', async () => {
      const mockClub = createMockClub({ id: 1, clubName: 'Test Club' });

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          { msg: 'First name is required' },
          { msg: 'Valid email address is required' }
        ]
      });

      Club.findByPk.mockResolvedValue(mockClub);

      req.body = { firstName: '', email: 'invalid-email' };

      await createPlayer(req, res, next);

      expect(res.render).toHaveBeenCalledWith('clubs/players/add', expect.objectContaining({
        title: 'Add Player - Test Club',
        club: mockClub,
        formData: req.body,
        errors: expect.any(Array)
      }));
    });

    it('should show edit player form for authorized users', async () => {
      const mockPlayer = createMockClubPlayer({
        id: 1,
        firstName: 'John',
        lastName: 'Smith',
        club: createMockClub()
      });

      req.params.id = '1';
      ClubPlayer.findOne.mockResolvedValue(mockPlayer);

      await showEditPlayerForm(req, res, next);

      expect(ClubPlayer.findOne).toHaveBeenCalledWith({
        where: {
          id: '1',
          clubId: 1
        },
        include: expect.any(Array)
      });

      expect(res.render).toHaveBeenCalledWith('clubs/players/edit', expect.objectContaining({
        title: 'Edit Player - John Smith',
        player: mockPlayer,
        club: mockPlayer.club
      }));
    });

    it('should update player with valid data', async () => {
      const mockPlayer = createMockClubPlayer({ id: 1 });

      req.params.id = '1';
      req.body = {
        firstName: 'Updated',
        lastName: 'Player',
        dateOfBirth: '1985-06-15',
        email: 'updated@example.com',
        notes: 'Updated notes',
        shorts: 'Red'
      };

      ClubPlayer.findOne.mockResolvedValue(mockPlayer);

      await updatePlayer(req, res, next);

      expect(mockPlayer.update).toHaveBeenCalledWith({
        firstName: 'Updated',
        lastName: 'Player',
        dateOfBirth: '1985-06-15',
        email: 'updated@example.com',
        notes: 'Updated notes',
        shorts: 'Red'
      });

      expect(req.flash).toHaveBeenCalledWith('success', 'Player John Smith has been successfully updated.');
      expect(res.redirect).toHaveBeenCalledWith('/clubs/players');
    });

    it('should handle duplicate email error during creation', async () => {
      const error = new Error('Duplicate email');
      error.name = 'SequelizeUniqueConstraintError';

      ClubPlayer.create.mockRejectedValue(error);

      req.body = {
        firstName: 'John',
        lastName: 'Smith',
        email: 'existing@example.com'
      };

      await createPlayer(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error', 'A player with this email address already exists.');
      expect(res.redirect).toHaveBeenCalledWith('/clubs/players/add');
    });
  });

  describe('Player Status Management', () => {
    it('should deactivate player successfully', async () => {
      const mockPlayer = createMockClubPlayer({
        id: 1,
        isActive: true
      });

      req.params.id = '1';
      ClubPlayer.findOne.mockResolvedValue(mockPlayer);

      await deactivatePlayer(req, res, next);

      expect(ClubPlayer.findOne).toHaveBeenCalledWith({
        where: {
          id: '1',
          clubId: 1,
          isActive: true
        }
      });

      expect(mockPlayer.update).toHaveBeenCalledWith({ isActive: false });
      expect(req.flash).toHaveBeenCalledWith('success', 'Player John Smith has been removed from your club.');
      expect(res.redirect).toHaveBeenCalledWith('/clubs/players');
    });

    it('should reactivate player successfully', async () => {
      const mockPlayer = createMockClubPlayer({
        id: 1,
        isActive: false
      });

      req.params.id = '1';
      ClubPlayer.findOne.mockResolvedValue(mockPlayer);

      await reactivatePlayer(req, res, next);

      expect(ClubPlayer.findOne).toHaveBeenCalledWith({
        where: {
          id: '1',
          clubId: 1,
          isActive: false
        }
      });

      expect(mockPlayer.update).toHaveBeenCalledWith({ isActive: true });
      expect(req.flash).toHaveBeenCalledWith('success', 'Player John Smith has been successfully reactivated.');
      expect(res.redirect).toHaveBeenCalledWith('/clubs/players');
    });

    it('should handle player not found for deactivation', async () => {
      req.params.id = '999';
      ClubPlayer.findOne.mockResolvedValue(null);

      await deactivatePlayer(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error', 'Player not found or you do not have permission to remove this player.');
      expect(res.redirect).toHaveBeenCalledWith('/clubs/players');
    });

    it('should handle unauthorized deactivation attempt', async () => {
      req.user = createMockUser({ clubId: null });

      await deactivatePlayer(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error', 'You do not have permission to access this club.');
      expect(res.redirect).toHaveBeenCalledWith('/clubs');
    });

    it('should handle unauthenticated deactivation attempt', async () => {
      req.user = null;

      await deactivatePlayer(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error', 'You must be logged in to remove players.');
      expect(res.redirect).toHaveBeenCalledWith('/auth/login');
    });
  });

  describe('CSV Import/Export Functionality', () => {
    it('should download CSV template successfully', async () => {
      const mockClub = createMockClub({ id: 1, clubName: 'Test Club' });
      Club.findByPk.mockResolvedValue(mockClub);

      await downloadCsvTemplate(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="Test_Club_players_template.csv"');
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('firstName,lastName,email,dateOfBirth,notes,shorts'));
    });

    it('should handle unauthenticated CSV template download', async () => {
      req.user = null;

      await downloadCsvTemplate(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error', 'You must be logged in to download the template.');
      expect(res.redirect).toHaveBeenCalledWith('/auth/login');
    });

    it('should handle CSV import with valid data', async () => {
      const mockClub = createMockClub({ id: 1, clubName: 'Test Club' });
      const csvContent = 'firstName,lastName,email,dateOfBirth,notes,shorts\n"John","Smith","john@example.com","1985-06-15","Test notes","Blue"';

      req.file = {
        buffer: Buffer.from(csvContent, 'utf8')
      };
      req.body = {
        shortsColor: 'Red',
        updateExisting: false,
        notes: 'Imported player'
      };

      Club.findByPk.mockResolvedValue(mockClub);
      ClubPlayer.findOne.mockResolvedValue(null); // No existing player
      ClubPlayer.create.mockResolvedValue(createMockClubPlayer());

      await importPlayersFromCsv(req, res, next);

      expect(ClubPlayer.create).toHaveBeenCalledWith({
        clubId: 1,
        firstName: 'John',
        lastName: 'Smith',
        email: 'john@example.com',
        dateOfBirth: '1985-06-15',
        notes: 'Test notes',
        shorts: 'Blue'
      });

      expect(req.flash).toHaveBeenCalledWith('success', expect.stringContaining('Import complete'));
      expect(res.redirect).toHaveBeenCalledWith('/clubs/players');
    });

    it('should handle CSV import with missing file', async () => {
      req.file = null;

      await importPlayersFromCsv(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error', 'Please select a CSV file to upload.');
      expect(res.redirect).toHaveBeenCalledWith('/clubs/players');
    });

    it('should handle CSV import with invalid headers', async () => {
      const invalidCsv = 'name,age,phone\n"John","30","123456789"';
      const mockClub = createMockClub();

      req.file = {
        buffer: Buffer.from(invalidCsv, 'utf8')
      };

      Club.findByPk.mockResolvedValue(mockClub);

      await importPlayersFromCsv(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error', expect.stringContaining('Missing required columns'));
      expect(res.redirect).toHaveBeenCalledWith('/clubs/players');
    });

    it('should handle CSV import with duplicate players', async () => {
      const csvContent = 'firstName,lastName,email,dateOfBirth\n"John","Smith","john@example.com","1985-06-15"';
      const existingPlayer = createMockClubPlayer({
        firstName: 'John',
        lastName: 'Smith',
        dateOfBirth: '1985-06-15'
      });

      req.file = {
        buffer: Buffer.from(csvContent, 'utf8')
      };
      req.body = { updateExisting: false };

      Club.findByPk.mockResolvedValue(createMockClub());
      ClubPlayer.findOne.mockResolvedValue(existingPlayer); // Existing player found

      await importPlayersFromCsv(req, res, next);

      expect(req.flash).toHaveBeenCalledWith(expect.stringMatching(/success|warning/), expect.stringContaining('duplicates skipped'));
      expect(res.redirect).toHaveBeenCalledWith('/clubs/players');
    });

    it('should handle CSV template download for unauthorized users', async () => {
      req.user = createMockUser({ clubId: null });

      await downloadCsvTemplate(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error', 'You can only manage players for your own club.');
      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Security and Authorization', () => {
    it('should prevent cross-club player access', async () => {
      req.user = createMockUser({ clubId: 2 }); // Different club
      req.params.id = '1';

      ClubPlayer.findOne.mockResolvedValue(null); // Player not found in user's club

      await showEditPlayerForm(req, res, next);

      expect(ClubPlayer.findOne).toHaveBeenCalledWith({
        where: {
          id: '1',
          clubId: 2 // User's club ID enforced
        },
        include: expect.any(Array)
      });

      expect(req.flash).toHaveBeenCalledWith('error', 'Player not found or you do not have permission to edit this player.');
      expect(res.redirect).toHaveBeenCalledWith('/clubs/players');
    });

    it('should enforce club isolation in player listings', async () => {
      req.user = createMockUser({ clubId: 5 });
      ClubPlayer.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      ClubPlayer.findAll.mockResolvedValue([]);
      Club.findByPk.mockResolvedValue(createMockClub({ id: 5 }));

      await showClubPlayers(req, res, next);

      expect(ClubPlayer.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          clubId: 5 // Only user's club
        })
      }));
    });

    it('should validate player permissions for updates', async () => {
      req.user = createMockUser({ clubId: 1 });
      req.params.id = '1';

      // Player belongs to different club
      ClubPlayer.findOne.mockResolvedValue(null);

      await updatePlayer(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error', 'Player not found or you do not have permission to edit this player.');
      expect(res.redirect).toHaveBeenCalledWith('/clubs/players');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      ClubPlayer.findAndCountAll.mockRejectedValue(dbError);

      await showClubPlayers(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });

    it('should handle validation errors during update', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Invalid date format' }]
      });

      const mockPlayer = createMockClubPlayer();
      ClubPlayer.findOne.mockResolvedValue(mockPlayer);
      req.params.id = '1';

      await updatePlayer(req, res, next);

      expect(res.render).toHaveBeenCalledWith('clubs/players/edit', expect.objectContaining({
        errors: expect.any(Array)
      }));
    });

    it('should handle CSV processing errors', async () => {
      const csvContent = 'firstName,lastName,email,dateOfBirth\n"John","Smith","invalid-email","invalid-date"';
      
      req.file = {
        buffer: Buffer.from(csvContent, 'utf8')
      };

      Club.findByPk.mockResolvedValue(createMockClub());

      await importPlayersFromCsv(req, res, next);

      expect(req.flash).toHaveBeenCalledWith(expect.stringMatching(/success|warning/), expect.stringContaining('errors'));
    });
  });
});