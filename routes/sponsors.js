const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');
const { sponsorUpload, handleUploadError } = require('../middleware/upload');
const sponsorController = require('../controllers/sponsor.controller');

// Public sponsor listings
router.get('/', sponsorController.showSponsorListings);

// Admin-only routes for sponsor management
// Show create sponsor form (must be before /:id route)
router.get('/new', ensureAuthenticated, ensureAdmin, sponsorController.showCreateSponsor);

// Individual sponsor profile (public)
router.get('/:id', sponsorController.showSponsorProfile);

// Create new sponsor
router.post('/', ensureAuthenticated, ensureAdmin, sponsorUpload, handleUploadError, [
    body('sponsorName').notEmpty().trim().isLength({ min: 2, max: 100 }).withMessage('Sponsor name must be between 2 and 100 characters'),
    body('contactEmail').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Valid email address required'),
    body('website').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid website URL required'),
    body('facebookUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid Facebook URL required'),
    body('instagramUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid Instagram URL required'),
    body('twitterUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid Twitter URL required'),
    body('linkedinUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid LinkedIn URL required'),
    body('description').optional().isLength({ max: 1000 }).withMessage('Description must be 1000 characters or less'),
    body('contactPerson').optional().isLength({ max: 100 }).withMessage('Contact person name must be 100 characters or less'),
    body('location').optional().isLength({ max: 100 }).withMessage('Location must be 100 characters or less'),
    body('contactPhone').optional().isLength({ max: 20 }).withMessage('Phone number must be 20 characters or less'),
    body('businessType').optional().isLength({ max: 50 }).withMessage('Business type must be 50 characters or less'),
    body('state').optional().isIn(['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT']).withMessage('Invalid state selection'),
    body('sponsorshipLevel').optional().isIn(['Gold', 'Silver', 'Bronze', 'Supporting', 'In-Kind']).withMessage('Invalid sponsorship level')
], sponsorController.createSponsor);

// Show edit sponsor form
router.get('/:id/edit', ensureAuthenticated, ensureAdmin, sponsorController.showEditSponsor);

// Update sponsor
router.post('/:id', ensureAuthenticated, ensureAdmin, sponsorUpload, handleUploadError, [
    body('sponsorName').notEmpty().trim().isLength({ min: 2, max: 100 }).withMessage('Sponsor name must be between 2 and 100 characters'),
    body('contactEmail').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Valid email address required'),
    body('website').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid website URL required'),
    body('facebookUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid Facebook URL required'),
    body('instagramUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid Instagram URL required'),
    body('twitterUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid Twitter URL required'),
    body('linkedinUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid LinkedIn URL required'),
    body('description').optional().isLength({ max: 1000 }).withMessage('Description must be 1000 characters or less'),
    body('contactPerson').optional().isLength({ max: 100 }).withMessage('Contact person name must be 100 characters or less'),
    body('location').optional().isLength({ max: 100 }).withMessage('Location must be 100 characters or less'),
    body('contactPhone').optional().isLength({ max: 20 }).withMessage('Phone number must be 20 characters or less'),
    body('businessType').optional().isLength({ max: 50 }).withMessage('Business type must be 50 characters or less'),
    body('state').optional().isIn(['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT']).withMessage('Invalid state selection'),
    body('sponsorshipLevel').optional().isIn(['Gold', 'Silver', 'Bronze', 'Supporting', 'In-Kind']).withMessage('Invalid sponsorship level')
], sponsorController.updateSponsor);

// Delete sponsor (soft delete)
router.delete('/:id', ensureAuthenticated, ensureAdmin, sponsorController.deleteSponsor);

// Toggle sponsor status
router.put('/:id/status', ensureAuthenticated, ensureAdmin, sponsorController.toggleSponsorStatus);

module.exports = router;