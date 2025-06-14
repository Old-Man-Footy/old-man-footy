const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { ensureAuthenticated } = require('../middleware/auth');
const mainController = require('../controllers/main.controller');
const userGuideController = require('../controllers/userGuide.controller');

// Home page - Display upcoming carnivals
router.get('/', mainController.getIndex);

// Enhanced Dashboard for authenticated users
router.get('/dashboard', ensureAuthenticated, mainController.getDashboard);

// About page
router.get('/about', mainController.getAbout);

// Contact page routes
router.get('/contact', mainController.getContact);

// Contact form submission with validation
router.post('/contact', [
    body('firstName')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('First name is required and must be less than 50 characters'),
    body('lastName')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Last name is required and must be less than 50 characters'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email address is required'),
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

// Admin statistics (for primary delegates and admins)
router.get('/admin/stats', ensureAuthenticated, mainController.getStats);

// User Guide for Club Delegates - now using proper controller
router.get('/user-guide', ensureAuthenticated, userGuideController.getUserGuide);

module.exports = router;