const express = require('express');
const router = express.Router();
const { Carnival, EmailSubscription, User, Club, sequelize } = require('../models');
const { ensureAuthenticated } = require('../middleware/auth');
const emailService = require('../services/emailService');
const mySidelineService = require('../services/mySidelineService');
const { Op } = require('sequelize');

// Home page - Display upcoming carnivals
router.get('/', async (req, res) => {
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

        res.render('index', { 
            title: 'Rugby League Masters - Carnival Events Directory',
            upcomingCarnivals,
            stats: {
                totalCarnivals,
                upcomingCount
            }
        });
    } catch (error) {
        console.error('Error loading homepage:', error);
        res.render('index', { 
            title: 'Rugby League Masters - Carnival Events Directory',
            upcomingCarnivals: [],
            stats: {
                totalCarnivals: 0,
                upcomingCount: 0
            }
        });
    }
});

// Enhanced Dashboard for authenticated users
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
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

        // Get unclaimed MySideline events if user is a club delegate
        let unclaimedEvents = [];
        if (req.user.clubId) {
            unclaimedEvents = await Carnival.findAll({
                where: {
                    isActive: true,
                    mySidelineEventId: { [Op.ne]: null },
                    createdByUserId: null,
                    date: { [Op.gte]: new Date() }
                },
                order: [['date', 'ASC']],
                limit: 5
            });
        }

        // Get recent activity statistics
        const recentStats = {
            totalUserCarnivals: userCarnivals.length,
            upcomingUserCarnivals: userCarnivals.filter(c => new Date(c.date) >= new Date()).length,
            unclaimedEventsCount: unclaimedEvents.length
        };

        res.render('dashboard', {
            title: 'Dashboard',
            user: req.user,
            userCarnivals,
            unclaimedEvents,
            stats: recentStats
        });

    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.render('dashboard', {
            title: 'Dashboard',
            user: req.user,
            userCarnivals: [],
            unclaimedEvents: [],
            stats: {
                totalUserCarnivals: 0,
                upcomingUserCarnivals: 0,
                unclaimedEventsCount: 0
            }
        });
    }
});

// About page
router.get('/about', (req, res) => {
    res.render('about', {
        title: 'About Rugby League Masters'
    });
});

// Newsletter subscription
router.post('/subscribe', async (req, res) => {
    try {
        const { email, firstName, lastName, stateFilter } = req.body;

        // Validate required fields
        if (!email || !firstName || !lastName) {
            req.flash('error_msg', 'Please provide all required information.');
            return res.redirect('/#newsletter');
        }

        // Check if email already exists
        const existingSubscription = await EmailSubscription.findOne({ 
            where: { 
                email: email.toLowerCase(),
                isActive: true 
            }
        });

        if (existingSubscription) {
            req.flash('error_msg', 'You are already subscribed to our newsletter.');
            return res.redirect('/#newsletter');
        }

        // Create new subscription
        const subscription = await EmailSubscription.create({
            email: email.toLowerCase(),
            firstName,
            lastName,
            stateFilter: stateFilter || [],
            isActive: true,
            subscribedDate: new Date()
        });

        // Send welcome email
        try {
            await emailService.sendWelcomeEmail(subscription);
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Don't fail the subscription if email fails
        }

        req.flash('success_msg', 'Successfully subscribed to the newsletter!');
        res.redirect('/#newsletter');

    } catch (error) {
        console.error('Error subscribing to newsletter:', error);
        req.flash('error_msg', 'An error occurred while subscribing. Please try again.');
        res.redirect('/#newsletter');
    }
});

// Unsubscribe from newsletter
router.get('/unsubscribe/:token', async (req, res) => {
    try {
        const subscription = await EmailSubscription.findOne({
            where: {
                unsubscribeToken: req.params.token,
                isActive: true
            }
        });

        if (!subscription) {
            req.flash('error_msg', 'Invalid unsubscribe link.');
            return res.redirect('/');
        }

        await subscription.update({ isActive: false });

        req.flash('success_msg', 'You have been successfully unsubscribed from our newsletter.');
        res.redirect('/');

    } catch (error) {
        console.error('Error unsubscribing:', error);
        req.flash('error_msg', 'An error occurred while unsubscribing.');
        res.redirect('/');
    }
});

// MySideline webhook endpoint
router.post('/webhook/mysideline', async (req, res) => {
    try {
        console.log('MySideline webhook received:', req.body);
        
        // Process the webhook data
        const result = await mySidelineService.processWebhook(req.body);
        
        if (result.success) {
            res.status(200).json({ message: 'Webhook processed successfully' });
        } else {
            res.status(400).json({ error: result.error });
        }

    } catch (error) {
        console.error('Error processing MySideline webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint for carnival search (for AJAX requests)
router.get('/api/carnivals/search', async (req, res) => {
    try {
        const { q, state, limit = 10 } = req.query;
        
        let whereClause = { isActive: true };
        
        if (state && state !== 'all') {
            whereClause.state = state;
        }
        
        if (q) {
            whereClause[Op.or] = [
                { title: { [Op.iLike]: `%${q}%` } },
                { locationAddress: { [Op.iLike]: `%${q}%` } },
                { organiserContactName: { [Op.iLike]: `%${q}%` } }
            ];
        }

        const carnivals = await Carnival.findAll({
            where: whereClause,
            attributes: ['id', 'title', 'date', 'locationAddress', 'state'],
            order: [['date', 'ASC']],
            limit: parseInt(limit)
        });

        res.json(carnivals);

    } catch (error) {
        console.error('Error searching carnivals:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin statistics page (Primary delegates only)
router.get('/admin/stats', ensureAuthenticated, async (req, res) => {
    try {
        // Check if user is primary delegate
        if (!req.user.isPrimaryDelegate) {
            req.flash('error_msg', 'Access denied. Only primary delegates can view statistics.');
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

        // Get carnivals by state using raw query for aggregation
        const carnivalsByState = await Carnival.findAll({
            where: { isActive: true },
            attributes: [
                'state',
                [sequelize.fn('COUNT', sequelize.col('state')), 'count']
            ],
            group: ['state'],
            order: [['state', 'ASC']],
            raw: true
        });

        // Get recent activity (last 30 days)
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
});

module.exports = router;