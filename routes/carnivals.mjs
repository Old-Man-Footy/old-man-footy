const express = require('express');
const { body } = require('express-validator');
const { ensureAuthenticated } = require('../middleware/auth');
const { carnivalUpload, handleUploadError } = require('../middleware/upload');
const { organiserEmail } = require('../middleware/validation');
const carnivalController = require('../controllers/carnival.controller');
const upload = require('../middleware/upload');
const { AUSTRALIAN_STATES } = require('../config/constants');

const router = express.Router();

// Validation middleware for carnival
const validateCarnival = [
    body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be between 5 and 200 characters'),
    body('date').isISO8601().withMessage('Valid date is required'),
    body('endDate').optional().isISO8601().withMessage('Valid end date is required')
        .custom((endDate, { req }) => {
            if (endDate && req.body.date) {
                const startDate = new Date(req.body.date);
                const endDateObj = new Date(endDate);
                if (endDateObj <= startDate) {
                    throw new Error('End date must be after the start date');
                }
            }
            return true;
        }),
    body('locationAddress').trim().isLength({ min: 5, max: 500 }).withMessage('Location address must be between 5 and 500 characters'),
    body('organiserContactName').trim().isLength({ min: 2, max: 100 }).withMessage('Contact name must be between 2 and 100 characters'),
    organiserEmail('organiserContactEmail'),
    body('organiserContactPhone').optional().trim().isLength({ max: 20 }).withMessage('Phone number must be 20 characters or less'),
    body('scheduleDetails').optional().trim().isLength({ max: 5000 }).withMessage('Schedule details must be 5000 characters or less'),
    body('registrationLink').optional().isURL().withMessage('Valid registration link URL required'),
    body('feesDescription').optional().trim().isLength({ max: 1000 }).withMessage('Fees description must be 1000 characters or less'),
    body('callForVolunteers').optional().trim().isLength({ max: 1000 }).withMessage('Call for volunteers must be 1000 characters or less'),
    body('state').isIn(AUSTRALIAN_STATES).withMessage('Valid state is required'),
    body('socialMediaFacebook').optional().isURL().withMessage('Valid Facebook URL required'),
    body('socialMediaInstagram').optional().isURL().withMessage('Valid Instagram URL required'),
    body('socialMediaTwitter').optional().isURL().withMessage('Valid Twitter URL required'),
    body('socialMediaWebsite').optional().isURL().withMessage('Valid website URL required')
];



// List all carnivals with filtering
router.get('/', carnivalController.list);

// Create carnival form
router.get('/new', ensureAuthenticated, carnivalController.getNew);

// Show individual carnival
router.get('/:id', carnivalController.show);

// Create carnival POST with validation
router.post('/new', ensureAuthenticated, carnivalUpload, handleUploadError, validateCarnival, carnivalController.postNew);

// Edit carnival form
router.get('/:id/edit', ensureAuthenticated, carnivalController.getEdit);

// Update carnival POST with validation
router.post('/:id/edit', ensureAuthenticated, carnivalUpload, handleUploadError, validateCarnival, carnivalController.postEdit);

// Delete carnival
router.post('/:id/delete', ensureAuthenticated, carnivalController.delete);

// Take ownership of MySideline event
router.post('/:id/take-ownership', ensureAuthenticated, carnivalController.takeOwnership);

// Release ownership of MySideline event
router.post('/:id/release-ownership', ensureAuthenticated, carnivalController.releaseOwnership);

// Merge MySideline carnival with existing carnival
router.post('/:id/merge', ensureAuthenticated, [
    body('targetCarnivalId').notEmpty().withMessage('Target carnival is required').isInt().withMessage('Target carnival must be a valid ID')
], carnivalController.mergeCarnival);

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

// Show comprehensive player list for all clubs attending a carnival
router.get('/:id/players', ensureAuthenticated, carnivalController.showAllPlayers);

module.exports = router;