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
router.post('/users/:id/reset-password', adminController.issuePasswordReset);
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
        .trim()
        .isLength({ min: 2, max: 3 })
        .withMessage('State is required'),
    body('contactEmail')
        .optional({ nullable: true, checkFalsy: true })
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid contact email')
];

router.post('/clubs/:id/update', 
    clubUpload.single('logo'),
    handleUploadError,
    clubUpdateValidation, 
    adminController.updateClub
);
router.post('/clubs/:id/toggle-status', adminController.toggleClubStatus);
router.post('/clubs/:id/toggle-visibility', adminController.toggleClubVisibility);

/**
 * Carnival Management Routes
 */
router.get('/carnivals', adminController.getCarnivalManagement);
router.get('/carnivals/:id/edit', adminController.showEditCarnival);
router.get('/carnivals/:id/players', adminController.showCarnivalPlayers);
router.get('/carnivals/:id/claim', adminController.showClaimCarnivalForm);
router.post('/carnivals/:id/claim', adminController.adminClaimCarnival);

// Carnival update validation
const carnivalUpdateValidation = [
    body('title')
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('Carnival title must be between 5 and 200 characters'),
    body('date')
        .isISO8601()
        .withMessage('Please provide a valid date'),
    body('locationAddress')
        .trim()
        .isLength({ min: 5, max: 500 })
        .withMessage('Location address must be between 5 and 500 characters'),
    body('contactName')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Contact name must be between 2 and 100 characters'),
    body('contactEmail')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid contact email')
];

router.post('/carnivals/:id/update',
    carnivalUpload.fields([
        { name: 'logo', maxCount: 1 },
        { name: 'promotionalImage', maxCount: 1 },
        { name: 'drawFile', maxCount: 5 }
    ]),
    handleUploadError,
    carnivalUpdateValidation,
    adminController.updateCarnival
);
router.post('/carnivals/:id/toggle-status', adminController.toggleCarnivalStatus);

/**
 * Audit Log Management Routes
 */
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/audit-logs/export', adminController.exportAuditLogs);
router.get('/audit-logs/statistics', adminController.getAuditStatistics);

module.exports = router;