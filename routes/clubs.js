const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { ensureAuthenticated } = require('../middleware/auth');
const { clubUpload, handleUploadError } = require('../middleware/upload');
const clubController = require('../controllers/club.controller');

// Public club listings
router.get('/', clubController.showClubListings);

// Individual club profile (public)
router.get('/:id', clubController.showClubProfile);

// Club management (authenticated delegates only)
router.get('/manage', ensureAuthenticated, clubController.showClubManagement);

// Update club profile with structured upload support
router.post('/manage', ensureAuthenticated, clubUpload, handleUploadError, [
    body('contactEmail').optional().isEmail().withMessage('Valid email address required'),
    body('website').optional().isURL().withMessage('Valid website URL required'),
    body('description').optional().isLength({ max: 1000 }).withMessage('Description must be 1000 characters or less'),
    body('contactPerson').optional().isLength({ max: 100 }).withMessage('Contact person name must be 100 characters or less'),
    body('location').optional().isLength({ max: 100 }).withMessage('Location must be 100 characters or less'),
    body('contactPhone').optional().isLength({ max: 20 }).withMessage('Phone number must be 20 characters or less')
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
router.post('/manage/sponsors/add', ensureAuthenticated, clubController.addSponsorToClub);

// Remove sponsor from club
router.post('/manage/sponsors/:sponsorId/remove', ensureAuthenticated, clubController.removeSponsorFromClub);

// Update sponsor priority/order for club
router.post('/manage/sponsors/reorder', ensureAuthenticated, clubController.reorderClubSponsors);

module.exports = router;