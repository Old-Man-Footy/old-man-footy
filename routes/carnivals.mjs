import express from 'express';
import { body } from 'express-validator';
import { ensureAuthenticated } from '../middleware/auth.mjs';
import { carnivalUpload, handleUploadError } from '../middleware/upload.mjs';
import { applySecurity, validateSecureEmail } from '../middleware/security.mjs';
import * as carnivalController from '../controllers/carnival.controller.mjs';
import { AUSTRALIAN_STATES } from '../config/constants.mjs';
// Import carnival club routes as a sub-router
import carnivalClubRoutes from './carnivalClubs.mjs';

const router = express.Router();

// Apply centralized security to all routes
router.use(applySecurity);

// Validation middleware for carnival
const validateCarnival = [
    body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be between 5 and 200 characters'),
    body('date').isISO8601().withMessage('Valid date is required'),
    body('endDate')
        .optional({ nullable: true, checkFalsy: true })
        .custom((endDate, { req }) => {
            if (endDate && req.body.date) {
                const startDate = new Date(req.body.date);
                const end = new Date(endDate);
                if (end <= startDate) {
                    throw new Error('End date must be after start date');
                }
            }
            return true;
        })
        .isISO8601().withMessage('Valid end date is required'),
    body('locationAddress').trim().isLength({ min: 5, max: 500 }).withMessage('Location must be between 5 and 500 characters'),
    body('organiserContactName').trim().isLength({ min: 2, max: 100 }).withMessage('Contact name must be between 2 and 100 characters'),
    body('organiserContactEmail').custom((email) => {
        const result = validateSecureEmail(email);
        if (!result.isValid) {
            throw new Error(result.errors[0]);
        }
        return true;
    }),
    body('organiserContactPhone').optional().trim().isLength({ max: 20 }).withMessage('Phone number must be 20 characters or less'),
    body('registrationFee').optional().isDecimal({ decimal_digits: '0,2' }).withMessage('Registration fee must be a valid amount'),
    body('feesDescription').optional().trim().isLength({ max: 1000 }).withMessage('Fees description must be 1000 characters or less'),
    body('callForVolunteers').optional().trim().isLength({ max: 1000 }).withMessage('Call for volunteers must be 1000 characters or less'),
    body('state').isIn(AUSTRALIAN_STATES).withMessage('Valid state is required'),
    body('socialMediaFacebook').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid Facebook URL required'),
    body('socialMediaInstagram').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid Instagram URL required'),
    body('socialMediaTwitter').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid Twitter URL required'),
    body('socialMediaWebsite').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid website URL required')
];

// Mount carnival club routes as sub-router
// This handles all routes like /:carnivalId/attendees, /:carnivalId/register, etc.
router.use('/', carnivalClubRoutes);

// List all carnivals with filtering
router.get('/', carnivalController.list);

// Create carnival form
router.get('/new', ensureAuthenticated, carnivalController.getNew);

// Carnival gallery (public) - MUST come before /:id route
router.get('/:id/gallery', carnivalController.viewGallery);

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

// Take ownership of MySideline carnival
router.post('/:id/take-ownership', ensureAuthenticated, carnivalController.takeOwnership);

// Release ownership of MySideline carnival
router.post('/:id/release-ownership', ensureAuthenticated, carnivalController.releaseOwnership);

// Merge MySideline carnival with existing carnival
router.post('/:id/merge', ensureAuthenticated, [
    body('targetCarnivalId').notEmpty().withMessage('Target carnival is required').isInt().withMessage('Target carnival must be a valid ID')
], carnivalController.mergeCarnival);

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

export default router;