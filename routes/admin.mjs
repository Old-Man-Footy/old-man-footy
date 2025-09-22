/**
 * Admin Routes - Administrator Management Interface
 * 
 * Handles all administrative routes with proper authentication
 * and authorization middleware.
 */

import express from 'express';
import { body } from 'express-validator';
import { ensureAuthenticated, ensureAdmin } from '../middleware/auth.mjs';
import { clubUpload, carnivalUpload, handleUploadError } from '../middleware/upload.mjs';
import { applyAdminSecurity, validateSecureEmail } from '../middleware/security.mjs';
import * as adminController from '../controllers/admin.controller.mjs';

const router = express.Router();

// Apply centralized admin security to all routes
router.use(applyAdminSecurity);

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

// User update validation using centralized security
const userUpdateValidation = [
    body('firstName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters'),
    body('lastName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters'),
    body('email').custom((email) => {
        const result = validateSecureEmail(email);
        if (!result.isValid) {
            throw new Error(result.errors[0]);
        }
        return true;
    })
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

// Club update validation using centralized security
const clubUpdateValidation = [
    body('clubName')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Club name must be between 2 and 100 characters'),
    body('state')
        .trim()
        .isLength({ min: 2, max: 3 })
        .withMessage('State is required'),
    body('contactEmail').custom((email) => {
        if (email && email.trim()) {
            const result = validateSecureEmail(email);
            if (!result.isValid) {
                throw new Error(result.errors[0]);
            }
        }
        return true;
    }),
    body('contactPhone')
        .optional({ nullable: true, checkFalsy: true })
        .isLength({ max: 20 })
        .withMessage('Contact phone must be 20 characters or less')
];

router.post('/clubs/:id/update',
    clubUpload,
    handleUploadError,
    clubUpdateValidation,
    adminController.updateClub
);
router.post('/clubs/:id/delete', adminController.deactivateClub);

/**
 * Carnival Management Routes
 */
router.get('/carnivals', adminController.getCarnivalManagement);
router.get('/carnivals/:id/edit', adminController.showEditCarnival);

// Carnival update validation using centralized security
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
    body('contactEmail').custom((email) => {
        const result = validateSecureEmail(email);
        if (!result.isValid) {
            throw new Error(result.errors[0]);
        }
        return true;
    })
];

router.post('/carnivals/:id/update',
    carnivalUpload,
    handleUploadError,
    carnivalUpdateValidation,
    adminController.updateCarnival
);
router.post('/carnivals/:id/toggle-status', adminController.toggleCarnivalStatus);
router.get('/carnivals/:id/claim', adminController.showClaimCarnivalForm);
router.post('/carnivals/:id/claim', adminController.adminClaimCarnival);
router.get('/carnivals/:id/players', adminController.showCarnivalPlayers);

/**
 * Additional Club Management Routes
 */
router.post('/clubs/:id/toggle-status', adminController.toggleClubStatus);
router.post('/clubs/:id/toggle-visibility', adminController.toggleClubVisibility);

/**
 * Sponsor Management Routes
 */
router.get('/sponsors', adminController.getSponsorManagement);
router.get('/sponsors/:id/edit', adminController.showEditSponsor);
router.post('/sponsors/:id/delete', adminController.deleteSponsor);

/**
 * Audit Log Management Routes
 */
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/audit-logs/export', adminController.exportAuditLogs);
router.get('/audit-logs/statistics', adminController.getAuditStatistics);

/**
 * System Management Routes
 */
router.post('/system/sync-mysideline', adminController.syncMySideline);

export default router;