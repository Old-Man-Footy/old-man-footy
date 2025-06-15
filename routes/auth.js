const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');

// Login routes
router.get('/login', authController.showLoginForm);
router.post('/login', authController.loginUser);

// Registration routes
router.get('/register', authController.showRegisterForm);
router.post('/register', [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], authController.registerUser);

// Invitation routes
router.get('/invite/:token', authController.showInvitationForm);
router.post('/invite/:token', [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], authController.acceptInvitation);

// Send invitation (for primary delegates)
router.post('/send-invitation', [
    body('email').isEmail().withMessage('Valid email is required')
], authController.sendInvitation);

// Transfer delegate role (for primary delegates)
router.post('/transfer-delegate-role', [
    body('newPrimaryUserId').isInt({ min: 1 }).withMessage('Valid user ID is required')
], authController.transferDelegateRole);

// Logout
router.post('/logout', authController.logoutUser);

module.exports = router;