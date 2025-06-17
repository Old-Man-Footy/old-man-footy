/**
 * Club Players Routes - Express Router Implementation
 * 
 * Handles routing for club player management functionality.
 * Implements proper authentication and authorization middleware.
 */

const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const clubPlayerController = require('../controllers/clubPlayer.controller');

/**
 * Apply authentication middleware to all routes
 */
router.use(ensureAuthenticated);

/**
 * GET /clubs/players
 * Display club players list for the authenticated user's club
 */
router.get('/', clubPlayerController.showClubPlayers);

/**
 * GET /clubs/players/add
 * Display form to add a new player
 */
router.get('/add', clubPlayerController.showAddPlayerForm);

/**
 * POST /clubs/players
 * Create a new club player
 */
router.post('/', 
  clubPlayerController.validatePlayer,
  clubPlayerController.createPlayer
);

/**
 * GET /clubs/players/:id/edit
 * Display form to edit an existing player
 */
router.get('/:id/edit', 
  clubPlayerController.validatePlayerId,
  clubPlayerController.showEditPlayerForm
);

/**
 * PUT /clubs/players/:id
 * Update an existing club player
 */
router.put('/:id', 
  clubPlayerController.validatePlayerId,
  clubPlayerController.validatePlayer,
  clubPlayerController.updatePlayer
);

/**
 * DELETE /clubs/players/:id
 * Deactivate a club player (soft delete)
 */
router.delete('/:id', 
  clubPlayerController.validatePlayerId,
  clubPlayerController.deactivatePlayer
);

/**
 * POST /clubs/players/:id/reactivate
 * Reactivate an inactive club player
 */
router.post('/:id/reactivate', 
  clubPlayerController.validatePlayerId,
  clubPlayerController.reactivatePlayer
);

module.exports = router;