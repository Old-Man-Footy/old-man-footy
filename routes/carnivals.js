const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { ensureAuthenticated } = require('../middleware/auth');
const { carnivalUpload, handleUploadError } = require('../middleware/upload');
const carnivalController = require('../controllers/carnival.controller');

// List all carnivals with filtering
router.get('/', carnivalController.list);

// Show individual carnival
router.get('/:id', carnivalController.show);

// Create carnival form
router.get('/new', ensureAuthenticated, carnivalController.getNew);

// Create carnival POST with validation
router.post('/new', ensureAuthenticated, carnivalUpload, handleUploadError, [
    body('title').trim().notEmpty().withMessage('Title is required'),
    // Date is optional for MySideline imports but will be validated at model level
    body('date').optional().isISO8601().withMessage('Valid date is required when provided'),
    // Location is optional for MySideline imports but will be validated at model level
    body('locationAddress').optional().trim().isLength({ min: 5, max: 500 }).withMessage('Location address must be between 5 and 500 characters when provided'),
    // Contact details are optional for MySideline imports but will be validated at model level
    body('organiserContactName').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Organiser contact name must be between 2 and 100 characters when provided'),
    body('organiserContactEmail').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Valid organiser email is required when provided'),
    body('organiserContactPhone').optional().trim().isLength({ min: 10, max: 20 }).withMessage('Organiser phone must be between 10 and 20 characters when provided'),
    // Schedule details are optional for MySideline imports but will be validated at model level
    body('scheduleDetails').optional().trim().isLength({ min: 10 }).withMessage('Schedule details must be at least 10 characters when provided'),
    body('state').isIn(['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT']).withMessage('Valid state is required'),
    body('socialMediaFacebook').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Facebook URL must be valid'),
    body('socialMediaInstagram').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Instagram URL must be valid'),
    body('socialMediaTwitter').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Twitter URL must be valid'),
    body('socialMediaWebsite').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Website URL must be valid'),
    body('registrationLink').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Registration link must be valid')
], carnivalController.postNew);

// Edit carnival form
router.get('/:id/edit', ensureAuthenticated, carnivalController.getEdit);

// Update carnival POST with validation
router.post('/:id/edit', ensureAuthenticated, carnivalUpload, handleUploadError, [
    body('title').trim().notEmpty().withMessage('Title is required'),
    // Date is optional for MySideline imports but will be validated at model level
    body('date').optional().isISO8601().withMessage('Valid date is required when provided'),
    // Location is optional for MySideline imports but will be validated at model level
    body('locationAddress').optional().trim().isLength({ min: 5, max: 500 }).withMessage('Location address must be between 5 and 500 characters when provided'),
    // Contact details are optional for MySideline imports but will be validated at model level
    body('organiserContactName').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Organiser contact name must be between 2 and 100 characters when provided'),
    body('organiserContactEmail').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Valid organiser email is required when provided'),
    body('organiserContactPhone').optional().trim().isLength({ min: 10, max: 20 }).withMessage('Organiser phone must be between 10 and 20 characters when provided'),
    // Schedule details are optional for MySideline imports but will be validated at model level
    body('scheduleDetails').optional().trim().isLength({ min: 10 }).withMessage('Schedule details must be at least 10 characters when provided'),
    body('state').isIn(['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT']).withMessage('Valid state is required'),
    body('socialMediaFacebook').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Facebook URL must be valid'),
    body('socialMediaInstagram').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Instagram URL must be valid'),
    body('socialMediaTwitter').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Twitter URL must be valid'),
    body('socialMediaWebsite').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Website URL must be valid'),
    body('registrationLink').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Registration link must be valid')
], carnivalController.postEdit);

// Delete carnival
router.post('/:id/delete', ensureAuthenticated, carnivalController.delete);

// Take ownership of MySideline event
router.post('/:id/take-ownership', ensureAuthenticated, carnivalController.takeOwnership);

// Sync MySideline events (admin only)
router.post('/sync-mysideline', ensureAuthenticated, carnivalController.syncMySideline);

// Sponsor management routes for carnivals
// Manage sponsors for a specific carnival
router.get('/:id/sponsors', ensureAuthenticated, carnivalController.showCarnivalSponsors);

// Add sponsor to carnival
router.post('/:id/sponsors/add', ensureAuthenticated, carnivalController.addSponsorToCarnival);

// Remove sponsor from carnival
router.post('/:id/sponsors/:sponsorId/remove', ensureAuthenticated, carnivalController.removeSponsorFromCarnival);

// Send email to attendee clubs
router.post('/:id/email-attendees', ensureAuthenticated, [
    body('message').optional().trim().isLength({ max: 2000 }).withMessage('Message must be 2000 characters or less')
], carnivalController.sendEmailToAttendees);

module.exports = router;