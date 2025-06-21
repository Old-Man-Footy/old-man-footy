const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { ensureAuthenticated } = require('../../middleware/auth');
const sponsorController = require('../../controllers/sponsor.controller');

/**
 * API Routes for Sponsor Operations
 * All routes are prefixed with /api/sponsors
 */

// Check for duplicate sponsors
router.post('/check-duplicate', ensureAuthenticated, [
    body('sponsorName').notEmpty().trim().isLength({ min: 1, max: 100 }).withMessage('Sponsor name is required')
], sponsorController.checkDuplicateSponsor);

module.exports = router;