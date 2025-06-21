/**
 * Club Players Routes - Express Router Implementation
 * 
 * Handles routing for club player management functionality.
 * Implements proper authentication and authorization middleware.
 */

import express from 'express';
import multer from 'multer';
import { body } from 'express-validator';
import { ensureAuthenticated } from '../middleware/auth.mjs';
import { playerEmail } from '../middleware/validation.mjs';
import * as clubPlayerController from '../controllers/clubPlayer.controller.mjs';

const router = express.Router();

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

// Validation rules for player creation and updates
const validatePlayer = [
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, apostrophes, and periods'),

  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, apostrophes, and periods'),

  body('dateOfBirth')
    .isISO8601()
    .withMessage('Date of birth must be a valid date')
    .custom((value) => {
      const birthDate = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 35) {
        throw new Error('Player must be at least 35 years old for Masters Rugby League');
      }
      
      if (age > 80) {
        throw new Error('Please verify the date of birth - player would be over 80 years old');
      }
      
      return true;
    }),

  playerEmail('email'),

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

export default router;