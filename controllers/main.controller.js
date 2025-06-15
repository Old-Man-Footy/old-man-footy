/**
 * Main Application Controller - MVC Architecture Implementation
 * 
 * Handles homepage, dashboard, and general application logic.
 * Follows strict MVC separation of concerns as outlined in best practices.
 */

const { Carnival, Club, User, EmailSubscription } = require('../models');
const { Op } = require('sequelize');
const emailService = require('../services/emailService');
const carouselImageService = require('../services/carouselImageService');
const crypto = require('crypto');

/**
 * Display homepage with upcoming carnivals
 */
const getIndex = async (req, res) => {
    try {
        const upcomingCarnivals = await Carnival.findAll({
            where: {
                date: { [Op.gte]: new Date() },
                isActive: true
            },
            include: [{
                model: User,
                as: 'creator',
                attributes: ['firstName', 'lastName']
            }],
            order: [['date', 'ASC']],
            limit: 4
        });

        // Get statistics for the stats runner
        const stats = {
            totalCarnivals: await Carnival.count({ where: { isActive: true } }),
            upcomingCount: await Carnival.count({
                where: {
                    date: { [Op.gte]: new Date() },
                    isActive: true
                }
            }),
            clubsCount: await Club.count({ 
                where: { 
                    isActive: true, 
                    isPubliclyListed: true 
                } 
            })
        };

        // Get carousel images for the homepage
        const carouselImages = await carouselImageService.getCarouselImages(8);

        return res.render('index', { 
            title: 'Old Man Footy',
            upcomingCarnivals,
            carnivals: upcomingCarnivals, // Also provide as 'carnivals' for template compatibility
            stats,
            carouselImages,
            additionalCSS: []
        });
    } catch (error) {
        console.error('Error loading homepage:', error);
        if (!res.headersSent) {
            return res.render('index', { 
                title: 'Old Man Footy',
                upcomingCarnivals: [],
                carnivals: [], // Also provide as 'carnivals' for template compatibility
                stats: {
                    totalCarnivals: 0,
                    upcomingCount: 0,
                    clubsCount: 0
                },
                carouselImages: [],
                additionalCSS: []
            });
        }
    }
};

/**
 * Display user dashboard
 */
const getDashboard = async (req, res) => {
    try {
        // Load user with full club information
        const userWithClub = await User.findByPk(req.user.id, {
            include: [{
                model: Club,
                as: 'club',
                attributes: ['id', 'clubName', 'state', 'location', 'isActive', 'isPubliclyListed']
            }]
        });

        // Get user's carnivals
        const userCarnivals = await Carnival.findAll({
            where: { 
                createdByUserId: req.user.id,
                isActive: true 
            },
            order: [['date', 'DESC']]
        });

        // Get upcoming carnivals
        const upcomingCarnivals = await Carnival.findAll({
            where: {
                date: { [Op.gte]: new Date() },
                isActive: true
            },
            order: [['date', 'ASC']],
            limit: 4
        });

        // Get user's clubs (if they have any associated)
        let clubs = [];
        if (userWithClub.clubId && userWithClub.club) {
            clubs = [userWithClub.club];
        }

        // Get eligible delegates for transfer (if user is primary delegate)
        let eligibleDelegates = [];
        if (userWithClub.isPrimaryDelegate && userWithClub.clubId) {
            eligibleDelegates = await User.findAll({
                where: {
                    clubId: userWithClub.clubId,
                    isActive: true,
                    isPrimaryDelegate: false,
                    id: { [Op.ne]: userWithClub.id } // Exclude current user
                },
                attributes: ['id', 'firstName', 'lastName', 'email'],
                order: [['firstName', 'ASC'], ['lastName', 'ASC']]
            });
        }

        // Update the user object to include club information for template
        const enrichedUser = {
            ...userWithClub.toJSON(),
            clubId: userWithClub.club // This provides clubId.clubName for the template
        };

        return res.render('dashboard', {
            title: 'Dashboard',
            user: enrichedUser,
            userCarnivals,
            upcomingCarnivals,
            clubs, // Add clubs variable for the dashboard checklist
            carnivals: userCarnivals, // Add carnivals variable as alias for userCarnivals
            eligibleDelegates,
            additionalCSS: []
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        if (!res.headersSent) {
            return res.render('dashboard', {
                title: 'Dashboard',
                user: req.user,
                userCarnivals: [],
                upcomingCarnivals: [],
                clubs: [], // Ensure clubs is always provided
                carnivals: [], // Ensure carnivals is always provided
                eligibleDelegates: [],
                additionalCSS: []
            });
        }
    }
};

/**
 * Display about page
 */
const getAbout = (req, res) => {
    res.render('about', { 
        title: 'About Old Man Footy',
        additionalCSS: []
    });
};

/**
 * Handle email subscription
 */
const postSubscribe = async (req, res) => {
    try {
        const { email } = req.body;

        // Validate email
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email address is required'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email address'
            });
        }

        // Check if email already exists
        const existingSubscription = await EmailSubscription.findOne({
            where: { email: email.toLowerCase() }
        });

        if (existingSubscription && existingSubscription.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Email already subscribed'
            });
        }

        if (existingSubscription && !existingSubscription.isActive) {
            // Reactivate existing subscription
            await existingSubscription.update({
                isActive: true,
                subscribedAt: new Date()
            });
        } else {
            // Create new subscription
            await EmailSubscription.create({
                email: email.toLowerCase(),
                isActive: true,
                subscribedAt: new Date()
            });
        }

        res.json({
            success: true,
            message: 'Successfully subscribed to newsletter!'
        });
    } catch (error) {
        console.error('Error handling email subscription:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to process subscription. Please try again.'
        });
    }
};

/**
 * Display unsubscribe page
 */
const getUnsubscribe = async (req, res) => {
    try {
        const { token } = req.params;
        
        // Decrypt token to get email
        const decipher = crypto.createDecipher('aes192', process.env.ENCRYPTION_KEY || 'default-key');
        let email = decipher.update(token, 'hex', 'utf8');
        email += decipher.final('utf8');

        const subscription = await EmailSubscription.findOne({
            where: { email, isActive: true }
        });

        if (!subscription) {
            return res.status(400).render('error', {
                title: 'Invalid Link',
                message: 'This unsubscribe link is invalid or has expired.',
                error: null,
                additionalCSS: []
            });
        }

        res.render('unsubscribe', {
            title: 'Unsubscribe',
            email: subscription.email,
            additionalCSS: []
        });
    } catch (error) {
        console.error('Error unsubscribing:', error);
        res.status(400).render('error', {
            title: 'Invalid Link', 
            message: 'This unsubscribe link is invalid or has expired.',
            error: null,
            additionalCSS: []
        });
    }
};

/**
 * Process unsubscribe request
 */
const postUnsubscribe = async (req, res) => {
    try {
        const { email } = req.body;

        const subscription = await EmailSubscription.findOne({
            where: { email }
        });

        if (subscription) {
            await subscription.update({
                isActive: false,
                unsubscribedAt: new Date()
            });
        }

        res.render('success', {
            title: 'Unsubscribed',
            message: 'You have been successfully unsubscribed from our newsletter.',
            additionalCSS: []
        });
    } catch (error) {
        console.error('Error unsubscribing:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Unable to process unsubscribe request.',
            additionalCSS: []
        });
    }
};

/**
 * Display admin statistics
 */
const getStats = async (req, res) => {
    try {
        const stats = {
            totalUsers: await User.count(),
            totalCarnivals: await Carnival.count(),
            totalClubs: await Club.count(),
            totalSubscriptions: await EmailSubscription.count({ where: { isActive: true } })
        };

        res.render('admin/stats', {
            title: 'Admin Statistics',
            stats,
            additionalCSS: ['/styles/admin.styles.css']
        });
    } catch (error) {
        console.error('Error loading admin statistics:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Unable to load statistics',
            additionalCSS: []
        });
    }
};

/**
 * Send newsletter to subscribers
 */
const sendNewsletter = async (req, res) => {
    try {
        const { subject, content } = req.body;

        if (!subject || !content) {
            return res.status(400).json({
                success: false,
                message: 'Subject and content are required'
            });
        }

        const subscribers = await EmailSubscription.findAll({
            where: { isActive: true }
        });

        const result = await emailService.sendNewsletter(subject, content, subscribers);

        res.json({
            success: true,
            message: `Newsletter sent to ${result.sent} subscribers`,
            details: result
        });
    } catch (error) {
        console.error('Error sending newsletter:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send newsletter'
        });
    }
};

/**
 * Display contact page
 */
const getContact = (req, res) => {
    res.render('contact', {
        title: 'Contact Us',
        user: req.user,
        errors: req.flash('error'),
        success: req.flash('success'),
        additionalCSS: []
    });
};

/**
 * Handle contact form submission
 */
const postContact = async (req, res) => {
    try {
        const { validationResult } = require('express-validator');
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            req.flash('error_msg', 'Please correct the validation errors and try again.');
            return res.render('contact', {
                title: 'Contact Us',
                errors: errors.array(),
                formData: req.body,
                additionalCSS: []
            });
        }

        const {
            firstName,
            lastName,
            email,
            phone,
            subject,
            clubName,
            message,
            newsletter
        } = req.body;

        // Send contact email using the email service
        try {
            const emailService = require('../services/emailService');
            await emailService.sendContactFormEmail({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim().toLowerCase(),
                phone: phone?.trim(),
                subject,
                clubName: clubName?.trim(),
                message: message.trim(),
                newsletter: newsletter === 'on',
                userAgent: req.get('User-Agent'),
                ipAddress: req.ip
            });

            // If user wants newsletter and isn't already subscribed, add them
            if (newsletter === 'on') {
                try {
                    const existingSubscription = await EmailSubscription.findOne({
                        where: { email: email.trim().toLowerCase() }
                    });

                    if (!existingSubscription) {
                        await EmailSubscription.create({
                            email: email.trim().toLowerCase(),
                            subscribedStates: ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'], // Subscribe to all states
                            isActive: true,
                            subscribedAt: new Date(),
                            source: 'contact_form'
                        });
                    }
                } catch (subscriptionError) {
                    console.error('Error adding contact form newsletter subscription:', subscriptionError);
                    // Don't fail the contact form if newsletter subscription fails
                }
            }

            req.flash('success_msg', 'Thank you for contacting us! We\'ll get back to you within 1-2 business days.');
            res.redirect('/contact');

        } catch (emailError) {
            console.error('Error sending contact form email:', emailError);
            req.flash('error_msg', 'Sorry, there was an error sending your message. Please try again or email us directly at support@oldmanfooty.au');
            res.render('contact', {
                title: 'Contact Us',
                formData: req.body,
                additionalCSS: []
            });
        }

    } catch (error) {
        console.error('Error processing contact form:', error);
        req.flash('error_msg', 'An unexpected error occurred. Please try again.');
        res.render('contact', {
            title: 'Contact Us',
            formData: req.body,
            additionalCSS: []
        });
    }
};

module.exports = {
    getIndex,
    getDashboard,
    getAbout,
    postSubscribe,
    getUnsubscribe,
    postUnsubscribe,
    getStats,
    sendNewsletter,
    getContact,
    postContact
};