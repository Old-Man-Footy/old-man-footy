const express = require('express');
const router = express.Router();
const Carnival = require('../models/Carnival');
const EmailSubscription = require('../models/EmailSubscription');
const { body, validationResult } = require('express-validator');

// Home page - Display upcoming carnivals
router.get('/', async (req, res) => {
    try {
        const upcomingCarnivals = await Carnival.find({
            date: { $gte: new Date() },
            isActive: true
        })
        .populate('createdByUserId', 'firstName lastName')
        .sort({ date: 1 })
        .limit(10);

        res.render('index', {
            title: 'NRL Masters - Upcoming Carnivals',
            carnivals: upcomingCarnivals
        });
    } catch (error) {
        console.error('Error fetching carnivals:', error);
        res.render('index', {
            title: 'NRL Masters - Upcoming Carnivals',
            carnivals: []
        });
    }
});

// About page
router.get('/about', (req, res) => {
    res.render('about', {
        title: 'About NRL Masters'
    });
});

// Dashboard for authenticated users
router.get('/dashboard', require('../middleware/auth').ensureAuthenticated, async (req, res) => {
    try {
        const userCarnivals = await Carnival.find({
            createdByUserId: req.user._id,
            isActive: true
        }).sort({ date: 1 });

        res.render('dashboard', {
            title: 'Dashboard',
            carnivals: userCarnivals
        });
    } catch (error) {
        console.error('Error fetching user carnivals:', error);
        res.render('dashboard', {
            title: 'Dashboard',
            carnivals: []
        });
    }
});

// Email subscription
router.post('/subscribe', [
    body('email').isEmail().normalizeEmail(),
    body('states').isArray({ min: 1 }).withMessage('Please select at least one state')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error_msg', 'Please provide a valid email and select at least one state.');
            return res.redirect('/#subscribe');
        }

        const { email, states } = req.body;
        
        // Check if email already exists
        let subscription = await EmailSubscription.findOne({ email });
        
        if (subscription) {
            subscription.stateFilter = states;
            subscription.isActive = true;
            await subscription.save();
            req.flash('success_msg', 'Your subscription preferences have been updated!');
        } else {
            subscription = new EmailSubscription({
                email,
                stateFilter: states
            });
            subscription.generateUnsubscribeToken();
            await subscription.save();
            req.flash('success_msg', 'Successfully subscribed to carnival notifications!');
        }

        res.redirect('/#subscribe');
    } catch (error) {
        console.error('Subscription error:', error);
        req.flash('error_msg', 'An error occurred while processing your subscription.');
        res.redirect('/#subscribe');
    }
});

// Unsubscribe
router.get('/unsubscribe/:token', async (req, res) => {
    try {
        const subscription = await EmailSubscription.findOne({
            unsubscribeToken: req.params.token
        });

        if (!subscription) {
            req.flash('error_msg', 'Invalid unsubscribe link.');
            return res.redirect('/');
        }

        subscription.isActive = false;
        await subscription.save();

        req.flash('success_msg', 'You have been successfully unsubscribed from carnival notifications.');
        res.redirect('/');
    } catch (error) {
        console.error('Unsubscribe error:', error);
        req.flash('error_msg', 'An error occurred while unsubscribing.');
        res.redirect('/');
    }
});

module.exports = router;