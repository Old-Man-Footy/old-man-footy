import express from 'express';
import multer from 'multer';
import { body } from 'express-validator';
import { ensureAuthenticated } from '../middleware/auth.mjs';
import { createFormUploader } from '../middleware/formUpload.mjs';
import { applySecurity, validateSecureEmail } from '../middleware/security.mjs';
import { asyncHandler } from '../middleware/asyncHandler.mjs';

import * as clubController from '../controllers/club.controller.mjs';
import * as clubPlayerController from '../controllers/clubPlayer.controller.mjs';
import { AUSTRALIAN_STATES, SPONSORSHIP_LEVELS_ARRAY } from '../config/constants.mjs';

const router = express.Router();

// Configure upload field configurations
const clubFieldConfig = [
    { name: 'logo', maxCount: 1 },
    { name: 'gallery', maxCount: 5 }
];
const sponsorFieldConfig = [
    { name: 'logo', maxCount: 1 }
];

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

// Create uploader instances
const clubUpload = createFormUploader('clubs', clubFieldConfig);
const sponsorUpload = createFormUploader('sponsors', sponsorFieldConfig);

// Apply centralized security to all routes
router.use(applySecurity);

// Create new club (for users without clubs)
router.post('/create', ensureAuthenticated, [
    body('clubName').isLength({ min: 2, max: 100 }).withMessage('Club name must be between 2 and 100 characters'),
    body('state').isIn(AUSTRALIAN_STATES).withMessage('Valid state required'),
    body('location').isLength({ min: 2, max: 100 }).withMessage('Location must be between 2 and 100 characters'),
    body('contactEmail').custom((email) => {
        if (email && email.trim()) {
            const result = validateSecureEmail(email);
            if (!result.isValid) {
                throw new Error(result.errors[0]);
            }
        }
        return true;
    }),
    body('description').optional({ nullable: true, checkFalsy: true }).isLength({ max: 1000 }).withMessage('Description must be 1000 characters or less')
], clubController.createClub);

// API endpoint for club autocomplete search
router.get('/api/search', clubController.searchClubs);

// Join existing club route
router.post('/join/:id', ensureAuthenticated, clubController.joinClub);

// Leave club route
router.post('/leave', ensureAuthenticated, clubController.leaveClub);


// API endpoints for image management
// Get all images for a club
router.get('/:clubId/images', ensureAuthenticated, clubController.getClubImages);

// Delete a specific club image
router.delete('/:clubId/images/:filename', ensureAuthenticated, clubController.deleteClubImage);



// Proxy club creation routes (for delegates and admins)
router.get('/create-on-behalf', ensureAuthenticated, clubController.getCreateOnBehalf);
router.post('/create-on-behalf', ensureAuthenticated, [
    body('clubName').isLength({ min: 2, max: 100 }).withMessage('Club name must be between 2 and 100 characters'),
    body('inviteEmail').isEmail().withMessage('Valid email address required for invitation'),
    body('state').isIn(AUSTRALIAN_STATES).withMessage('Valid state required'),
    body('contactEmail').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Valid contact email required'),
    body('description').optional({ nullable: true, checkFalsy: true }).isLength({ max: 1000 }).withMessage('Description must be 1000 characters or less'),
    body('customMessage').optional({ nullable: true, checkFalsy: true }).isLength({ max: 2000 }).withMessage('Custom message must be 2000 characters or less')
], clubController.postCreateOnBehalf);

// Club ownership claiming routes - MUST come before /:id route
router.get('/:id/claim', ensureAuthenticated, clubController.getClaimOwnership);
router.post('/:id/claim', ensureAuthenticated, clubController.postClaimOwnership);

// Club alternate names management - MUST come before /:id route
router.get('/:id/alternate-names', ensureAuthenticated, clubController.showClubAlternateNames);
router.post('/:id/alternate-names', ensureAuthenticated, [
    body('alternateName').isLength({ min: 2, max: 100 }).withMessage('Alternate name must be between 2 and 100 characters')
], clubController.addAlternateName);
router.put('/:id/alternate-names/:alternateId', ensureAuthenticated, [
    body('alternateName').isLength({ min: 2, max: 100 }).withMessage('Alternate name must be between 2 and 100 characters')
], clubController.updateAlternateName);
router.delete('/:id/alternate-names/:alternateId', ensureAuthenticated, clubController.deleteAlternateName);

// Club sponsor management - MUST come before /:id route
router.get('/:id/sponsors', ensureAuthenticated, clubController.showClubSponsors);
router.get('/:id/sponsors/add', ensureAuthenticated, clubController.showAddSponsor);
router.post('/:id/sponsors/add', ensureAuthenticated, sponsorUpload.upload.fields(sponsorFieldConfig), sponsorUpload.process, [
    body('sponsorName').isLength({ min: 2, max: 100 }).withMessage('Sponsor name must be between 2 and 100 characters'),
    body('sponsorshipLevel').isIn(SPONSORSHIP_LEVELS_ARRAY).withMessage('Valid sponsorship level required'),
    body('websiteUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid website URL required'),
    body('description').optional({ nullable: true, checkFalsy: true }).isLength({ max: 1000 }).withMessage('Description must be 1000 characters or less')
], clubController.addSponsorToClub);
router.get('/:id/sponsors/:sponsorId/edit', ensureAuthenticated, clubController.showEditClubSponsor);
router.post('/:id/sponsors/:sponsorId/edit', ensureAuthenticated, sponsorUpload.upload.fields(sponsorFieldConfig), sponsorUpload.process, [
    body('sponsorName').isLength({ min: 2, max: 100 }).withMessage('Sponsor name must be between 2 and 100 characters'),
    body('sponsorshipLevel').isIn(SPONSORSHIP_LEVELS_ARRAY).withMessage('Valid sponsorship level required'),
    body('websiteUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid website URL required'),
    body('description').optional({ nullable: true, checkFalsy: true }).isLength({ max: 1000 }).withMessage('Description must be 1000 characters or less')
], clubController.updateClubSponsor);
router.post('/:id/sponsors/:sponsorId/remove', ensureAuthenticated, clubController.removeSponsorFromClub);
router.post('/:id/sponsors/reorder', ensureAuthenticated, clubController.reorderClubSponsors);

// Club edit form (for consistency with carnival routes) - MUST come before /:id route
router.get('/:id/edit', ensureAuthenticated, clubController.getEdit);
router.post('/:id/edit', ensureAuthenticated, clubUpload.upload.fields(clubFieldConfig), clubUpload.process, [
    body('location').optional({ nullable: true, checkFalsy: true }).isLength({ min: 2, max: 100 }).withMessage('Location must be between 2 and 100 characters'),
    body('state').optional({ nullable: true }).isIn(AUSTRALIAN_STATES).withMessage('Valid state required'),
    body('contactEmail').optional({ nullable: true, checkFalsy: true }).custom((email) => {
        if (email && email.trim()) {
            const result = validateSecureEmail(email);
            if (!result.isValid) {
                throw new Error(result.errors[0]);
            }
        }
        return true;
    }),
    body('contactPhone').optional({ nullable: true, checkFalsy: true }).isLength({ max: 20 }).withMessage('Contact phone must be 20 characters or less'),
    body('contactPerson').optional({ nullable: true, checkFalsy: true }).isLength({ max: 100 }).withMessage('Contact person must be 100characters or less'),
    body('website').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid website URL required'),
    body('facebookUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid Facebook URL required'),
    body('instagramUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid Instagram URL required'),
    body('twitterUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid Twitter URL required'),
    body('description').optional({ nullable: true, checkFalsy: true }).isLength({ max: 1000 }).withMessage('Description must be 1000 characters or less')
], clubController.updateClubProfile);

// Public club listings - MUST come before /:id route
router.get('/', clubController.showClubListings);

// Create new club form - MUST come before /:id route
router.get('/new', ensureAuthenticated, clubController.showCreateForm);

// Club gallery (public) - MUST come before /:id route
router.get('/:id/gallery', clubController.viewClubGallery);

// Club player management routes - MUST come before /:id route
router.get('/:id/players', clubPlayerController.showClubPlayers);
router.get('/:id/players/csv-template', clubPlayerController.downloadCsvTemplate);
router.post('/:id/players/csv-import', 
  upload.single('csvFile'),
  clubPlayerController.validateCsvImport,
  clubPlayerController.importPlayersFromCsv
);
router.get('/:id/players/add', clubPlayerController.showAddPlayerForm);
router.post('/:id/players', 
  clubPlayerController.validatePlayer,
  clubPlayerController.createPlayer
);
router.get('/:id/players/:playerId/edit', 
  clubPlayerController.validatePlayerId,
  clubPlayerController.showEditPlayerForm
);
router.put('/:id/players/:playerId', 
  clubPlayerController.validatePlayerId,
  clubPlayerController.validatePlayer,
  clubPlayerController.updatePlayer
);
router.delete('/:id/players/:playerId', 
  clubPlayerController.validatePlayerId,
  clubPlayerController.deactivatePlayer
);
router.post('/:id/players/:playerId/reactivate', 
  clubPlayerController.validatePlayerId,
  clubPlayerController.reactivatePlayer
);

// Individual club profile (public) - MUST come LAST as it catches all /:id patterns
router.get('/:id', clubController.showClubProfile);

export default router;