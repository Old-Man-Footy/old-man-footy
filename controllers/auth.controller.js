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
        let clubClaimed = false; // Track if we're claiming an existing club
        
        if (club) {
            console.log(`🏆 Found existing club: ${club.clubName} (ID: ${club.id})`);
            
            // Club exists - check if it has any delegates at all
            const existingDelegates = await User.findAll({
                where: {
                    clubId: club.id,
                    isActive: true
                }
            });

            if (existingDelegates.length > 0) {
                // Club has existing delegates - check if there's a primary delegate
                const existingPrimaryDelegate = existingDelegates.find(user => user.isPrimaryDelegate);
                
                if (existingPrimaryDelegate) {
                    console.log(`❌ Club ${club.clubName} already has primary delegate: ${existingPrimaryDelegate.email}`);
                    
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
                console.log(`⚠️ Club ${club.clubName} has delegates but no primary delegate - user will become primary`);
                // If there are delegates but no primary delegate, this user becomes primary
                // (This handles edge cases where data integrity might be compromised)
            } else {
                console.log(`✅ Club ${club.clubName} exists but has no delegates - user will claim as primary delegate`);
                clubClaimed = true;
            }
            // Existing club will be claimed by this user as primary delegate
        } else {
            console.log(`🆕 Club ${clubName.trim()} does not exist - creating new club`);
            
            // Create new club
            club = await Club.create({
                clubName: clubName.trim(),
                state: clubState,
                address: clubAddress,
                isActive: true
            });
            
            console.log(`✅ New club created: ${club.clubName} (ID: ${club.id})`);
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

        if (clubClaimed) {
            console.log(`🎉 Club ${club.clubName} successfully claimed by ${newUser.email} as primary delegate`);
            req.flash('success_msg', `Registration successful! You have claimed ${club.clubName} and are now the primary delegate.`);
        } else {
            console.log(`🎉 User ${newUser.email} registered as primary delegate for ${club.clubName}`);
            req.flash('success_msg', 'Registration successful! You can now log in as the primary delegate for your club.');
        }
        
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

/**
 * Transfer primary delegate role to another user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const transferDelegateRole = async (req, res) => {
    try {
        // Check if current user is primary delegate
        if (!req.user.isPrimaryDelegate) {
            req.flash('error_msg', 'Only primary delegates can transfer their role.');
            return res.redirect('/dashboard');
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error_msg', 'Please select a valid user to transfer the role to.');
            return res.redirect('/dashboard');
        }

        const { newPrimaryUserId } = req.body;

        // Find the user to transfer role to
        const newPrimaryUser = await User.findOne({
            where: {
                id: newPrimaryUserId,
                clubId: req.user.clubId,
                isActive: true,
                isPrimaryDelegate: false
            }
        });

        if (!newPrimaryUser) {
            req.flash('error_msg', 'Selected user not found or not eligible for primary delegate role.');
            return res.redirect('/dashboard');
        }

        // Perform the transfer in a transaction to ensure data consistency
        const { sequelize } = require('../config/database');
        const transaction = await sequelize.transaction();

        try {
            // Remove primary delegate status from current user
            await req.user.update({
                isPrimaryDelegate: false
            }, { transaction });

            // Grant primary delegate status to new user
            await newPrimaryUser.update({
                isPrimaryDelegate: true
            }, { transaction });

            // Commit the transaction
            await transaction.commit();

            // Send notification email to new primary delegate
            const club = await Club.findByPk(req.user.clubId);
            await emailService.sendDelegateRoleTransferNotification(
                newPrimaryUser.email,
                newPrimaryUser.getFullName(),
                req.user.getFullName(),
                club.clubName
            );

            req.flash('success_msg', `Primary delegate role successfully transferred to ${newPrimaryUser.getFullName()}.`);
            res.redirect('/dashboard');

        } catch (transactionError) {
            // Rollback the transaction
            await transaction.rollback();
            throw transactionError;
        }

    } catch (error) {
        console.error('Error transferring delegate role:', error);
        req.flash('error_msg', 'An error occurred while transferring the delegate role.');
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
    sendInvitation,
    transferDelegateRole
};