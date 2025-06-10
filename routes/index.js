const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { ensureAuthenticated } = require('../middleware/auth');
const mainController = require('../controllers/main.controller');
const fs = require('fs');
const path = require('path');

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

// User Guide for Club Delegates
router.get('/user-guide', ensureAuthenticated, (req, res) => {
    try {
        const guidePath = path.join(__dirname, '..', 'docs', 'USER_GUIDE_DELEGATES.md');
        const guideContent = fs.readFileSync(guidePath, 'utf8');
        
        res.render('user-guide', {
            title: 'Club Delegate User Guide',
            guideContent: guideContent,
            user: req.user
        });
    } catch (error) {
        console.error('Error loading user guide:', error);
        req.flash('error_msg', 'User guide is temporarily unavailable.');
        res.redirect('/dashboard');
    }
});

module.exports = router;