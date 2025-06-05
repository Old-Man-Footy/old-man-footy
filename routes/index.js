const express = require('express');
const router = express.Router();
const Carnival = require('../models/Carnival');
const EmailSubscription = require('../models/EmailSubscription');
const User = require('../models/User');
const { ensureAuthenticated } = require('../middleware/auth');
const emailService = require('../services/emailService');
const mySidelineService = require('../services/mySidelineService');

// Home page - Display upcoming carnivals
router.get('/', async (req, res) => {
    try {
        // Get upcoming carnivals for homepage
        const upcomingCarnivals = await Carnival.find({
            isActive: true,
            date: { $gte: new Date() }
        })
        .populate('createdByUserId', 'firstName lastName')
        .sort({ date: 1 })
        .limit(6);

        // Get carnival statistics for homepage
        const totalCarnivals = await Carnival.countDocuments({ isActive: true });
        const upcomingCount = await Carnival.countDocuments({ 
            isActive: true, 
            date: { $gte: new Date() } 
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
        const userId = req.user._id;
        
        // Get user's carnivals
        const userCarnivals = await Carnival.find({
            createdByUserId: userId,
            isActive: true
        }).sort({ date: 1 });

        // Get unclaimed MySideline events if user is a club delegate
        let unclaimedEvents = [];
        if (req.user.clubId) {
            unclaimedEvents = await Carnival.find({
                mySidelineEventId: { $exists: true, $ne: null },
                createdByUserId: { $exists: false },
                isActive: true,
                date: { $gte: new Date() }
            }).sort({ date: 1 }).limit(10);
        }

        // Get MySideline sync status for primary delegates
        let mySidelineStatus = null;
        if (req.user.isPrimaryDelegate) {
            mySidelineStatus = mySidelineService.getSyncStatus();
        }

        // Get email subscription statistics for primary delegates
        let emailStats = null;
        if (req.user.isPrimaryDelegate) {
            emailStats = await EmailSubscription.aggregate([
                { $match: { isActive: true } },
                { $group: { _id: '$state', count: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ]);
        }

        // Categorize user's carnivals
        const today = new Date();
        const categorizedCarnivals = {
            upcoming: userCarnivals.filter(c => new Date(c.date) >= today),
            past: userCarnivals.filter(c => new Date(c.date) < today)
        };

        res.render('dashboard', {
            title: 'Dashboard',
            userCarnivals: categorizedCarnivals,
            unclaimedEvents,
            mySidelineStatus,
            emailStats,
            user: req.user
        });

    } catch (error) {
        console.error('Error loading dashboard:', error);
        req.flash('error_msg', 'Error loading dashboard data.');
        res.render('dashboard', {
            title: 'Dashboard',
            userCarnivals: { upcoming: [], past: [] },
            unclaimedEvents: [],
            mySidelineStatus: null,
            emailStats: null,
            user: req.user
        });
    }
});

// About page
router.get('/about', (req, res) => {
    res.render('about', { title: 'About Rugby League Masters' });
});

// Email subscription
router.post('/subscribe', async (req, res) => {
    try {
        const { email, state } = req.body;

        if (!email || !state) {
            req.flash('error_msg', 'Email and state are required.');
            return res.redirect('/');
        }

        // Validate state
        const validStates = ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'];
        if (!validStates.includes(state)) {
            req.flash('error_msg', 'Please select a valid state.');
            return res.redirect('/');
        }

        // Check if already subscribed
        const existingSubscription = await EmailSubscription.findOne({ email, state });
        
        if (existingSubscription) {
            if (existingSubscription.isActive) {
                req.flash('info_msg', 'You are already subscribed to notifications for this state.');
            } else {
                // Reactivate subscription
                existingSubscription.isActive = true;
                existingSubscription.subscribedAt = new Date();
                await existingSubscription.save();
                
                // Send welcome email
                try {
                    await emailService.sendWelcomeEmail(email, state);
                } catch (emailError) {
                    console.error('Failed to send welcome email:', emailError);
                }
                
                req.flash('success_msg', 'Your subscription has been reactivated! You will receive notifications about new carnivals.');
            }
            return res.redirect('/');
        }

        // Create new subscription
        const subscription = new EmailSubscription({
            email,
            state,
            unsubscribeToken: require('crypto').randomBytes(32).toString('hex')
        });

        await subscription.save();

        // Send welcome email
        try {
            await emailService.sendWelcomeEmail(email, state);
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Don't fail the subscription if email fails
        }

        req.flash('success_msg', 'Successfully subscribed! You will receive email notifications about new carnivals.');
        res.redirect('/');

    } catch (error) {
        console.error('Error subscribing to email notifications:', error);
        req.flash('error_msg', 'An error occurred while subscribing. Please try again.');
        res.redirect('/');
    }
});

// Unsubscribe from email notifications
router.get('/unsubscribe', async (req, res) => {
    try {
        const { token, email } = req.query;

        let subscription;
        if (token) {
            subscription = await EmailSubscription.findOne({ unsubscribeToken: token });
        } else if (email) {
            subscription = await EmailSubscription.findOne({ email });
        }

        if (!subscription) {
            req.flash('error_msg', 'Invalid unsubscribe link.');
            return res.redirect('/');
        }

        subscription.isActive = false;
        subscription.unsubscribedAt = new Date();
        await subscription.save();

        req.flash('success_msg', 'You have been successfully unsubscribed from email notifications.');
        res.redirect('/');

    } catch (error) {
        console.error('Error unsubscribing from email notifications:', error);
        req.flash('error_msg', 'An error occurred while unsubscribing. Please try again.');
        res.redirect('/');
    }
});

// Admin routes for primary delegates
router.get('/admin/stats', ensureAuthenticated, async (req, res) => {
    try {
        if (!req.user.isPrimaryDelegate) {
            req.flash('error_msg', 'Access denied. Primary delegates only.');
            return res.redirect('/dashboard');
        }

        // Get comprehensive statistics
        const totalCarnivals = await Carnival.countDocuments({ isActive: true });
        const upcomingCarnivals = await Carnival.countDocuments({ 
            isActive: true, 
            date: { $gte: new Date() } 
        });
        const mySidelineCarnivals = await Carnival.countDocuments({ 
            isActive: true,
            mySidelineEventId: { $exists: true, $ne: null }
        });
        const manualCarnivals = await Carnival.countDocuments({ 
            isActive: true,
            isManuallyEntered: true 
        });

        const totalUsers = await User.countDocuments({ isActive: true });
        const clubDelegates = await User.countDocuments({ 
            isActive: true, 
            clubId: { $exists: true, $ne: null } 
        });

        const emailSubscriptions = await EmailSubscription.countDocuments({ isActive: true });

        // Get carnivals by state
        const carnivalsByState = await Carnival.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$state', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        // Get email subscriptions by state
        const subscriptionsByState = await EmailSubscription.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$state', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        res.render('admin/stats', {
            title: 'Admin Statistics',
            stats: {
                totalCarnivals,
                upcomingCarnivals,
                mySidelineCarnivals,
                manualCarnivals,
                totalUsers,
                clubDelegates,
                emailSubscriptions,
                carnivalsByState,
                subscriptionsByState
            }
        });

    } catch (error) {
        console.error('Error loading admin stats:', error);
        req.flash('error_msg', 'Error loading statistics.');
        res.redirect('/dashboard');
    }
});

module.exports = router;