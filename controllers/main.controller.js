/**
 * Main Application Controller - MVC Architecture Implementation
 * 
 * Handles homepage, dashboard, and general application logic.
 * Follows strict MVC separation of concerns as outlined in best practices.
 */

const { Carnival, Club, User, EmailSubscription } = require('../models');
const { Op } = require('sequelize');
const emailService = require('../services/emailService');
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
            limit: 5
        });

        res.render('index', { 
            title: 'Old Man Footy',
            upcomingCarnivals
        });
    } catch (error) {
        console.error('Error loading homepage:', error);
        res.render('index', { 
            title: 'Old Man Footy',
            upcomingCarnivals: []
        });
    }
};

/**
 * Display user dashboard
 */
const getDashboard = async (req, res) => {
    try {
        // Get user's carnivals
        const userCarnivals = await Carnival.findAll({
            where: { 
                creatorId: req.user.id,
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
            limit: 5
        });

        res.render('dashboard', {
            title: 'Dashboard',
            user: req.user,
            userCarnivals,
            upcomingCarnivals
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.render('dashboard', {
            title: 'Dashboard',
            user: req.user,
            userCarnivals: [],
            upcomingCarnivals: []
        });
    }
};

/**
 * Display about page
 */
const getAbout = (req, res) => {
    res.render('about', { title: 'About Old Man Footy' });
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
                error: null
            });
        }

        res.render('unsubscribe', {
            title: 'Unsubscribe',
            email: subscription.email
        });
    } catch (error) {
        console.error('Error unsubscribing:', error);
        res.status(400).render('error', {
            title: 'Invalid Link', 
            message: 'This unsubscribe link is invalid or has expired.',
            error: null
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
            message: 'You have been successfully unsubscribed from our newsletter.'
        });
    } catch (error) {
        console.error('Error unsubscribing:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Unable to process unsubscribe request.'
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
            stats
        });
    } catch (error) {
        console.error('Error loading admin statistics:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Unable to load statistics'
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

module.exports = {
    getIndex,
    getDashboard,
    getAbout,
    postSubscribe,
    getUnsubscribe,
    postUnsubscribe,
    getStats,
    sendNewsletter
};