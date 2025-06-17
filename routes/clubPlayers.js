/**
 * Club Players Routes - Express Router Implementation
 * 
 * Handles routing for club player management functionality.
 * Implements proper authentication and authorization middleware.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { ensureAuthenticated } = require('../middleware/auth');
const clubPlayerController = require('../controllers/clubPlayer.controller');

// Configure multer for CSV file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

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
 * GET /clubs/players/csv-template
 * Download CSV template for player import
 */
router.get('/csv-template', clubPlayerController.downloadCsvTemplate);

/**
 * POST /clubs/players/csv-import
 * Process CSV player import
 */
router.post('/csv-import', 
  upload.single('csvFile'),
  clubPlayerController.validateCsvImport,
  clubPlayerController.importPlayersFromCsv
);

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