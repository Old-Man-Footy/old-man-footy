const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { ensureAuthenticated } = require('../middleware/auth');
const mainController = require('../controllers/main.controller');

// Home page - Display upcoming carnivals
router.get('/', mainController.showHomepage);

// Enhanced Dashboard for authenticated users
router.get('/dashboard', ensureAuthenticated, mainController.showDashboard);

// About page
router.get('/about', mainController.showAbout);

// Email subscription
router.post('/subscribe', [
    body('email').isEmail().withMessage('Valid email is required'),
    body('states').isArray({ min: 1 }).withMessage('At least one state must be selected')
], mainController.subscribeEmail);

// Email unsubscription
router.get('/unsubscribe/:token', mainController.unsubscribeEmail);

// Admin statistics (for primary delegates and admins)
router.get('/admin/stats', ensureAuthenticated, mainController.showAdminStats);

module.exports = router;