const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { ensureAuthenticated } = require('../middleware/auth');
const carnivalClubController = require('../controllers/carnivalClub.controller');

// Carnival attendees management routes (for carnival organizers)
// View attendees for a carnival
router.get('/:carnivalId/attendees', ensureAuthenticated, carnivalClubController.showCarnivalAttendees);

// Add club to carnival form
router.get('/:carnivalId/attendees/add', ensureAuthenticated, carnivalClubController.showAddClubToCarnival);

// Register club for carnival
router.post('/:carnivalId/attendees/add', ensureAuthenticated, [
    body('clubId').isInt({ min: 1 }).withMessage('Valid club selection required'),
    body('playerCount').optional().isInt({ min: 0, max: 100 }).withMessage('Player count must be between 0 and 100'),
    body('teamName').optional().isLength({ max: 100 }).withMessage('Team name must be 100 characters or less'),
    body('contactPerson').optional().isLength({ max: 100 }).withMessage('Contact person name must be 100 characters or less'),
    body('contactEmail').optional().isEmail().withMessage('Valid email address required'),
    body('contactPhone').optional().isLength({ max: 20 }).withMessage('Phone number must be 20 characters or less'),
    body('specialRequirements').optional().isLength({ max: 500 }).withMessage('Special requirements must be 500 characters or less'),
    body('registrationNotes').optional().isLength({ max: 1000 }).withMessage('Registration notes must be 1000 characters or less'),
    body('paymentAmount').optional().isFloat({ min: 0 }).withMessage('Payment amount must be a positive number')
], carnivalClubController.registerClubForCarnival);

// Edit club registration form
router.get('/:carnivalId/attendees/:registrationId/edit', ensureAuthenticated, carnivalClubController.showEditRegistration);

// Update club registration
router.post('/:carnivalId/attendees/:registrationId/edit', ensureAuthenticated, [
    body('playerCount').optional().isInt({ min: 0, max: 100 }).withMessage('Player count must be between 0 and 100'),
    body('teamName').optional().isLength({ max: 100 }).withMessage('Team name must be 100 characters or less'),
    body('contactPerson').optional().isLength({ max: 100 }).withMessage('Contact person name must be 100 characters or less'),
    body('contactEmail').optional().isEmail().withMessage('Valid email address required'),
    body('contactPhone').optional().isLength({ max: 20 }).withMessage('Phone number must be 20 characters or less'),
    body('specialRequirements').optional().isLength({ max: 500 }).withMessage('Special requirements must be 500 characters or less'),
    body('registrationNotes').optional().isLength({ max: 1000 }).withMessage('Registration notes must be 1000 characters or less'),
    body('paymentAmount').optional().isFloat({ min: 0 }).withMessage('Payment amount must be a positive number')
], carnivalClubController.updateRegistration);

// Remove club from carnival (API endpoint)
router.delete('/:carnivalId/attendees/:registrationId', ensureAuthenticated, carnivalClubController.removeClubFromCarnival);

// Reorder attending clubs (API endpoint)
router.post('/:carnivalId/attendees/reorder', ensureAuthenticated, carnivalClubController.reorderAttendingClubs);

// Delegate self-registration routes
// Register delegate's own club for a carnival
router.post('/:carnivalId/register', ensureAuthenticated, [
    body('playerCount').optional().isInt({ min: 0, max: 100 }).withMessage('Player count must be between 0 and 100'),
    body('teamName').optional().isLength({ max: 100 }).withMessage('Team name must be 100 characters or less'),
    body('contactPerson').optional().isLength({ max: 100 }).withMessage('Contact person name must be 100 characters or less'),
    body('contactEmail').optional().isEmail().withMessage('Valid email address required'),
    body('contactPhone').optional().isLength({ max: 20 }).withMessage('Phone number must be 20 characters or less'),
    body('specialRequirements').optional().isLength({ max: 500 }).withMessage('Special requirements must be 500 characters or less')
], carnivalClubController.registerMyClubForCarnival);

// Unregister delegate's own club from a carnival (API endpoint)
router.delete('/:carnivalId/register', ensureAuthenticated, carnivalClubController.unregisterMyClubFromCarnival);

module.exports = router;