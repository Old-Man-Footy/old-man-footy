import express from 'express';
import multer from 'multer';
import { body } from 'express-validator';
import { ensureAuthenticated } from '../middleware/auth.mjs';
import { createFormUploader } from '../middleware/formUpload.mjs';
import { applySecurity, validateSecureEmail } from '../middleware/security.mjs';
import { asyncHandler } from '../middleware/asyncHandler.mjs';
import { storeClubReturnUrl } from '../middleware/returnUrl.mjs';
import * as clubController from '../controllers/club.controller.mjs';
import * as clubPlayerController from '../controllers/clubPlayer.controller.mjs';
import { AUSTRALIAN_STATES } from '../config/constants.mjs';

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
const clubUpload = createFormUploader('club', clubFieldConfig);
const sponsorUpload = createFormUploader('sponsor', sponsorFieldConfig);

// Apply centralized security to all routes
router.use(applySecurity);

// DEPRECATED: Redirect /clubs/manage to appropriate destination
router.get('/manage', ensureAuthenticated, (req, res) => {
    if (req.user.isAdmin) {
        // Admin users see all clubs
        return res.redirect('/admin/clubs');
    } else {
        // Delegate users edit their own club
        return res.redirect(`/clubs/${req.user.clubId}/edit`);
    }
});

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

// DEPRECATED: Redirect to dynamic club edit route
router.post('/manage/profile', ensureAuthenticated, (req, res) => {
    const userClubId = req.user.ClubId;
    if (!userClubId) {
        req.flash('error', 'You must be a member of a club to edit its profile.');
        return res.redirect('/clubs');
    }
    return res.redirect(307, `/clubs/${userClubId}/edit`);
});

// API endpoints for image management
// Get all images for a club
router.get('/:clubId/images', ensureAuthenticated, clubController.getClubImages);

// Delete a specific club image
router.delete('/:clubId/images/:filename', ensureAuthenticated, clubController.deleteClubImage);

// DEPRECATED: Redirect to standard club sponsors route
router.get('/manage/sponsors', ensureAuthenticated, (req, res) => {
    const userClubId = req.user.ClubId;
    if (!userClubId) {
        req.flash('error', 'You must be a member of a club to manage sponsors.');
        return res.redirect('/clubs');
    }
    return res.redirect(`/clubs/${userClubId}/sponsors`);
});

// DEPRECATED: Redirect to standard club sponsors/add route
router.get('/manage/sponsors/add', ensureAuthenticated, (req, res) => {
    const userClubId = req.user.ClubId;
    if (!userClubId) {
        req.flash('error', 'You must be a member of a club to add sponsors.');
        return res.redirect('/clubs');
    }
    return res.redirect(`/clubs/${userClubId}/sponsors/add`);
});

router.post('/manage/sponsors/add', ensureAuthenticated, (req, res) => {
    const userClubId = req.user.ClubId;
    if (!userClubId) {
        req.flash('error', 'You must be a member of a club to add sponsors.');
        return res.redirect('/clubs');
    }
    return res.redirect(307, `/clubs/${userClubId}/sponsors/add`);
});

// DEPRECATED: Redirect to standard club sponsor edit route
router.get('/manage/sponsors/:sponsorId/edit', ensureAuthenticated, (req, res) => {
    const userClubId = req.user.ClubId;
    const { sponsorId } = req.params;
    if (!userClubId) {
        req.flash('error', 'You must be a member of a club to edit sponsors.');
        return res.redirect('/clubs');
    }
    return res.redirect(`/clubs/${userClubId}/sponsors/${sponsorId}/edit`);
});

router.post('/manage/sponsors/:sponsorId/edit', ensureAuthenticated, (req, res) => {
    const userClubId = req.user.ClubId;
    const { sponsorId } = req.params;
    if (!userClubId) {
        req.flash('error', 'You must be a member of a club to edit sponsors.');
        return res.redirect('/clubs');
    }
    return res.redirect(307, `/clubs/${userClubId}/sponsors/${sponsorId}/edit`);
});

// DEPRECATED: Redirect to standard club sponsor remove route
router.post('/manage/sponsors/:sponsorId/remove', ensureAuthenticated, (req, res) => {
    const userClubId = req.user.ClubId;
    const { sponsorId } = req.params;
    if (!userClubId) {
        req.flash('error', 'You must be a member of a club to remove sponsors.');
        return res.redirect('/clubs');
    }
    return res.redirect(307, `/clubs/${userClubId}/sponsors/${sponsorId}/remove`);
});

// DEPRECATED: Redirect to standard club sponsors reorder route
router.post('/manage/sponsors/reorder', ensureAuthenticated, (req, res) => {
    const userClubId = req.user.ClubId;
    if (!userClubId) {
        req.flash('error', 'You must be a member of a club to reorder sponsors.');
        return res.redirect('/clubs');
    }
    return res.redirect(307, `/clubs/${userClubId}/sponsors/reorder`);
});

// DEPRECATED: Redirect to standard club alternate names route
router.get('/manage/alternate-names', ensureAuthenticated, (req, res) => {
    const userClubId = req.user.ClubId;
    if (!userClubId) {
        req.flash('error', 'You must be a member of a club to manage alternate names.');
        return res.redirect('/clubs');
    }
    return res.redirect(`/clubs/${userClubId}/alternate-names`);
});
// DEPRECATED: Redirect to standard club alternate names route (POST)
router.post('/manage/alternate-names', ensureAuthenticated, (req, res) => {
    const userClubId = req.user.ClubId;
    if (!userClubId) {
        req.flash('error', 'You must be a member of a club to manage alternate names.');
        return res.redirect('/clubs');
    }
    return res.redirect(307, `/clubs/${userClubId}/alternate-names`);
});
// DEPRECATED: Redirect to standard club alternate names route (PUT)
router.put('/manage/alternate-names/:id', ensureAuthenticated, (req, res) => {
    const userClubId = req.user.ClubId;
    const alternateNameId = req.params.id;
    if (!userClubId) {
        req.flash('error', 'You must be a member of a club to manage alternate names.');
        return res.redirect('/clubs');
    }
    return res.redirect(307, `/clubs/${userClubId}/alternate-names/${alternateNameId}`);
});
// DEPRECATED: Redirect to standard club alternate names route (DELETE)
router.delete('/manage/alternate-names/:id', ensureAuthenticated, (req, res) => {
    const userClubId = req.user.ClubId;
    const alternateNameId = req.params.id;
    if (!userClubId) {
        req.flash('error', 'You must be a member of a club to manage alternate names.');
        return res.redirect('/clubs');
    }
    return res.redirect(307, `/clubs/${userClubId}/alternate-names/${alternateNameId}`);
});

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
router.post('/:id/sponsors/add', ensureAuthenticated, sponsorUpload.upload.fields(sponsorFieldConfig), [
    body('sponsorName').isLength({ min: 2, max: 100 }).withMessage('Sponsor name must be between 2 and 100 characters'),
    body('sponsorshipLevel').isIn(['1', '2', '3', '4', '5']).withMessage('Valid sponsorship level required'),
    body('websiteUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid website URL required'),
    body('description').optional({ nullable: true, checkFalsy: true }).isLength({ max: 1000 }).withMessage('Description must be 1000 characters or less')
], clubController.addSponsorToClub);
router.get('/:id/sponsors/:sponsorId/edit', ensureAuthenticated, clubController.showEditClubSponsor);
router.post('/:id/sponsors/:sponsorId/edit', ensureAuthenticated, sponsorUpload.upload.fields(sponsorFieldConfig), [
    body('sponsorName').isLength({ min: 2, max: 100 }).withMessage('Sponsor name must be between 2 and 100 characters'),
    body('sponsorshipLevel').isIn(['1', '2', '3', '4', '5']).withMessage('Valid sponsorship level required'),
    body('websiteUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid website URL required'),
    body('description').optional({ nullable: true, checkFalsy: true }).isLength({ max: 1000 }).withMessage('Description must be 1000 characters or less')
], clubController.updateClubSponsor);
router.post('/:id/sponsors/:sponsorId/remove', ensureAuthenticated, clubController.removeSponsorFromClub);
router.post('/:id/sponsors/reorder', ensureAuthenticated, clubController.reorderClubSponsors);

// Club edit form (for consistency with carnival routes) - MUST come before /:id route
router.get('/:id/edit', ensureAuthenticated, storeClubReturnUrl, clubController.getEdit);
router.post('/:id/edit', ensureAuthenticated, clubUpload.upload.fields(clubFieldConfig), [
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
    body('contactPerson').optional({ nullable: true, checkFalsy: true }).isLength({ max: 100 }).withMessage('Contact person must be 100 characters or less'),
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