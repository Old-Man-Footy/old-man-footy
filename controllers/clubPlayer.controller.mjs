/**
 * ClubPlayer Controller - Express/Node.js Implementation
 * 
 * Handles HTTP requests for club player management functionality.
 * Follows strict MVC pattern with proper input validation and error handling.
 */

import { body, validationResult, param } from 'express-validator';
import { ClubPlayer, Club } from '../models/index.mjs';
import { Op } from 'sequelize';
import { validateBirthDate } from '../utils/dateUtils.mjs';

/**
 * Display club players list for the authenticated user's club
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function showClubPlayers(req, res, next) {
  try {
    console.log('=== DEBUG: showClubPlayers called ===');
    console.log('User:', req.user ? { id: req.user.id, email: req.user.email, clubId: req.user.clubId } : 'No user');
    
    // Ensure user is authenticated
    if (!req.user) {
      console.log('=== DEBUG: User not authenticated ===');
      req.flash('error', 'You must be logged in to view players.');
      return res.redirect('/auth/login');
    }

    // Check if user has appropriate permissions (admin or delegate)
    if (!req.user.isAdmin && !req.user.clubId) {
      console.log('=== DEBUG: User is neither admin nor has clubId ===');
      req.flash('error', 'You must be an admin or club delegate to view players.');
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
      isActive: true
    };

    // Admins can see all players, delegates only see their club's players
    if (!req.user.isAdmin) {
      whereConditions.clubId = req.user.clubId;
    }

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
        as: 'playerClub',
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
        as: 'playerClub',
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

    return res.render('clubs/players/index', {
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
export async function showAddPlayerForm(req, res, next) {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      req.flash('error', 'You must be logged in to add players.');
      return res.redirect('/auth/login');
    }

    // Check if user has appropriate permissions (admin or delegate)
    if (!req.user.isAdmin && !req.user.clubId) {
      req.flash('error', 'You must be an admin or club delegate to add players.');
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

    return res.render('clubs/players/add', {
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
export async function createPlayer(req, res, next) {
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

    // Ensure user is authenticated
    if (!req.user) {
      req.flash('error', 'You must be logged in to add players.');
      return res.redirect('/auth/login');
    }

    // Check if user has appropriate permissions (admin or delegate)
    if (!req.user.isAdmin && !req.user.clubId) {
      req.flash('error', 'You must be an admin or club delegate to add players.');
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
    return res.redirect('/clubs/players');
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
    return res.redirect('/clubs/players/add');
  }
}

/**
 * Display form to edit an existing player
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function showEditPlayerForm(req, res, next) {
  try {
    const playerId = req.params.id;

    // Ensure user is authenticated
    if (!req.user) {
      req.flash('error', 'You must be logged in to edit players.');
      return res.redirect('/auth/login');
    }

    // Find the player first
    const player = await ClubPlayer.findOne({
      where: { id: playerId },
      include: [{
        model: Club,
        as: 'playerClub',
        attributes: ['id', 'clubName']
      }]
    });

    if (!player) {
      req.flash('error', 'Player not found.');
      return res.redirect('/clubs/players');
    }

    // Check if user can edit this player
    if (!player.canUserEdit(req.user)) {
      req.flash('error', 'You do not have permission to edit this player.');
      return res.redirect('/clubs/players');
    }

    // Ensure club data is available - fallback to fetching it separately if needed
    let club = player.playerClub;
    if (!club) {
      club = await Club.findByPk(req.user.clubId, {
        attributes: ['id', 'clubName']
      });
      
      if (!club) {
        req.flash('error', 'Club not found.');
        return res.redirect('/clubs/players');
      }
    }

    return res.render('clubs/players/edit', {
      title: `Edit Player - ${player.getFullName()}`,
      player,
      club,
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
export async function updatePlayer(req, res, next) {
  try {
    const playerId = req.params.id;

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Find player for re-rendering form
      const player = await ClubPlayer.findOne({
        where: { id: playerId },
        include: [{
          model: Club,
          as: 'playerClub',
          attributes: ['id', 'clubName']
        }]
      });

      if (!player) {
        req.flash('error', 'Player not found.');
        return res.redirect('/clubs/players');
      }

      // Check if user can edit this player
      if (!player.canUserEdit(req.user)) {
        req.flash('error', 'You do not have permission to edit this player.');
        return res.redirect('/clubs/players');
      }

      // Ensure club data is available - fallback to fetching it separately if needed
      let club = player.playerClub;
      if (!club) {
        club = await Club.findByPk(req.user.clubId, {
          attributes: ['id', 'clubName']
        });
        
        if (!club) {
          req.flash('error', 'Club not found.');
          return res.redirect('/clubs/players');
        }
      }

      return res.render('clubs/players/edit', {
        title: `Edit Player - ${player.getFullName()}`,
        player,
        club,
        formData: req.body,
        errors: errors.array()
      });
    }

    // Ensure user is authenticated
    if (!req.user) {
      req.flash('error', 'You must be logged in to edit players.');
      return res.redirect('/auth/login');
    }

    // Find the player
    const player = await ClubPlayer.findOne({
      where: { id: playerId }
    });

    if (!player) {
      req.flash('error', 'Player not found.');
      return res.redirect('/clubs/players');
    }

    // Check if user can edit this player
    if (!player.canUserEdit(req.user)) {
      req.flash('error', 'You do not have permission to edit this player.');
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
    return res.redirect('/clubs/players');
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
    return res.redirect(`/clubs/players/${req.params.id}/edit`);
  }
}

/**
 * Deactivate a club player (soft delete)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function deactivatePlayer(req, res, next) {
  try {
    const playerId = req.params.id;

    // Ensure user is authenticated
    if (!req.user) {
      req.flash('error', 'You must be logged in to remove players.');
      return res.redirect('/auth/login');
    }

    // Find the player
    const player = await ClubPlayer.findOne({
      where: {
        id: playerId,
        isActive: true
      }
    });

    if (!player) {
      req.flash('error', 'Player not found or is already inactive.');
      return res.redirect('/clubs/players');
    }

    // Check if user can edit this player
    if (!player.canUserEdit(req.user)) {
      req.flash('error', 'You do not have permission to remove this player.');
      return res.redirect('/clubs/players');
    }

    // Deactivate the player (soft delete)
    await player.update({
      isActive: false
    });

    req.flash('success', `Player ${player.getFullName()} has been removed from your club.`);
    return res.redirect('/clubs/players');
  } catch (error) {
    console.error('Error deactivating player:', error);
    req.flash('error', 'Failed to remove player. Please try again.');
    return res.redirect('/clubs/players');
  }
}

/**
 * Reactivate an inactive club player
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function reactivatePlayer(req, res, next) {
  try {
    const playerId = req.params.id;

    // Ensure user is authenticated
    if (!req.user) {
      req.flash('error', 'You must be logged in to reactivate players.');
      return res.redirect('/auth/login');
    }

    // Find the inactive player
    const player = await ClubPlayer.findOne({
      where: {
        id: playerId,
        isActive: false
      }
    });

    if (!player) {
      req.flash('error', 'Inactive player not found.');
      return res.redirect('/clubs/players');
    }

    // Check if user has permission to edit this player
    if (!player.canUserEdit(req.user)) {
      req.flash('error', 'You do not have permission to reactivate this player.');
      return res.redirect('/clubs/players');
    }

    // Reactivate the player
    await player.update({
      isActive: true
    });

    req.flash('success', `Player ${player.getFullName()} has been successfully reactivated.`);
    return res.redirect('/clubs/players');
  } catch (error) {
    console.error('Error reactivating player:', error);
    req.flash('error', 'Failed to reactivate player. Please try again.');
    return res.redirect('/clubs/players');
  }
}

/**
 * Download CSV template for player import
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function downloadCsvTemplate(req, res, next) {
  // Ensure user is authenticated
  if (!req.user) {
    req.flash('error', 'You must be logged in to download the template.');
    return res.redirect('/auth/login');
  }

  // Admins and delegates can both download templates
  if (!req.user.isAdmin && !req.user.clubId) {
    req.flash('error', 'You must be an admin or club delegate to download the template.');
    return res.redirect('/dashboard');
  }

  // For admins, use a generic club name; for delegates, use their club
  let club = null;
  let clubName = 'Players';

  if (req.user.clubId) {
    club = await Club.findByPk(req.user.clubId, {
      attributes: ['id', 'clubName']
    });

    if (club) {
      clubName = club.clubName;
    }
  }

  // Create CSV template with headers and sample data
  const csvHeaders = [
    'firstName',
    'lastName', 
    'email',
    'dateOfBirth',
    'notes',
    'shorts'
  ];

  const sampleData = [
    [
      'John',
      'Smith',
      'john.smith@example.com',
      '1985-06-15',
      'Former professional player',
      'Blue'
    ],
    [
      'Sarah',
      'Johnson', 
      'sarah.johnson@example.com',
      '1987-03-22',
      'Available weekends only',
      'Red'
    ],
    [
      'Mike',
      'Williams',
      'mike.williams@example.com',
      '1982-11-08',
      '',
      'Unrestricted'
    ]
  ];

  // Build CSV content
  const csvContent = [
    csvHeaders.join(','),
    ...sampleData.map(row => row.map(field => `"${field}"`).join(','))
  ].join('\n');

  // Set response headers for file download
  const filename = `${clubName.replace(/[^a-zA-Z0-9]/g, '_')}_players_template.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  // Send the CSV content
  res.send(csvContent);
}

/**
 * Process CSV player import
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function importPlayersFromCsv(req, res, next) {
  // Ensure user is authenticated
  if (!req.user) {
    req.flash('error', 'You must be logged in to import players.');
    return res.redirect('/auth/login');
  }

  // Check if file was uploaded
  if (!req.file) {
    req.flash('error', 'Please select a CSV file to upload.');
    return res.redirect('/clubs/players');
  }

  // For import operations, we need a target club
  let targetClubId = req.user.clubId;
  
  // If admin, they might specify a target club (this would need form field support)
  if (req.user.isAdmin && req.body.targetClubId) {
    targetClubId = req.body.targetClubId;
  }

  if (!targetClubId) {
    req.flash('error', 'A target club must be specified for player import.');
    return res.redirect('/clubs/players');
  }

  // Get club information
  const club = await Club.findByPk(targetClubId, {
    attributes: ['id', 'clubName']
  });

  if (!club) {
    req.flash('error', 'Target club not found.');
    return res.redirect('/clubs/players');
  }

  // Check authorization for the target club
  if (!req.user.isAdmin && req.user.clubId !== targetClubId) {
    req.flash('error', 'You do not have permission to import players for this club.');
    return res.redirect('/clubs/players');
  }

  const { shortsColor = 'Unrestricted', updateExisting = false, notes = '' } = req.body;

  // Parse CSV file
  const csvContent = req.file.buffer.toString('utf8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    req.flash('error', 'CSV file must contain at least a header row and one data row.');
    return res.redirect('/clubs/players');
  }

  // Parse headers
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
  
  // Validate required headers
  const requiredHeaders = ['firstname', 'lastname', 'email', 'dateofbirth'];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  
  if (missingHeaders.length > 0) {
    req.flash('error', `Missing required columns: ${missingHeaders.join(', ')}. Please use the template.`);
    return res.redirect('/clubs/players');
  }

  // Process data rows
  const results = {
    imported: 0,
    updated: 0,
    duplicates: 0,
    errors: []
  };

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
      
      if (values.length !== headers.length) {
        results.errors.push(`Row ${i + 1}: Incorrect number of columns`);
        continue;
      }

      // Map values to object
      const playerData = {};
      headers.forEach((header, index) => {
        playerData[header] = values[index];
      });

      // Validate required fields
      if (!playerData.firstname || !playerData.lastname || !playerData.email || !playerData.dateofbirth) {
        results.errors.push(`Row ${i + 1}: Missing required data`);
        continue;
      }

      // Validate and parse date of birth using flexible date parsing
      const dobValidation = validateBirthDate(playerData.dateofbirth);
      if (!dobValidation.success) {
        results.errors.push(`Row ${i + 1}: ${dobValidation.error}`);
        continue;
      }

      // Use the formatted date for database storage
      const formattedDob = dobValidation.formattedDate;

      // Check if player already exists - based on name and DOB within target club
      const existingPlayer = await ClubPlayer.findOne({
        where: {
          firstName: playerData.firstname,
          lastName: playerData.lastname,
          dateOfBirth: formattedDob,
          clubId: targetClubId, // Check within target club
          isActive: true
        }
      });

      if (existingPlayer) {
        // Player exists in current user's club
        if (updateExisting) {
          // Update existing player (already belongs to user's club)
          await existingPlayer.update({
            firstName: playerData.firstname,
            lastName: playerData.lastname,
            dateOfBirth: formattedDob,
            notes: playerData.notes || notes || null,
            shorts: playerData.shorts || shortsColor
          });
          results.updated++;
        } else {
          results.duplicates++;
        }
        continue;
      }

      // Create new player for the target club
      await ClubPlayer.create({
        clubId: targetClubId, // Use the authorized target club ID
        firstName: playerData.firstname,
        lastName: playerData.lastname,
        email: playerData.email.toLowerCase(),
        dateOfBirth: formattedDob,
        notes: playerData.notes || notes || null,
        shorts: playerData.shorts || shortsColor
      });

      results.imported++;
    } catch (error) {
      console.error(`Error processing row ${i + 1}:`, error);
      results.errors.push(`Row ${i + 1}: ${error.message}`);
    }
  }

  // Generate success message
  let message = `Import complete: ${results.imported} players imported`;
  if (results.updated > 0) message += `, ${results.updated} updated`;
  if (results.duplicates > 0) message += `, ${results.duplicates} duplicates skipped`;
  if (results.errors.length > 0) message += `, ${results.errors.length} errors`;

  if (results.imported > 0 || results.updated > 0) {
    req.flash('success', message);
  } else {
    req.flash('warning', message);
  }

  // Log errors if any
  if (results.errors.length > 0) {
    console.log('CSV Import errors:', results.errors);
    req.flash('error', `Errors encountered: ${results.errors.slice(0, 5).join('; ')}${results.errors.length > 5 ? '...' : ''}`);
  }

  return res.redirect('/clubs/players');  
}

/**
 * Validation rules for creating/updating players
 */
export const validatePlayer = [
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
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),

  body('shorts')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['Unrestricted', 'Red', 'Yellow', 'Blue', 'Green'])
    .withMessage('Shorts must be one of: Unrestricted, Red, Yellow, Blue, Green')
];

/**
 * Validation rules for player ID parameter
 */
export const validatePlayerId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Player ID must be a valid positive integer')
];

/**
 * Validation rules for CSV import
 */
export const validateCsvImport = [
  body('shortsColor')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['Unrestricted', 'Red', 'Yellow', 'Blue', 'Green'])
    .withMessage('Invalid shorts color selection'),
  body('updateExisting')
    .optional({ nullable: true, checkFalsy: true })
    .isBoolean()
    .withMessage('Update existing must be boolean'),
  body('notes')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];