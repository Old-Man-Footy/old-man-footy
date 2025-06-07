/**
 * Authentication Controller - MVC Architecture Implementation
 * 
 * Handles all authentication-related business logic and request processing.
 * Follows strict MVC separation of concerns as outlined in best practices.
 */

const { User, Club } = require('../models');
const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const passport = require('passport');
const crypto = require('crypto');
const emailService = require('../services/emailService');

/**
 * Display login form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showLoginForm = (req, res) => {
    res.render('auth/login', {
        title: 'Login'
    });
};

/**
 * Handle user login
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const loginUser = (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/dashboard',
        failureRedirect: '/auth/login',
        failureFlash: true
    })(req, res, next);
};

/**
 * Display registration form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showRegisterForm = async (req, res) => {
    try {
        // Fetch all clubs for autocomplete
        const clubs = await Club.findAll({
            where: { isActive: true },
            order: [['clubName', 'ASC']]
        });

        res.render('auth/register', {
            title: 'Register as Club Delegate',
            clubs
        });
    } catch (error) {
        console.error('Error fetching clubs for registration:', error);
        // Fallback without clubs data
        res.render('auth/register', {
            title: 'Register as Club Delegate',
            clubs: []
        });
    }
};

/**
 * Handle user registration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const registerUser = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Fetch clubs for autocomplete when re-rendering form with errors
            const clubs = await Club.findAll({
                where: { isActive: true },
                order: [['clubName', 'ASC']]
            });

            return res.render('auth/register', {
                title: 'Register as Club Delegate',
                errors: errors.array(),
                formData: req.body,
                clubs
            });
        }

        const { firstName, lastName, email, password, clubName, clubState, clubAddress } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
        if (existingUser) {
            // Fetch clubs for autocomplete when re-rendering form with errors
            const clubs = await Club.findAll({
                where: { isActive: true },
                order: [['clubName', 'ASC']]
            });

            return res.render('auth/register', {
                title: 'Register as Club Delegate',
                errors: [{ msg: 'User with this email already exists' }],
                formData: req.body,
                clubs
            });
        }

        // Check if club already exists
        let club = await Club.findOne({ where: { clubName: clubName.trim() } });
        
        if (club) {
            // Club exists - check if it already has a primary delegate
            const existingPrimaryDelegate = await User.findOne({
                where: {
                    clubId: club.id,
                    isPrimaryDelegate: true,
                    isActive: true
                }
            });

            if (existingPrimaryDelegate) {
                // Fetch clubs for autocomplete when re-rendering form with errors
                const clubs = await Club.findAll({
                    where: { isActive: true },
                    order: [['clubName', 'ASC']]
                });

                return res.render('auth/register', {
                    title: 'Register as Club Delegate',
                    errors: [{ msg: 'This club already has a primary delegate. Please contact them for an invitation.' }],
                    formData: req.body,
                    clubs
                });
            }
        } else {
            // Create new club
            club = await Club.create({
                clubName: clubName.trim(),
                state: clubState,
                address: clubAddress,
                isActive: true
            });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user as primary delegate
        const newUser = await User.create({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.toLowerCase(),
            passwordHash: hashedPassword,
            clubId: club.id,
            isPrimaryDelegate: true,
            isActive: true
        });

        req.flash('success_msg', 'Registration successful! You can now log in as the primary delegate for your club.');
        res.redirect('/auth/login');

    } catch (error) {
        console.error('Error during registration:', error);
        req.flash('error_msg', 'An error occurred during registration. Please try again.');
        res.redirect('/auth/register');
    }
};

/**
 * Display invitation acceptance form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showInvitationForm = async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            req.flash('error_msg', 'Invalid invitation link.');
            return res.redirect('/auth/login');
        }

        // Find user with this invitation token
        const invitedUser = await User.findOne({
            where: {
                invitationToken: token,
                tokenExpires: { [require('sequelize').Op.gt]: new Date() },
                isActive: false
            },
            include: [{
                model: Club,
                as: 'club'
            }]
        });

        if (!invitedUser) {
            req.flash('error_msg', 'Invalid or expired invitation link.');
            return res.redirect('/auth/login');
        }

        res.render('auth/accept-invitation', {
            title: 'Accept Invitation',
            invitedUser,
            token
        });

    } catch (error) {
        console.error('Error loading invitation:', error);
        req.flash('error_msg', 'Error loading invitation.');
        res.redirect('/auth/login');
    }
};

/**
 * Handle invitation acceptance
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const acceptInvitation = async (req, res) => {
    try {
        const { token } = req.params;
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const invitedUser = await User.findOne({
                where: { invitationToken: token },
                include: [{ model: Club, as: 'club' }]
            });

            return res.render('auth/accept-invitation', {
                title: 'Accept Invitation',
                invitedUser,
                token,
                errors: errors.array(),
                formData: req.body
            });
        }

        // Find and validate invitation
        const invitedUser = await User.findOne({
            where: {
                invitationToken: token,
                tokenExpires: { [require('sequelize').Op.gt]: new Date() },
                isActive: false
            }
        });

        if (!invitedUser) {
            req.flash('error_msg', 'Invalid or expired invitation link.');
            return res.redirect('/auth/login');
        }

        // Hash password and activate user
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

        await invitedUser.update({
            firstName: req.body.firstName.trim(),
            lastName: req.body.lastName.trim(),
            passwordHash: hashedPassword,
            isActive: true,
            invitationToken: null,
            tokenExpires: null
        });

        req.flash('success_msg', 'Account activated successfully! You can now log in.');
        res.redirect('/auth/login');

    } catch (error) {
        console.error('Error accepting invitation:', error);
        req.flash('error_msg', 'An error occurred while activating your account.');
        res.redirect('/auth/login');
    }
};

/**
 * Handle user logout
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const logoutUser = (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Error during logout:', err);
            req.flash('error_msg', 'An error occurred during logout.');
            return res.redirect('/dashboard');
        }
        
        req.flash('success_msg', 'You have been logged out successfully.');
        res.redirect('/');
    });
};

/**
 * Send invitation to new club delegate
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendInvitation = async (req, res) => {
    try {
        // Check if user is primary delegate
        if (!req.user.isPrimaryDelegate) {
            req.flash('error_msg', 'Only primary delegates can send invitations.');
            return res.redirect('/dashboard');
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error_msg', 'Please provide a valid email address.');
            return res.redirect('/dashboard');
        }

        const { email } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
        if (existingUser) {
            req.flash('error_msg', 'A user with this email already exists.');
            return res.redirect('/dashboard');
        }

        // Generate invitation token
        const invitationToken = crypto.randomBytes(32).toString('hex');
        const tokenExpires = new Date();
        tokenExpires.setHours(tokenExpires.getHours() + 48); // 48 hour expiry

        // Create inactive user record
        const newUser = await User.create({
            email: email.toLowerCase(),
            clubId: req.user.clubId,
            isPrimaryDelegate: false,
            isActive: false,
            invitationToken,
            tokenExpires
        });

        // Send invitation email
        await emailService.sendInvitation(email, invitationToken, req.user.clubId.clubName);

        req.flash('success_msg', 'Invitation sent successfully!');
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Error sending invitation:', error);
        req.flash('error_msg', 'An error occurred while sending the invitation.');
        res.redirect('/dashboard');
    }
};

module.exports = {
    showLoginForm,
    loginUser,
    showRegisterForm,
    registerUser,
    showInvitationForm,
    acceptInvitation,
    logoutUser,
    sendInvitation
};