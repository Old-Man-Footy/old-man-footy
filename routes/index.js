const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { ensureAuthenticated } = require('../middleware/auth');
const mainController = require('../controllers/main.controller');

// Home page - Display upcoming carnivals
router.get('/', mainController.getIndex);

// Enhanced Dashboard for authenticated users
router.get('/dashboard', ensureAuthenticated, mainController.getDashboard);

// About page
router.get('/about', mainController.getAbout);

// Email subscription
router.post('/subscribe', [
    body('email').isEmail().withMessage('Valid email is required'),
    body('states').isArray({ min: 1 }).withMessage('At least one state must be selected')
], mainController.postSubscribe);

// Email unsubscription
router.get('/unsubscribe/:token', mainController.getUnsubscribe);

// Admin statistics (for primary delegates and admins)
router.get('/admin/stats', ensureAuthenticated, mainController.getStats);

module.exports = router;