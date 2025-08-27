import express from 'express';
import { body } from 'express-validator';
import { ensureAuthenticated } from '../middleware/auth.mjs';
import { applySecurity, validateSecureEmail } from '../middleware/security.mjs';
import * as mainController from '../controllers/main.controller.mjs';
import * as userGuideController from '../controllers/userGuide.controller.mjs';
import * as maintenanceController from '../controllers/maintenance.controller.mjs';
import * as comingSoonController from '../controllers/comingSoon.controller.mjs';

const router = express.Router();

// Apply centralized security to all routes
router.use(applySecurity);

// Maintenance routes (must be before other routes)
router.get('/maintenance', (req, res, next) => {
    // Check if maintenance mode is disabled
    const isMaintenanceMode = process.env.FEATURE_MAINTENANCE_MODE === 'true';
    
    if (!isMaintenanceMode) {
        return res.redirect('/');
    }
    
    // If maintenance mode is enabled, show the maintenance page
    maintenanceController.showMaintenancePage(req, res, next);
});

// Coming Soon routes (must be before other routes)
router.get('/coming-soon', (req, res, next) => {
    // Check if coming soon mode is disabled
    const isComingSoonMode = process.env.FEATURE_COMING_SOON_MODE === 'true';
    
    if (!isComingSoonMode) {
        return res.redirect('/');
    }
    
    // If coming soon mode is enabled, show the coming soon page
    comingSoonController.showComingSoonPage(req, res, next);
});

// Home page - Display upcoming carnivals
router.get('/', mainController.getIndex);

// Enhanced Dashboard for authenticated users
router.get('/dashboard', ensureAuthenticated, mainController.getDashboard);

// About page
router.get('/about', mainController.getAbout);

// Contact page routes
router.get('/contact', mainController.getContact);

// Contact form submission with enhanced email validation
router.post('/contact', [
    body('firstName')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('First name is required and must be less than 50 characters'),
    body('lastName')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Last name is required and must be less than 50 characters'),
    body('email').custom((email) => {
        const result = validateSecureEmail(email);
        if (!result.isValid) {
            throw new Error(result.errors[0]);
        }
        return true;
    }),
    body('phone')
        .optional()
        .trim()
        .isLength({ max: 20 })
        .withMessage('Phone number must be less than 20 characters'),
    body('subject')
        .isIn(['general', 'technical', 'carnival', 'delegate', 'registration', 'feedback', 'other'])
        .withMessage('Please select a valid subject'),
    body('clubName')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Club name must be less than 100 characters'),
    body('message')
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage('Message is required and must be between 10-2000 characters'),
    body('newsletter')
        .optional()
        .isIn(['on'])
        .withMessage('Invalid newsletter subscription value')
], mainController.postContact);

// Newsletter routes
router.post('/subscribe', mainController.postSubscribe);
router.get('/unsubscribe', mainController.getUnsubscribe);
router.post('/unsubscribe', mainController.postUnsubscribe);

// Health check endpoint for container monitoring
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API endpoints for status checking
router.get('/api/maintenance/status', maintenanceController.getMaintenanceStatus);
router.get('/api/coming-soon/status', comingSoonController.getComingSoonStatus);

// Admin statistics (for primary delegates and admins)
router.get('/admin/stats', ensureAuthenticated, mainController.getStats);

// User Guide - accessible to both authenticated and non-authenticated users
router.get('/user-guide', userGuideController.getUserGuide);

export default router;