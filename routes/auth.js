const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { ensureAuthenticated } = require('../middleware/auth');

// Login routes
router.get('/login', authController.showLoginForm);
router.post('/login', authController.loginUser);

// Registration routes
router.get('/register', authController.showRegisterForm);
router.post('/register', [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phoneNumber').optional().isLength({ max: 20 }).withMessage('Phone number must be 20 characters or less')
        .custom((value) => {
            if (value && value.trim()) {
                // Allow common Australian phone number formats: +61, 04, (02), etc.
                const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,20}$/;
                if (!phoneRegex.test(value.trim())) {
                    throw new Error('Please enter a valid phone number format');
                }
            }
            return true;
        }),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], authController.registerUser);

// Invitation routes
router.get('/invite/:token', authController.showInvitationForm);
router.post('/invite/:token', [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], authController.acceptInvitation);

// Send invitation (for primary delegates) - requires authentication
router.post('/send-invitation', ensureAuthenticated, [
    body('email').isEmail().withMessage('Valid email is required')
], authController.sendInvitation);

// Transfer delegate role (for primary delegates) - requires authentication
router.post('/transfer-delegate-role', ensureAuthenticated, [
    body('newPrimaryUserId').isInt({ min: 1 }).withMessage('Valid user ID is required')
], authController.transferDelegateRole);

// Update phone number (for logged-in users) - requires authentication
router.post('/update-phone', ensureAuthenticated, [
    body('phoneNumber').optional().isLength({ max: 20 }).withMessage('Phone number must be 20 characters or less')
        .custom((value) => {
            if (value && value.trim()) {
                // Allow common Australian phone number formats: +61, 04, (02), etc.
                const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,20}$/;
                if (!phoneRegex.test(value.trim())) {
                    throw new Error('Please enter a valid phone number format');
                }
            }
            return true;
        })
], authController.updatePhoneNumber);

// Update name (for logged-in users) - requires authentication
router.post('/update-name', ensureAuthenticated, [
    body('firstName').trim().notEmpty().withMessage('First name is required')
        .isLength({ min: 1, max: 50 }).withMessage('First name must be between 1 and 50 characters'),
    body('lastName').trim().notEmpty().withMessage('Last name is required')
        .isLength({ min: 1, max: 50 }).withMessage('Last name must be between 1 and 50 characters')
], authController.updateName);

// Update email (for logged-in users) - requires authentication
router.post('/update-email', ensureAuthenticated, [
    body('email').isEmail().withMessage('Valid email is required')
        .normalizeEmail(),
    body('currentPassword').notEmpty().withMessage('Current password is required for security')
], authController.updateEmail);

// Logout
router.post('/logout', authController.logoutUser);

module.exports = router;