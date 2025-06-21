import express from 'express';
import { body } from 'express-validator';
import * as sponsorController from '../controllers/sponsor.controller.mjs';
import { ensureAuthenticated, ensureAdmin } from '../middleware/auth.mjs';
import upload from '../middleware/upload.mjs';
import { AUSTRALIAN_STATES } from '../config/constants.mjs';

const router = express.Router();

// Validation middleware for sponsor creation and updates
const validateSponsor = [
    body('sponsorName').trim().isLength({ min: 2, max: 200 }).withMessage('Sponsor name must be between 2 and 200 characters'),
    body('businessType').optional().trim().isLength({ max: 100 }).withMessage('Business type must be 100 characters or less'),
    body('location').optional().trim().isLength({ max: 100 }).withMessage('Location must be 100 characters or less'),
    body('state').optional().isIn(AUSTRALIAN_STATES).withMessage('Invalid state selection'),
    body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description must be 2000 characters or less'),
    body('contactPerson').optional().trim().isLength({ max: 100 }).withMessage('Contact person must be 100 characters or less'),
    body('contactEmail').optional().isEmail().withMessage('Valid email address required'),
    body('contactPhone').optional().trim().isLength({ max: 20 }).withMessage('Phone number must be 20 characters or less'),
    body('website').optional().isURL().withMessage('Valid website URL required'),
    body('facebookUrl').optional().isURL().withMessage('Valid Facebook URL required'),
    body('instagramUrl').optional().isURL().withMessage('Valid Instagram URL required'),
    body('twitterUrl').optional().isURL().withMessage('Valid Twitter URL required'),
    body('linkedinUrl').optional().isURL().withMessage('Valid LinkedIn URL required')
];

// Public sponsor listings - MUST come first
router.get('/', sponsorController.showSponsorListings);

// Admin-only routes for sponsor management - MUST come before /:id route
router.get('/new', ensureAuthenticated, ensureAdmin, sponsorController.showCreateSponsor);

// Create new sponsor - POST route can come before parameterized routes
router.post('/', ensureAuthenticated, ensureAdmin, upload.sponsorUpload, upload.handleUploadError, validateSponsor, sponsorController.createSponsor);

// Individual sponsor profile (public) - MUST come after all specific routes
router.get('/:id', sponsorController.showSponsorProfile);

// Show edit sponsor form - MUST come after /:id route
router.get('/:id/edit', ensureAuthenticated, ensureAdmin, sponsorController.showEditSponsor);

// Update sponsor
router.post('/:id', ensureAuthenticated, ensureAdmin, upload.sponsorUpload, upload.handleUploadError, validateSponsor, sponsorController.updateSponsor);

// Delete sponsor (soft delete)
router.delete('/:id', ensureAuthenticated, ensureAdmin, sponsorController.deleteSponsor);

// Toggle sponsor status
router.put('/:id/status', ensureAuthenticated, ensureAdmin, sponsorController.toggleSponsorStatus);

export default router;