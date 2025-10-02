import express from 'express';
import { body } from 'express-validator';
import { ensureAuthenticated } from '../middleware/auth.mjs';
import { createFormUploader } from '../middleware/formUpload.mjs';
import { applySecurity, validateSecureEmail } from '../middleware/security.mjs';
import { asyncHandler } from '../middleware/asyncHandler.mjs';
import * as clubController from '../controllers/club.controller.mjs';
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

// Create uploader instances
const clubUpload = createFormUploader('club', clubFieldConfig);
const sponsorUpload = createFormUploader('sponsor', sponsorFieldConfig);

// Apply centralized security to all routes
router.use(applySecurity);

// Club management (authenticated delegates only) - MUST come before /:id route
router.get('/manage', ensureAuthenticated, clubController.showClubManagement);

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

// Update club profile with structured upload support
router.post('/manage/profile', ensureAuthenticated, asyncHandler(async (req, res, next) => {
    await clubUpload.upload.fields(clubFieldConfig)(req, res, next);
}), clubUpload.process, [
    body('clubName').optional({ nullable: true, checkFalsy: true }).isLength({ min: 2, max: 100 }).withMessage('Club name must be between 2 and 100 characters'),
    body('state').optional({ nullable: true, checkFalsy: true }).isIn(AUSTRALIAN_STATES).withMessage('Valid state required'),
    body('contactEmail').optional({ nullable: true, checkFalsy: true }).custom((email) => {
        if (email && email.trim()) {
            const result = validateSecureEmail(email);
            if (!result.isValid) {
                throw new Error(result.errors[0]);
            }
        }
        return true;
    }),
    body('website').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid website URL required'),
    body('facebookUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid Facebook URL required'),
    body('instagramUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid Instagram URL required'),
    body('twitterUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid X (Twitter) URL required'),
    body('description').optional({ nullable: true, checkFalsy: true }).isLength({ max: 1000 }).withMessage('Description must be 1000 characters or less'),
    body('contactPerson').optional({ nullable: true, checkFalsy: true }).isLength({ max: 100 }).withMessage('Contact person name must be 100 characters or less'),
    body('location').optional({ nullable: true, checkFalsy: true }).isLength({ max: 100 }).withMessage('Location must be 100 characters or less'),
    body('contactPhone').optional({ nullable: true, checkFalsy: true }).isLength({ max: 20 }).withMessage('Phone number must be 20 characters or less')
], clubController.updateClubProfile);

// API endpoints for image management
// Get all images for a club
router.get('/:clubId/images', ensureAuthenticated, clubController.getClubImages);

// Delete a specific club image
router.delete('/:clubId/images/:filename', ensureAuthenticated, clubController.deleteClubImage);

// Sponsor management routes for club delegates
// View club's sponsors
router.get('/manage/sponsors', ensureAuthenticated, clubController.showClubSponsors);

// Add new sponsor or link existing sponsor to club
router.get('/manage/sponsors/add', ensureAuthenticated, clubController.showAddSponsor);
router.post('/manage/sponsors/add', ensureAuthenticated, [
    body('sponsorName').trim().isLength({ min: 2, max: 200 }).withMessage('Sponsor name must be between 2 and 200 characters'),
    body('businessType').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('Business type must be 100 characters or less'),
    body('location').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('Location must be 100 characters or less'),
    body('state').optional({ nullable: true, checkFalsy: true }).isIn(AUSTRALIAN_STATES).withMessage('Invalid state selection'),
    body('description').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 2000 }).withMessage('Description must be 2000 characters or less'),
    body('contactPerson').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('Contact person must be 100 characters or less'),
    body('contactEmail').optional({ nullable: true, checkFalsy: true }).custom((email) => {
        if (email && email.trim()) {
            const result = validateSecureEmail(email);
            if (!result.isValid) {
                throw new Error(result.errors[0]);
            }
        }
        return true;
    }),
    body('contactPhone').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 20 }).withMessage('Phone number must be 20 characters or less'),
    body('website').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid website URL required'),
    body('facebookUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid Facebook URL required'),
    body('instagramUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid Instagram URL required'),
    body('twitterUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid Twitter URL required')
], clubController.addSponsorToClub);

// Edit sponsor for club
router.get('/manage/sponsors/:sponsorId/edit', ensureAuthenticated, clubController.showEditClubSponsor);
router.post('/manage/sponsors/:sponsorId/edit', ensureAuthenticated, asyncHandler(async (req, res, next) => {
    await sponsorUpload.upload.fields(sponsorFieldConfig)(req, res, next);
}), sponsorUpload.process, [
    body('sponsorName').trim().isLength({ min: 2, max: 200 }).withMessage('Sponsor name must be between 2 and 200 characters'),
    body('businessType').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('Business type must be 100 characters or less'),
    body('location').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('Location must be 100 characters or less'),
    body('state').optional({ nullable: true, checkFalsy: true }).isIn(AUSTRALIAN_STATES).withMessage('Invalid state selection'),
    body('description').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 2000 }).withMessage('Description must be 2000 characters or less'),
    body('contactPerson').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('Contact person must be 100 characters or less'),
    body('contactEmail').optional({ nullable: true, checkFalsy: true }).custom((email) => {
        if (email && email.trim()) {
            const result = validateSecureEmail(email);
            if (!result.isValid) {
                throw new Error(result.errors[0]);
            }
        }
        return true;
    }),
    body('contactPhone').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 20 }).withMessage('Phone number must be 20 characters or less'),
    body('website').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid website URL required'),
    body('facebookUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid Facebook URL required'),
    body('instagramUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid Instagram URL required'),
    body('twitterUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid Twitter URL required')
], clubController.updateClubSponsor);

// Remove sponsor from club
router.post('/manage/sponsors/:sponsorId/remove', ensureAuthenticated, clubController.removeSponsorFromClub);

// Update sponsor priority/order for club
router.post('/manage/sponsors/reorder', ensureAuthenticated, clubController.reorderClubSponsors);

// Alternate names management routes for club delegates
router.get('/manage/alternate-names', ensureAuthenticated, clubController.showClubAlternateNames);
router.post('/manage/alternate-names', ensureAuthenticated, [
    body('alternateName').isLength({ min: 2, max: 100 }).withMessage('Alternate name must be between 2 and 100 characters')
], clubController.addAlternateName);
router.put('/manage/alternate-names/:id', ensureAuthenticated, [
    body('alternateName').isLength({ min: 2, max: 100 }).withMessage('Alternate name must be between 2 and 100 characters')
], clubController.updateAlternateName);
router.delete('/manage/alternate-names/:id', ensureAuthenticated, clubController.deleteAlternateName);

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

// Club edit form (for consistency with carnival routes) - MUST come before /:id route
router.get('/:id/edit', ensureAuthenticated, clubController.getEdit);

// Public club listings - MUST come before /:id route
router.get('/', clubController.showClubListings);

// Club gallery (public) - MUST come before /:id route
router.get('/:id/gallery', clubController.viewClubGallery);

// Individual club profile (public) - MUST come LAST as it catches all /:id patterns
router.get('/:id', clubController.showClubProfile);

export default router;