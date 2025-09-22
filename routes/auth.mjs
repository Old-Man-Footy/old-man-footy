import express from 'express';
import { body, param } from 'express-validator';
import { ensureAuthenticated } from '../middleware/auth.mjs';
import { applyAuthSecurity, validatePassword, validateSecureEmail, formSubmissionRateLimit, csrfProtection } from '../middleware/security.mjs';
import * as authController from '../controllers/auth.controller.mjs';

const router = express.Router();

// Apply centralized auth security to all routes
router.use(applyAuthSecurity);

// Login routes
router.get('/login', authController.showLoginForm);
router.post('/login', authController.loginUser);

// Registration routes
router.get('/register', authController.showRegisterForm);
router.post('/register', [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').custom((email) => {
        const result = validateSecureEmail(email);
        if (!result.isValid) {
            throw new Error(result.errors[0]);
        }
        return true;
    }),
    body('phoneNumber').optional({ nullable: true, checkFalsy: true }).isLength({ max: 20 }).withMessage('Phone number must be 20 characters or less')
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
    body('password').custom((password) => {
        const result = validatePassword(password);
        if (!result.isValid) {
            throw new Error(result.errors[0]);
        }
        return true;
    })
], authController.registerUser);

// Forgot password routes
router.get('/forgot-password', authController.showForgotPasswordForm);

router.post('/forgot-password', formSubmissionRateLimit, csrfProtection, [
    body('email').custom((email) => {
        const result = validateSecureEmail(email);
        if (!result.isValid) {
            throw new Error(result.errors[0]);
        }
        return true;
    })
], authController.initiateForgotPassword);

router.get('/reset-password/:token', [
    param('token').isLength({ min: 64, max: 64 }).isAlphanumeric().withMessage('Invalid reset token format')
], authController.showResetPasswordForm);

router.post('/reset-password/:token', formSubmissionRateLimit, csrfProtection, [
    param('token').isLength({ min: 64, max: 64 }).isAlphanumeric().withMessage('Invalid reset token format'),
    body('password').custom((password) => {
        const result = validatePassword(password);
        if (!result.isValid) {
            throw new Error(result.errors[0]);
        }
        return true;
    }),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Password confirmation does not match');
        }
        return true;
    })
], authController.resetPasswordWithToken);

// Invitation routes
router.get('/invite/:token', authController.showInvitationForm);
router.post('/invite/:token', [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('password').custom((password) => {
        const result = validatePassword(password);
        if (!result.isValid) {
            throw new Error(result.errors[0]);
        }
        return true;
    })
], authController.acceptInvitation);

// Send invitation (for primary delegates) - requires authentication
router.post('/send-invitation', ensureAuthenticated, [
    body('email').custom((email) => {
        const result = validateSecureEmail(email);
        if (!result.isValid) {
            throw new Error(result.errors[0]);
        }
        return true;
    })
], authController.sendInvitation);

// Transfer delegate role (for primary delegates) - requires authentication
router.post('/transfer-delegate-role', ensureAuthenticated, [
    body('newPrimaryUserId').isInt({ min: 1 }).withMessage('Valid user ID is required')
], authController.transferDelegateRole);

// Update phone number (for logged-in users) - requires authentication
router.post('/update-phone', ensureAuthenticated, [
    body('phoneNumber').optional({ nullable: true, checkFalsy: true }).isLength({ max: 20 }).withMessage('Phone number must be 20 characters or less')
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
    body('email').custom((email) => {
        const result = validateSecureEmail(email);
        if (!result.isValid) {
            throw new Error(result.errors[0]);
        }
        return true;
    }),
    body('currentPassword').notEmpty().withMessage('Current password is required for security')
], authController.updateEmail);

// Password reset (for logged-in users) - requires authentication
router.post('/password-reset', ensureAuthenticated, [
    body('existingPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').custom((password) => {
        const result = validatePassword(password);
        if (!result.isValid) {
            throw new Error(result.errors[0]);
        }
        return true;
    })
], authController.resetPassword);

// Logout
router.post('/logout', authController.logoutUser);

export default router;