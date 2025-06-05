const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/User');
const Club = require('../models/Club');
const { body, validationResult } = require('express-validator');
const { ensureGuest, ensureAuthenticated } = require('../middleware/auth');
const emailService = require('../services/emailService');

// Login page
router.get('/login', ensureGuest, (req, res) => {
    res.render('auth/login', {
        title: 'Login'
    });
});

// Login POST
router.post('/login', ensureGuest, [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error_msg', 'Please provide valid email and password.');
        return res.redirect('/auth/login');
    }

    passport.authenticate('local', {
        successRedirect: '/dashboard',
        failureRedirect: '/auth/login',
        failureFlash: true
    })(req, res, next);
});

// Logout
router.post('/logout', ensureAuthenticated, (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        req.flash('success_msg', 'You have been logged out successfully.');
        res.redirect('/');
    });
});

// Initial registration - Club delegate signs up
router.get('/register', ensureGuest, async (req, res) => {
    try {
        const clubs = await Club.find({}).sort({ clubName: 1 });
        res.render('auth/register', {
            title: 'Register as Club Delegate',
            clubs
        });
    } catch (error) {
        console.error('Error fetching clubs:', error);
        res.render('auth/register', {
            title: 'Register as Club Delegate',
            clubs: []
        });
    }
});

// Register POST
router.post('/register', ensureGuest, [
    body('email').isEmail().normalizeEmail(),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('clubName').trim().notEmpty(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Password confirmation does not match password');
        }
        return true;
    })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const clubs = await Club.find({}).sort({ clubName: 1 });
            return res.render('auth/register', {
                title: 'Register as Club Delegate',
                clubs,
                errors: errors.array(),
                formData: req.body
            });
        }

        const { email, firstName, lastName, clubName, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            const clubs = await Club.find({}).sort({ clubName: 1 });
            return res.render('auth/register', {
                title: 'Register as Club Delegate',
                clubs,
                errors: [{ msg: 'A user with this email already exists.' }],
                formData: req.body
            });
        }

        // Find or create club
        let club = await Club.findOne({ clubName: { $regex: new RegExp(`^${clubName}$`, 'i') } });
        if (!club) {
            club = new Club({ clubName });
            await club.save();
        }

        // Check if this club already has a primary delegate
        const existingPrimaryDelegate = await User.findOne({
            clubId: club._id,
            isPrimaryDelegate: true
        });

        // Create new user
        const newUser = new User({
            email,
            firstName,
            lastName,
            clubId: club._id,
            passwordHash: password, // Will be hashed by the pre-save middleware
            isPrimaryDelegate: !existingPrimaryDelegate, // First delegate becomes primary
            isActive: true
        });

        await newUser.save();

        req.flash('success_msg', 'Registration successful! You can now log in.');
        res.redirect('/auth/login');

    } catch (error) {
        console.error('Registration error:', error);
        const clubs = await Club.find({}).sort({ clubName: 1 });
        res.render('auth/register', {
            title: 'Register as Club Delegate',
            clubs,
            errors: [{ msg: 'An error occurred during registration. Please try again.' }],
            formData: req.body
        });
    }
});

// Invitation acceptance
router.get('/accept-invitation/:token', async (req, res) => {
    try {
        const user = await User.findOne({
            invitationToken: req.params.token,
            tokenExpires: { $gt: new Date() }
        }).populate('clubId');

        if (!user) {
            req.flash('error_msg', 'Invalid or expired invitation link.');
            return res.redirect('/auth/login');
        }

        res.render('auth/accept-invitation', {
            title: 'Complete Registration',
            user
        });
    } catch (error) {
        console.error('Invitation error:', error);
        req.flash('error_msg', 'An error occurred while processing the invitation.');
        res.redirect('/auth/login');
    }
});

// Accept invitation POST
router.post('/accept-invitation/:token', [
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Password confirmation does not match password');
        }
        return true;
    })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const user = await User.findOne({
                invitationToken: req.params.token,
                tokenExpires: { $gt: new Date() }
            }).populate('clubId');
            
            return res.render('auth/accept-invitation', {
                title: 'Complete Registration',
                user,
                errors: errors.array(),
                formData: req.body
            });
        }

        const user = await User.findOne({
            invitationToken: req.params.token,
            tokenExpires: { $gt: new Date() }
        });

        if (!user) {
            req.flash('error_msg', 'Invalid or expired invitation link.');
            return res.redirect('/auth/login');
        }

        // Set password and activate account
        user.passwordHash = req.body.password; // Will be hashed by pre-save middleware
        user.isActive = true;
        user.invitationToken = undefined;
        user.tokenExpires = undefined;
        
        await user.save();

        req.flash('success_msg', 'Registration completed successfully! You can now log in.');
        res.redirect('/auth/login');

    } catch (error) {
        console.error('Accept invitation error:', error);
        req.flash('error_msg', 'An error occurred while completing registration.');
        res.redirect('/auth/login');
    }
});

// Invite delegate (Primary delegate only)
router.post('/invite-delegate', ensureAuthenticated, [
    body('email').isEmail().normalizeEmail(),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty()
], async (req, res) => {
    try {
        // Check if user is primary delegate
        if (!req.user.isPrimaryDelegate) {
            req.flash('error_msg', 'Only primary delegates can invite new delegates.');
            return res.redirect('/dashboard');
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error_msg', 'Please provide valid information for all fields.');
            return res.redirect('/dashboard');
        }

        const { email, firstName, lastName } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.flash('error_msg', 'A user with this email address already exists.');
            return res.redirect('/dashboard');
        }

        // Create new inactive user with invitation token
        const newUser = new User({
            email,
            firstName,
            lastName,
            clubId: req.user.clubId,
            isPrimaryDelegate: false,
            isActive: false
        });

        const invitationToken = newUser.generateInvitationToken();
        await newUser.save();

        // Send invitation email
        const invitationLink = `${req.protocol}://${req.get('host')}/auth/accept-invitation/${invitationToken}`;
        
        await emailService.sendInvitationEmail({
            to: email,
            firstName,
            inviterName: `${req.user.firstName} ${req.user.lastName}`,
            clubName: req.user.clubId.clubName,
            invitationLink
        });

        req.flash('success_msg', `Invitation sent successfully to ${email}. They have 7 days to complete their registration.`);
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Invite delegate error:', error);
        req.flash('error_msg', 'An error occurred while sending the invitation. Please try again.');
        res.redirect('/dashboard');
    }
});

module.exports = router;