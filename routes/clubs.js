const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { ensureAuthenticated } = require('../middleware/auth');
const clubController = require('../controllers/club.controller');

// Public club listings
router.get('/', clubController.showClubListings);

// Individual club profile (public)
router.get('/:id', clubController.showClubProfile);

// Club management (authenticated delegates only)
router.get('/manage', ensureAuthenticated, clubController.showClubManagement);

// Update club profile
router.post('/manage', ensureAuthenticated, [
    body('contactEmail').optional().isEmail().withMessage('Valid email address required'),
    body('website').optional().isURL().withMessage('Valid website URL required'),
    body('description').optional().isLength({ max: 1000 }).withMessage('Description must be 1000 characters or less'),
    body('contactPerson').optional().isLength({ max: 100 }).withMessage('Contact person name must be 100 characters or less'),
    body('location').optional().isLength({ max: 100 }).withMessage('Location must be 100 characters or less'),
    body('contactPhone').optional().isLength({ max: 20 }).withMessage('Phone number must be 20 characters or less')
], clubController.updateClubProfile);

module.exports = router;