/**
 * Admin Routes - Administrator Management Interface
 * 
 * Handles all administrative routes with proper authentication
 * and authorization middleware.
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');
const { clubUpload, carnivalUpload, handleUploadError } = require('../middleware/upload');
const adminController = require('../controllers/admin.controller');

// Apply admin authentication to all routes
router.use(ensureAuthenticated);
router.use(ensureAdmin);

/**
 * Admin Dashboard Routes
 */
router.get('/dashboard', adminController.getAdminDashboard);
router.get('/reports', adminController.generateReport);

/**
 * User Management Routes
 */
router.get('/users', adminController.getUserManagement);
router.get('/users/:id/edit', adminController.showEditUser);

// User update validation
const userUpdateValidation = [
    body('firstName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters'),
    body('lastName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address')
];

router.post('/users/:id/update', userUpdateValidation, adminController.updateUser);
router.post('/users/:id/password-reset', adminController.issuePasswordReset);
router.post('/users/:id/toggle-status', adminController.toggleUserStatus);
router.post('/users/:id/delete', adminController.deleteUser);

/**
 * Club Management Routes
 */
router.get('/clubs', adminController.getClubManagement);
router.get('/clubs/:id/edit', adminController.showEditClub);

// Club update validation
const clubUpdateValidation = [
    body('clubName')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Club name must be between 2 and 100 characters'),
    body('state')
        .isIn(['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'])
        .withMessage('Please select a valid state')
];

router.post('/clubs/:id/edit', clubUpload, handleUploadError, clubUpdateValidation, adminController.updateClub);
router.post('/clubs/:id/toggle-status', adminController.toggleClubStatus);
router.post('/clubs/:id/toggle-visibility', adminController.toggleClubVisibility);

/**
 * Carnival Management Routes
 */
router.get('/carnivals', adminController.getCarnivalManagement);
router.get('/carnivals/:id/edit', adminController.showEditCarnival);

// Carnival update validation
const carnivalUpdateValidation = [
    body('title')
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('Title must be between 5 and 200 characters'),
    body('date')
        .optional()
        .isISO8601()
        .toDate()
        .withMessage('Please provide a valid date when specified'),
    body('locationAddress')
        .optional()
        .trim()
        .isLength({ min: 10, max: 500 })
        .withMessage('Location address must be between 10 and 500 characters when provided'),
    body('state')
        .isIn(['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'])
        .withMessage('Please select a valid state'),
    body('scheduleDetails')
        .optional()
        .trim()
        .isLength({ min: 10 })
        .withMessage('Schedule details must be at least 10 characters when provided'),
    body('organiserContactEmail')
        .optional({ nullable: true, checkFalsy: true })
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid contact email when specified')
];

router.post('/carnivals/:id/edit', carnivalUpload, handleUploadError, carnivalUpdateValidation, adminController.updateCarnival);
router.post('/carnivals/:id/toggle-status', adminController.toggleCarnivalStatus);

module.exports = router;