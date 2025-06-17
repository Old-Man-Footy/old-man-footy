/**
 * ClubPlayer Controller - Express/Node.js Implementation
 * 
 * Handles HTTP requests for club player management functionality.
 * Follows strict MVC pattern with proper input validation and error handling.
 */

const { body, validationResult, param } = require('express-validator');
const { ClubPlayer, Club } = require('../models');
const { Op } = require('sequelize');

/**
 * Display club players list for the authenticated user's club
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function showClubPlayers(req, res, next) {
  try {
    console.log('=== DEBUG: showClubPlayers called ===');
    console.log('User:', req.user ? { id: req.user.id, email: req.user.email, clubId: req.user.clubId } : 'No user');
    
    // Ensure user is authenticated and has a club
    if (!req.user || !req.user.clubId) {
      console.log('=== DEBUG: User not authenticated or no clubId ===');
      req.flash('error', 'You must be a club delegate to view players.');
      return res.redirect('/dashboard');
    }

    console.log('=== DEBUG: User has clubId:', req.user.clubId, '===');

    // Get search and filter parameters
    const { search, sortBy = 'lastName', sortOrder = 'ASC', page = 1 } = req.query;
    const limit = 20;
    const offset = (parseInt(page) - 1) * limit;

    console.log('=== DEBUG: Query params ===', { search, sortBy, sortOrder, page });

    // Build where conditions
    const whereConditions = {
      clubId: req.user.clubId,
      isActive: true
    };

    // Add search functionality
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      whereConditions[Op.or] = [
        { firstName: { [Op.like]: searchTerm } },
        { lastName: { [Op.like]: searchTerm } },
        { email: { [Op.like]: searchTerm } }
      ];
    }

    console.log('=== DEBUG: Where conditions ===', whereConditions);

    // Get players with pagination
    const { count, rows: players } = await ClubPlayer.findAndCountAll({
      where: whereConditions,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit,
      offset,
      include: [{
        model: Club,
        as: 'club',
        attributes: ['id', 'clubName']
      }]
    });

    console.log('=== DEBUG: Found players ===', { count, playersLength: players.length });

    // Get inactive players (no pagination needed as they should be fewer)
    const inactivePlayers = await ClubPlayer.findAll({
      where: {
        clubId: req.user.clubId,
        isActive: false
      },
      order: [['updatedAt', 'DESC']], // Most recently deactivated first
      include: [{
        model: Club,
        as: 'club',
        attributes: ['id', 'clubName']
      }]
    });

    console.log('=== DEBUG: Found inactive players ===', { inactiveCount: inactivePlayers.length });

    // Calculate pagination info
    const totalPages = Math.ceil(count / limit);
    const currentPage = parseInt(page);

    // Get club information
    const club = await Club.findByPk(req.user.clubId, {
      attributes: ['id', 'clubName']
    });

    console.log('=== DEBUG: Club found ===', club ? { id: club.id, name: club.clubName } : 'No club');

    if (!club) {
      console.log('=== DEBUG: Club not found, redirecting ===');
      req.flash('error', 'Club not found.');
      return res.redirect('/dashboard');
    }

    console.log('=== DEBUG: About to render view ===');

    res.render('clubs/players/index', {
      title: `${club.clubName} - Players`,
      players,
      inactivePlayers,
      club,
      search: search || '',
      sortBy,
      sortOrder,
      pagination: {
        currentPage,
        totalPages,
        totalPlayers: count,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
        nextPage: currentPage + 1,
        prevPage: currentPage - 1
      }
    });

    console.log('=== DEBUG: View rendered successfully ===');
  } catch (error) {
    console.error('=== DEBUG: Error in showClubPlayers ===', error);
    next(error);
  }
}

/**
 * Display form to add a new player
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function showAddPlayerForm(req, res, next) {
  try {
    // Ensure user is authenticated and has a club
    if (!req.user || !req.user.clubId) {
      req.flash('error', 'You must be a club delegate to add players.');
      return res.redirect('/dashboard');
    }

    // Get club information
    const club = await Club.findByPk(req.user.clubId, {
      attributes: ['id', 'clubName']
    });

    if (!club) {
      req.flash('error', 'Club not found.');
      return res.redirect('/dashboard');
    }

    res.render('clubs/players/add', {
      title: `Add Player - ${club.clubName}`,
      club,
      formData: {}
    });
  } catch (error) {
    console.error('Error showing add player form:', error);
    next(error);
  }
}

/**
 * Create a new club player
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function createPlayer(req, res, next) {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Get club information for re-rendering form
      const club = await Club.findByPk(req.user.clubId, {
        attributes: ['id', 'clubName']
      });

      return res.render('clubs/players/add', {
        title: `Add Player - ${club.clubName}`,
        club,
        formData: req.body,
        errors: errors.array()
      });
    }

    // Ensure user is authenticated and has a club
    if (!req.user || !req.user.clubId) {
      req.flash('error', 'You must be a club delegate to add players.');
      return res.redirect('/dashboard');
    }

    // Extract validated data
    const { firstName, lastName, dateOfBirth, email, notes, shorts } = req.body;

    // Create the player
    const player = await ClubPlayer.create({
      clubId: req.user.clubId,
      firstName,
      lastName,
      dateOfBirth,
      email,
      notes: notes || null,
      shorts: shorts || 'Unrestricted'
    });

    req.flash('success', `Player ${player.getFullName()} has been successfully added to your club.`);
    res.redirect('/clubs/players');
  } catch (error) {
    console.error('Error creating player:', error);
    
    // Handle specific database errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      req.flash('error', 'A player with this email address already exists.');
    } else if (error.name === 'SequelizeValidationError') {
      req.flash('error', error.errors.map(err => err.message).join(', '));
    } else {
      req.flash('error', 'Failed to add player. Please try again.');
    }

    // Redirect back to form
    res.redirect('/clubs/players/add');
  }
}

/**
 * Display form to edit an existing player
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function showEditPlayerForm(req, res, next) {
  try {
    const playerId = req.params.id;

    // Ensure user is authenticated and has a club
    if (!req.user || !req.user.clubId) {
      req.flash('error', 'You must be a club delegate to edit players.');
      return res.redirect('/dashboard');
    }

    // Find the player (must belong to user's club)
    const player = await ClubPlayer.findOne({
      where: {
        id: playerId,
        clubId: req.user.clubId
      },
      include: [{
        model: Club,
        as: 'club',
        attributes: ['id', 'clubName']
      }]
    });

    if (!player) {
      req.flash('error', 'Player not found or you do not have permission to edit this player.');
      return res.redirect('/clubs/players');
    }

    res.render('clubs/players/edit', {
      title: `Edit Player - ${player.getFullName()}`,
      player,
      club: player.club,
      formData: player.toJSON()
    });
  } catch (error) {
    console.error('Error showing edit player form:', error);
    next(error);
  }
}

/**
 * Update an existing club player
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function updatePlayer(req, res, next) {
  try {
    const playerId = req.params.id;

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Find player for re-rendering form
      const player = await ClubPlayer.findOne({
        where: {
          id: playerId,
          clubId: req.user.clubId
        },
        include: [{
          model: Club,
          as: 'club',
          attributes: ['id', 'clubName']
        }]
      });

      if (!player) {
        req.flash('error', 'Player not found.');
        return res.redirect('/clubs/players');
      }

      return res.render('clubs/players/edit', {
        title: `Edit Player - ${player.getFullName()}`,
        player,
        club: player.club,
        formData: req.body,
        errors: errors.array()
      });
    }

    // Ensure user is authenticated and has a club
    if (!req.user || !req.user.clubId) {
      req.flash('error', 'You must be a club delegate to edit players.');
      return res.redirect('/dashboard');
    }

    // Find the player (must belong to user's club)
    const player = await ClubPlayer.findOne({
      where: {
        id: playerId,
        clubId: req.user.clubId
      }
    });

    if (!player) {
      req.flash('error', 'Player not found or you do not have permission to edit this player.');
      return res.redirect('/clubs/players');
    }

    // Extract validated data
    const { firstName, lastName, dateOfBirth, email, notes, shorts } = req.body;

    // Update the player
    await player.update({
      firstName,
      lastName,
      dateOfBirth,
      email,
      notes: notes || null,
      shorts: shorts || 'Unrestricted'
    });

    req.flash('success', `Player ${player.getFullName()} has been successfully updated.`);
    res.redirect('/clubs/players');
  } catch (error) {
    console.error('Error updating player:', error);
    
    // Handle specific database errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      req.flash('error', 'A player with this email address already exists.');
    } else if (error.name === 'SequelizeValidationError') {
      req.flash('error', error.errors.map(err => err.message).join(', '));
    } else {
      req.flash('error', 'Failed to update player. Please try again.');
    }

    // Redirect back to edit form
    res.redirect(`/clubs/players/${req.params.id}/edit`);
  }
}

/**
 * Deactivate a club player (soft delete)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function deactivatePlayer(req, res, next) {
  try {
    const playerId = req.params.id;

    // Ensure user is authenticated and has a club
    if (!req.user || !req.user.clubId) {
      req.flash('error', 'You must be a club delegate to remove players.');
      return res.redirect('/dashboard');
    }

    // Find the player (must belong to user's club)
    const player = await ClubPlayer.findOne({
      where: {
        id: playerId,
        clubId: req.user.clubId,
        isActive: true
      }
    });

    if (!player) {
      req.flash('error', 'Player not found or you do not have permission to remove this player.');
      return res.redirect('/clubs/players');
    }

    // Deactivate the player (soft delete)
    await player.update({
      isActive: false
    });

    req.flash('success', `Player ${player.getFullName()} has been removed from your club.`);
    res.redirect('/clubs/players');
  } catch (error) {
    console.error('Error deactivating player:', error);
    req.flash('error', 'Failed to remove player. Please try again.');
    res.redirect('/clubs/players');
  }
}

/**
 * Reactivate an inactive club player
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function reactivatePlayer(req, res, next) {
  try {
    const playerId = req.params.id;

    // Ensure user is authenticated and has a club
    if (!req.user || !req.user.clubId) {
      req.flash('error', 'You must be a club delegate to reactivate players.');
      return res.redirect('/dashboard');
    }

    // Find the inactive player (must belong to user's club)
    const player = await ClubPlayer.findOne({
      where: {
        id: playerId,
        clubId: req.user.clubId,
        isActive: false
      }
    });

    if (!player) {
      req.flash('error', 'Inactive player not found or you do not have permission to reactivate this player.');
      return res.redirect('/clubs/players');
    }

    // Reactivate the player
    await player.update({
      isActive: true
    });

    req.flash('success', `Player ${player.getFullName()} has been successfully reactivated.`);
    res.redirect('/clubs/players');
  } catch (error) {
    console.error('Error reactivating player:', error);
    req.flash('error', 'Failed to reactivate player. Please try again.');
    res.redirect('/clubs/players');
  }
}

/**
 * Validation rules for creating/updating players
 */
const validatePlayer = [
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be between 1 and 50 characters')
    .isAlpha()
    .withMessage('First name must contain only letters'),

  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be between 1 and 50 characters')
    .isAlpha()
    .withMessage('Last name must contain only letters'),

  body('dateOfBirth')
    .isDate()
    .withMessage('Date of birth must be a valid date')
    .custom((value) => {
      const birthDate = new Date(value);
      const today = new Date();
      
      if (birthDate > today) {
        throw new Error('Date of birth cannot be in the future');
      }
      
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 16 || age > 100) {
        throw new Error('Player must be between 16 and 100 years old');
      }
      
      return true;
    }),

  body('email')
    .trim()
    .isEmail()
    .withMessage('Email must be a valid email address')
    .isLength({ min: 5, max: 254 })
    .withMessage('Email must be between 5 and 254 characters')
    .normalizeEmail(),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),

  body('shorts')
    .optional()
    .isIn(['Unrestricted', 'Red', 'Yellow', 'Blue', 'Green'])
    .withMessage('Shorts must be one of: Unrestricted, Red, Yellow, Blue, Green')
];

/**
 * Validation rules for player ID parameter
 */
const validatePlayerId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Player ID must be a valid positive integer')
];

module.exports = {
  showClubPlayers,
  showAddPlayerForm,
  createPlayer,
  showEditPlayerForm,
  updatePlayer,
  deactivatePlayer,
  reactivatePlayer,
  validatePlayer,
  validatePlayerId
};