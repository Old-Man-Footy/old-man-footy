import express from 'express';
import { body } from 'express-validator';
import { ensureAuthenticated } from '../middleware/auth.mjs';
import { applySecurity, validateSecureEmail } from '../middleware/security.mjs';
import * as carnivalSponsorController from '../controllers/carnivalSponsor.controller.mjs';

const router = express.Router();

// Apply centralized security to all routes
router.use(applySecurity);

// Get all carnival-sponsor relationships with filtering
router.get('/', carnivalSponsorController.getCarnivalSponsors);

// Get a specific carnival-sponsor relationship
router.get('/:id', carnivalSponsorController.getCarnivalSponsor);

// Create a new carnival-sponsor relationship
router.post('/', ensureAuthenticated, [
    body('carnivalId').isInt({ min: 1 }).withMessage('Valid carnival ID is required'),
    body('sponsorId').isInt({ min: 1 }).withMessage('Valid sponsor ID is required'),
    body('sponsorshipLevel').optional({ nullable: true, checkFalsy: true }).isIn(['Platinum', 'Gold', 'Silver', 'Bronze', 'Supporting']).withMessage('Invalid sponsorship level'),
    body('sponsorshipValue').optional({ nullable: true, checkFalsy: true }).isDecimal({ decimal_digits: '0,2' }).withMessage('Sponsorship value must be a valid amount'),
    body('description').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage('Description must be 1000 characters or less'),
    body('contactEmail').optional({ nullable: true, checkFalsy: true }).custom((email) => {
        if (email && email.trim()) {
            const result = validateSecureEmail(email);
            if (!result.isValid) {
                throw new Error(result.errors[0]);
            }
        }
        return true;
    }),
    body('websiteUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid website URL required'),
    body('logoUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Valid logo URL required'),
    body('displayOrder').optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage('Display order must be a non-negative integer')
], carnivalSponsorController.createCarnivalSponsor);

// Update a carnival-sponsor relationship
router.put('/:id', ensureAuthenticated, [
    body('sponsorshipLevel').optional({ nullable: true, checkFalsy: true }).isIn(['Platinum', 'Gold', 'Silver', 'Bronze', 'Supporting']).withMessage('Invalid sponsorship level'),
    body('sponsorshipValue').optional({ nullable: true, checkFalsy: true }).isDecimal({ decimal_digits: '0,2' }).withMessage('Sponsorship value must be a valid amount'),
    body('displayOrder').optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage('Display order must be a non-negative integer'),
    body('logoDisplaySize').optional({ nullable: true, checkFalsy: true }).isIn(['Small', 'Medium', 'Large']).withMessage('Invalid logo display size'),
    body('includeInProgram').optional({ nullable: true, checkFalsy: true }).isBoolean().withMessage('Include in program must be true or false'),
    body('includeOnWebsite').optional({ nullable: true, checkFalsy: true }).isBoolean().withMessage('Include on website must be true or false')
], carnivalSponsorController.updateCarnivalSponsor);

// Delete/deactivate a carnival-sponsor relationship
router.delete('/:id', ensureAuthenticated, carnivalSponsorController.disableCarnivalSponsor);

// Get sponsors for a specific carnival
router.get('/carnival/:carnivalId/sponsors', carnivalSponsorController.getCarnivalSponsorsForCarnival);

// Get carnivals for a specific sponsor
router.get('/sponsor/:sponsorId/carnivals', carnivalSponsorController.getCarnivalsForSponsor);

// Get sponsorship summary for a carnival
router.get('/carnival/:carnivalId/summary', carnivalSponsorController.getCarnivalSponsorshipSummary);

// Reorder carnival sponsors (update display order)
router.patch('/carnival/:carnivalId/reorder', ensureAuthenticated, [
    body('sponsorOrders').isArray().withMessage('Sponsor orders must be an array'),
    body('sponsorOrders.*.id').isInt({ min: 1 }).withMessage('Valid relationship ID is required'),
    body('sponsorOrders.*.displayOrder').isInt({ min: 0 }).withMessage('Display order must be a non-negative integer')
], carnivalSponsorController.reorderCarnivalSponsors);

export default router;