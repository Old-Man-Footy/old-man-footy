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
    body('date').isISO8601().withMessage('Valid date is required'),
    body('locationAddress').trim().notEmpty().withMessage('Location address is required'),
    body('organiserContactName').trim().notEmpty().withMessage('Organiser contact name is required'),
    body('organiserContactEmail').isEmail().withMessage('Valid organiser email is required'),
    body('organiserContactPhone').trim().notEmpty().withMessage('Organiser phone is required'),
    body('scheduleDetails').trim().notEmpty().withMessage('Schedule details are required'),
    body('state').isIn(['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT']).withMessage('Valid state is required'),
    body('socialMediaFacebook').optional().isURL().withMessage('Facebook URL must be valid'),
    body('socialMediaInstagram').optional().isURL().withMessage('Instagram URL must be valid'),
    body('socialMediaTwitter').optional().isURL().withMessage('Twitter URL must be valid'),
    body('socialMediaWebsite').optional().isURL().withMessage('Website URL must be valid'),
    body('registrationLink').optional().isURL().withMessage('Registration link must be valid')
], carnivalController.postNew);

// Edit carnival form
router.get('/:id/edit', ensureAuthenticated, carnivalController.getEdit);

// Update carnival POST with validation
router.post('/:id/edit', ensureAuthenticated, carnivalUpload, handleUploadError, [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
    body('locationAddress').trim().notEmpty().withMessage('Location address is required'),
    body('organiserContactName').trim().notEmpty().withMessage('Organiser contact name is required'),
    body('organiserContactEmail').isEmail().withMessage('Valid organiser email is required'),
    body('organiserContactPhone').trim().notEmpty().withMessage('Organiser phone is required'),
    body('scheduleDetails').trim().notEmpty().withMessage('Schedule details are required'),
    body('state').isIn(['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT']).withMessage('Valid state is required'),
    body('socialMediaFacebook').optional().isURL().withMessage('Facebook URL must be valid'),
    body('socialMediaInstagram').optional().isURL().withMessage('Instagram URL must be valid'),
    body('socialMediaTwitter').optional().isURL().withMessage('Twitter URL must be valid'),
    body('socialMediaWebsite').optional().isURL().withMessage('Website URL must be valid'),
    body('registrationLink').optional().isURL().withMessage('Registration link must be valid')
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