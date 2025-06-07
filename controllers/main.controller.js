/**
 * Main Application Controller - MVC Architecture Implementation
 * 
 * Handles homepage, dashboard, and general application logic.
 * Follows strict MVC separation of concerns as outlined in best practices.
 */

const { Carnival, EmailSubscription, User, Club, sequelize } = require('../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const emailService = require('../services/emailService');
const mySidelineService = require('../services/mySidelineService');
const fs = require('fs').promises;
const path = require('path');

/**
 * Display homepage with upcoming carnivals
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showHomepage = async (req, res) => {
    try {
        // Get upcoming carnivals for homepage
        const upcomingCarnivals = await Carnival.findAll({
            where: {
                isActive: true,
                date: { [Op.gte]: new Date() }
            },
            include: [{
                model: User,
                as: 'creator',
                attributes: ['firstName', 'lastName']
            }],
            order: [['date', 'ASC']],
            limit: 6
        });

        // Get carnival statistics for homepage
        const totalCarnivals = await Carnival.count({ 
            where: { isActive: true } 
        });
        const upcomingCount = await Carnival.count({ 
            where: {
                isActive: true, 
                date: { [Op.gte]: new Date() }
            }
        });

        // Get carousel images
        let carouselImages = [];
        try {
            const imagesDir = path.join(__dirname, '../uploads/images');
            const files = await fs.readdir(imagesDir);
            carouselImages = files
                .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
                .map(file => `/uploads/images/${file}`);
        } catch (error) {
            console.log('No carousel images found or unable to read images directory');
        }

        res.render('index', { 
            title: 'Old Man Footy - Carnival Events Directory',
            carnivals: upcomingCarnivals,
            carouselImages,
            stats: {
                totalCarnivals,
                upcomingCount
            }
        });
    } catch (error) {
        console.error('Error loading homepage:', error);
        res.render('index', { 
            title: 'Old Man Footy - Carnival Events Directory',
            carnivals: [],
            carouselImages: [],
            stats: {
                totalCarnivals: 0,
                upcomingCount: 0
            }
        });
    }
};

/**
 * Display user dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showDashboard = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get user's carnivals
        const userCarnivals = await Carnival.findAll({
            where: {
                createdByUserId: userId,
                isActive: true
            },
            order: [['date', 'ASC']]
        });

        // Get total statistics
        const totalCarnivals = await Carnival.count({
            where: { isActive: true }
        });
        
        const upcomingCarnivals = await Carnival.count({
            where: {
                isActive: true,
                date: { [Op.gte]: new Date() }
            }
        });

        res.render('dashboard', {
            title: 'Dashboard',
            carnivals: userCarnivals,
            stats: {
                totalCarnivals,
                upcomingCarnivals,
                userCarnivals: userCarnivals.length
            }
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        req.flash('error_msg', 'Error loading dashboard.');
        res.redirect('/');
    }
};

/**
 * Handle email subscription
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const subscribeEmail = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error_msg', 'Please provide a valid email address and select at least one state.');
            return res.redirect('/#subscribe');
        }

        const { email, states } = req.body;
        const stateList = Array.isArray(states) ? states : [states];

        // Check if subscription already exists
        const existingSubscription = await EmailSubscription.findOne({
            where: { email: email.toLowerCase() }
        });

        if (existingSubscription) {
            // Update existing subscription
            await existingSubscription.update({
                states: stateList,
                isActive: true
            });
            req.flash('success_msg', 'Your subscription has been updated successfully!');
        } else {
            // Create new subscription
            await EmailSubscription.create({
                email: email.toLowerCase(),
                states: stateList,
                isActive: true,
                subscribedDate: new Date()
            });
            req.flash('success_msg', 'Thank you for subscribing! You will receive notifications about new carnivals in your selected states.');
        }

        res.redirect('/#subscribe');
    } catch (error) {
        console.error('Error handling email subscription:', error);
        req.flash('error_msg', 'An error occurred while processing your subscription.');
        res.redirect('/#subscribe');
    }
};

/**
 * Handle email unsubscription
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const unsubscribeEmail = async (req, res) => {
    try {
        const { token } = req.params;
        
        if (!token) {
            req.flash('error_msg', 'Invalid unsubscribe link.');
            return res.redirect('/');
        }

        const subscription = await EmailSubscription.findOne({
            where: { 
                email: Buffer.from(token, 'base64').toString(),
                isActive: true 
            }
        });

        if (!subscription) {
            req.flash('error_msg', 'Subscription not found or already inactive.');
            return res.redirect('/');
        }

        await subscription.update({ isActive: false });
        req.flash('success_msg', 'You have been successfully unsubscribed from email notifications.');
        res.redirect('/');
    } catch (error) {
        console.error('Error unsubscribing:', error);
        req.flash('error_msg', 'An error occurred while unsubscribing.');
        res.redirect('/');
    }
};

/**
 * Display about page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showAbout = (req, res) => {
    res.render('about', {
        title: 'About Old Man Footy'
    });
};

/**
 * Display admin statistics (admin/primary delegate only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showAdminStats = async (req, res) => {
    try {
        // Check if user has admin privileges
        if (!req.user.isPrimaryDelegate && !req.user.isAdmin) {
            req.flash('error_msg', 'Access denied. Admin privileges required.');
            return res.redirect('/dashboard');
        }

        // Get comprehensive statistics
        const totalCarnivals = await Carnival.count({
            where: { isActive: true }
        });

        const upcomingCarnivals = await Carnival.count({
            where: {
                isActive: true,
                date: { [Op.gte]: new Date() }
            }
        });

        const mySidelineCarnivals = await Carnival.count({
            where: {
                isActive: true,
                mySidelineEventId: { [Op.ne]: null }
            }
        });

        const manualCarnivals = await Carnival.count({
            where: {
                isActive: true,
                isManuallyEntered: true
            }
        });

        const totalUsers = await User.count({
            where: { isActive: true }
        });

        const clubDelegates = await User.count({
            where: {
                isActive: true,
                clubId: { [Op.ne]: null }
            }
        });

        const emailSubscriptions = await EmailSubscription.count({
            where: { isActive: true }
        });

        // Carnivals by state
        const carnivalsByState = await Carnival.findAll({
            where: { isActive: true },
            attributes: [
                'state',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['state'],
            order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
        });

        // Recent activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentCarnivals = await Carnival.count({
            where: {
                isActive: true,
                createdAt: { [Op.gte]: thirtyDaysAgo }
            }
        });

        const recentSubscriptions = await EmailSubscription.count({
            where: {
                isActive: true,
                subscribedDate: { [Op.gte]: thirtyDaysAgo }
            }
        });

        res.render('admin/stats', {
            title: 'System Statistics',
            stats: {
                totalCarnivals,
                upcomingCarnivals,
                mySidelineCarnivals,
                manualCarnivals,
                totalUsers,
                clubDelegates,
                emailSubscriptions,
                carnivalsByState,
                recentCarnivals,
                recentSubscriptions
            }
        });

    } catch (error) {
        console.error('Error loading admin statistics:', error);
        req.flash('error_msg', 'Error loading statistics.');
        res.redirect('/dashboard');
    }
};

/**
 * Get carousel images from uploads/images folder
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCarouselImages = async (req, res) => {
    try {
        const imagesDir = path.join(__dirname, '../uploads/images');
        const files = await fs.readdir(imagesDir);

        // Filter and map image files
        const images = files
            .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
            .map(file => `/uploads/images/${file}`);

        res.json(images);
    } catch (error) {
        console.error('Error fetching carousel images:', error);
        res.status(500).json({ error: 'Failed to load images' });
    }
};

module.exports = {
    showHomepage,
    showDashboard,
    subscribeEmail,
    unsubscribeEmail,
    showAbout,
    showAdminStats,
    getCarouselImages
};