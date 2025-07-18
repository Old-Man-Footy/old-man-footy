import express from 'express';
import { body } from 'express-validator';
import { ensureAuthenticated } from '/middleware/auth.mjs';
import { applyApiSecurity, validateSecureEmail } from '/middleware/security.mjs';
import * as sponsorController from '/controllers/sponsor.controller.mjs';

const router = express.Router();

// Apply centralized API security to all routes
router.use(applyApiSecurity);

/**
 * API Routes for Sponsor Operations
 * All routes are prefixed with /api/sponsors
 */

// Check for duplicate sponsors
router.post('/check-duplicate', ensureAuthenticated, [
    body('sponsorName').notEmpty().trim().isLength({ min: 1, max: 100 }).withMessage('Sponsor name is required')
], sponsorController.checkDuplicateSponsor);

export default router;