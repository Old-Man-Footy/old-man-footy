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

// Approve club registration
router.post('/:carnivalId/attendees/:registrationId/approve', ensureAuthenticated, carnivalClubController.approveClubRegistration);

// Reject club registration
router.post('/:carnivalId/attendees/:registrationId/reject', ensureAuthenticated, [
    body('rejectionReason').optional().isLength({ max: 500 }).withMessage('Rejection reason must be 500 characters or less')
], carnivalClubController.rejectClubRegistration);

// Player management routes for carnival attendance
// Manage players for a specific club's carnival registration
router.get('/:carnivalId/attendees/:registrationId/players', ensureAuthenticated, carnivalClubController.showCarnivalClubPlayers);

// Add players to carnival registration form
router.get('/:carnivalId/attendees/:registrationId/players/add', ensureAuthenticated, carnivalClubController.showAddPlayersToRegistration);

// Add selected players to carnival registration
router.post('/:carnivalId/attendees/:registrationId/players/add', ensureAuthenticated, [
    body('playerIds').isArray({ min: 1 }).withMessage('At least one player must be selected'),
    body('playerIds.*').isInt({ min: 1 }).withMessage('Valid player selection required')
], carnivalClubController.addPlayersToRegistration);

// Remove player from carnival registration
router.delete('/:carnivalId/attendees/:registrationId/players/:assignmentId', ensureAuthenticated, carnivalClubController.removePlayerFromRegistration);

// Update player attendance status
router.post('/:carnivalId/attendees/:registrationId/players/:assignmentId/status', ensureAuthenticated, [
    body('attendanceStatus').isIn(['confirmed', 'tentative', 'unavailable']).withMessage('Valid attendance status required'),
    body('notes').optional().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
], carnivalClubController.updatePlayerAttendanceStatus);

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

// Manage players for delegate's own club registration
router.get('/:carnivalId/register/players', ensureAuthenticated, carnivalClubController.showMyClubPlayersForCarnival);

// Add players to delegate's own club registration
router.post('/:carnivalId/register/players', ensureAuthenticated, [
    body('playerIds').isArray({ min: 1 }).withMessage('At least one player must be selected'),
    body('playerIds.*').isInt({ min: 1 }).withMessage('Valid player selection required')
], carnivalClubController.addPlayersToMyClubRegistration);

// Unregister delegate's own club from a carnival (API endpoint)
router.delete('/:carnivalId/register', ensureAuthenticated, carnivalClubController.unregisterMyClubFromCarnival);

module.exports = router;