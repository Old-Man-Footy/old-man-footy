const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Carnival = require('../models/Carnival');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const { ensureAuthenticated } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit for draw files
    },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'drawFile') {
            // Allow documents and images for draw files
            const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
            const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
            const mimetype = /image|pdf|application\/msword|application\/vnd.openxmlformats-officedocument.wordprocessingml.document/.test(file.mimetype);
            
            if (mimetype && extname) {
                return cb(null, true);
            } else {
                cb(new Error('Draw files must be images, PDF, or Word documents'));
            }
        } else {
            // Image files only for club logo and promotional images
            const allowedTypes = /jpeg|jpg|png|gif/;
            const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
            const mimetype = allowedTypes.test(file.mimetype);

            if (mimetype && extname) {
                return cb(null, true);
            } else {
                cb(new Error('Only image files are allowed'));
            }
        }
    }
});

// List all carnivals with filtering
router.get('/', async (req, res) => {
    try {
        const { state, search, upcoming } = req.query;
        let filter = { isActive: true };

        // State filter
        if (state && state !== 'all') {
            filter.state = state;
        }

        // Date filter
        if (upcoming === 'true') {
            filter.date = { $gte: new Date() };
        }

        // Search filter
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { locationAddress: { $regex: search, $options: 'i' } },
                { organiserContactName: { $regex: search, $options: 'i' } }
            ];
        }

        const carnivals = await Carnival.find(filter)
            .populate('createdByUserId', 'firstName lastName')
            .sort({ date: 1 });

        const states = ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'];

        res.render('carnivals/list', {
            title: 'All Carnivals',
            carnivals,
            states,
            currentFilters: { state, search, upcoming }
        });
    } catch (error) {
        console.error('Error fetching carnivals:', error);
        res.render('carnivals/list', {
            title: 'All Carnivals',
            carnivals: [],
            states: ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'],
            currentFilters: {}
        });
    }
});

// Show individual carnival
router.get('/:id', async (req, res) => {
    try {
        const carnival = await Carnival.findById(req.params.id)
            .populate('createdByUserId', 'firstName lastName clubId')
            .populate({
                path: 'createdByUserId',
                populate: {
                    path: 'clubId',
                    model: 'Club'
                }
            });

        if (!carnival || !carnival.isActive) {
            req.flash('error_msg', 'Carnival not found.');
            return res.redirect('/carnivals');
        }

        res.render('carnivals/show', {
            title: carnival.title,
            carnival
        });
    } catch (error) {
        console.error('Error fetching carnival:', error);
        req.flash('error_msg', 'Error loading carnival details.');
        res.redirect('/carnivals');
    }
});

// Create carnival form
router.get('/new', ensureAuthenticated, (req, res) => {
    const states = ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'];
    res.render('carnivals/new', {
        title: 'Add New Carnival',
        states
    });
});

// Create carnival POST
router.post('/new', ensureAuthenticated, upload.fields([
    { name: 'clubLogo', maxCount: 1 },
    { name: 'promotionalImage', maxCount: 1 },
    { name: 'drawFile', maxCount: 1 }
]), [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
    body('locationAddress').trim().notEmpty().withMessage('Location address is required'),
    body('organiserContactName').trim().notEmpty().withMessage('Organiser contact name is required'),
    body('organiserContactEmail').isEmail().withMessage('Valid organiser email is required'),
    body('organiserContactPhone').trim().notEmpty().withMessage('Organiser phone is required'),
    body('scheduleDetails').trim().notEmpty().withMessage('Schedule details are required'),
    body('state').isIn(['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT']).withMessage('Valid state is required'),
    body('socialMediaFacebook').optional().isURL().withMessage('Facebook URL must be valid'),
    body('socialMediaInstagram').optional().isURL().withMessage('Instagram URL must be valid'),
    body('socialMediaTwitter').optional().isURL().withMessage('Twitter URL must be valid'),
    body('socialMediaWebsite').optional().isURL().withMessage('Website URL must be valid')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const states = ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'];
            return res.render('carnivals/new', {
                title: 'Add New Carnival',
                states,
                errors: errors.array(),
                formData: req.body
            });
        }

        const carnivalData = {
            title: req.body.title,
            date: new Date(req.body.date),
            locationAddress: req.body.locationAddress,
            organiserContactName: req.body.organiserContactName,
            organiserContactEmail: req.body.organiserContactEmail,
            organiserContactPhone: req.body.organiserContactPhone,
            scheduleDetails: req.body.scheduleDetails,
            registrationLink: req.body.registrationLink || '',
            feesDescription: req.body.feesDescription || '',
            callForVolunteers: req.body.callForVolunteers || '',
            state: req.body.state,
            createdByUserId: req.user._id,
            // Social media links
            socialMediaFacebook: req.body.socialMediaFacebook || '',
            socialMediaInstagram: req.body.socialMediaInstagram || '',
            socialMediaTwitter: req.body.socialMediaTwitter || '',
            socialMediaWebsite: req.body.socialMediaWebsite || ''
        };

        // Handle file uploads
        if (req.files.clubLogo) {
            carnivalData.clubLogoURL = '/uploads/' + req.files.clubLogo[0].filename;
        }
        if (req.files.promotionalImage) {
            carnivalData.promotionalImageURL = '/uploads/' + req.files.promotionalImage[0].filename;
        }
        if (req.files.drawFile) {
            carnivalData.drawFileURL = '/uploads/' + req.files.drawFile[0].filename;
            carnivalData.drawFileName = req.files.drawFile[0].originalname;
        }

        const carnival = new Carnival(carnivalData);
        await carnival.save();

        req.flash('success_msg', 'Carnival created successfully!');
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Error creating carnival:', error);
        const states = ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'];
        res.render('carnivals/new', {
            title: 'Add New Carnival',
            states,
            errors: [{ msg: 'An error occurred while creating the carnival.' }],
            formData: req.body
        });
    }
});

// Edit carnival form
router.get('/:id/edit', ensureAuthenticated, async (req, res) => {
    try {
        const carnival = await Carnival.findById(req.params.id);

        if (!carnival) {
            req.flash('error_msg', 'Carnival not found.');
            return res.redirect('/dashboard');
        }

        // Check if user owns this carnival
        if (carnival.createdByUserId.toString() !== req.user._id.toString()) {
            req.flash('error_msg', 'You can only edit your own carnivals.');
            return res.redirect('/dashboard');
        }

        const states = ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'];
        res.render('carnivals/edit', {
            title: 'Edit Carnival',
            carnival,
            states
        });
    } catch (error) {
        console.error('Error fetching carnival for edit:', error);
        req.flash('error_msg', 'Error loading carnival for editing.');
        res.redirect('/dashboard');
    }
});

// Update carnival POST
router.post('/:id/edit', ensureAuthenticated, upload.fields([
    { name: 'clubLogo', maxCount: 1 },
    { name: 'promotionalImage', maxCount: 1 },
    { name: 'drawFile', maxCount: 1 }
]), [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
    body('locationAddress').trim().notEmpty().withMessage('Location address is required'),
    body('organiserContactName').trim().notEmpty().withMessage('Organiser contact name is required'),
    body('organiserContactEmail').isEmail().withMessage('Valid organiser email is required'),
    body('organiserContactPhone').trim().notEmpty().withMessage('Organiser phone is required'),
    body('scheduleDetails').trim().notEmpty().withMessage('Schedule details are required'),
    body('state').isIn(['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT']).withMessage('Valid state is required'),
    body('socialMediaFacebook').optional().isURL().withMessage('Facebook URL must be valid'),
    body('socialMediaInstagram').optional().isURL().withMessage('Instagram URL must be valid'),
    body('socialMediaTwitter').optional().isURL().withMessage('Twitter URL must be valid'),
    body('socialMediaWebsite').optional().isURL().withMessage('Website URL must be valid')
], async (req, res) => {
    try {
        const carnival = await Carnival.findById(req.params.id);

        if (!carnival) {
            req.flash('error_msg', 'Carnival not found.');
            return res.redirect('/dashboard');
        }

        // Check if user owns this carnival
        if (carnival.createdByUserId.toString() !== req.user._id.toString()) {
            req.flash('error_msg', 'You can only edit your own carnivals.');
            return res.redirect('/dashboard');
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const states = ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'];
            return res.render('carnivals/edit', {
                title: 'Edit Carnival',
                carnival,
                states,
                errors: errors.array()
            });
        }

        // Update carnival data
        carnival.title = req.body.title;
        carnival.date = new Date(req.body.date);
        carnival.locationAddress = req.body.locationAddress;
        carnival.organiserContactName = req.body.organiserContactName;
        carnival.organiserContactEmail = req.body.organiserContactEmail;
        carnival.organiserContactPhone = req.body.organiserContactPhone;
        carnival.scheduleDetails = req.body.scheduleDetails;
        carnival.registrationLink = req.body.registrationLink || '';
        carnival.feesDescription = req.body.feesDescription || '';
        carnival.callForVolunteers = req.body.callForVolunteers || '';
        carnival.state = req.body.state;
        
        // Update social media links
        carnival.socialMediaFacebook = req.body.socialMediaFacebook || '';
        carnival.socialMediaInstagram = req.body.socialMediaInstagram || '';
        carnival.socialMediaTwitter = req.body.socialMediaTwitter || '';
        carnival.socialMediaWebsite = req.body.socialMediaWebsite || '';

        // Handle file uploads
        if (req.files.clubLogo) {
            carnival.clubLogoURL = '/uploads/' + req.files.clubLogo[0].filename;
        }
        if (req.files.promotionalImage) {
            carnival.promotionalImageURL = '/uploads/' + req.files.promotionalImage[0].filename;
        }
        if (req.files.drawFile) {
            carnival.drawFileURL = '/uploads/' + req.files.drawFile[0].filename;
            carnival.drawFileName = req.files.drawFile[0].originalname;
        }

        await carnival.save();

        req.flash('success_msg', 'Carnival updated successfully!');
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Error updating carnival:', error);
        req.flash('error_msg', 'An error occurred while updating the carnival.');
        res.redirect('/dashboard');
    }
});

// Delete carnival
router.post('/:id/delete', ensureAuthenticated, async (req, res) => {
    try {
        const carnival = await Carnival.findById(req.params.id);

        if (!carnival) {
            req.flash('error_msg', 'Carnival not found.');
            return res.redirect('/dashboard');
        }

        // Check if user owns this carnival
        if (carnival.createdByUserId.toString() !== req.user._id.toString()) {
            req.flash('error_msg', 'You can only delete your own carnivals.');
            return res.redirect('/dashboard');
        }

        // Soft delete - mark as inactive
        carnival.isActive = false;
        await carnival.save();

        req.flash('success_msg', 'Carnival deleted successfully.');
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Error deleting carnival:', error);
        req.flash('error_msg', 'An error occurred while deleting the carnival.');
        res.redirect('/dashboard');
    }
});

// Take ownership of MySideline event
router.post('/:id/take-ownership', ensureAuthenticated, async (req, res) => {
    try {
        const carnival = await Carnival.findById(req.params.id);

        if (!carnival) {
            req.flash('error_msg', 'Carnival not found.');
            return res.redirect('/carnivals');
        }

        // Check if the carnival is an automatically imported MySideline event
        if (carnival.isManuallyEntered || !carnival.mySidelineEventId) {
            req.flash('error_msg', 'This carnival is not an automatically imported MySideline event.');
            return res.redirect('/carnivals');
        }

        // Check if user is a club delegate (has a clubId)
        if (!req.user.clubId) {
            req.flash('error_msg', 'Only club delegates can take ownership of events.');
            return res.redirect('/carnivals');
        }

        // Check if carnival already has an owner
        if (carnival.createdByUserId) {
            req.flash('error_msg', 'This event has already been claimed by another club.');
            return res.redirect('/carnivals');
        }

        // Update the carnival to be owned by the current user's club
        carnival.createdByUserId = req.user._id;
        carnival.isManuallyEntered = true; // Mark as manually managed now
        carnival.claimedAt = new Date();
        
        await carnival.save();

        req.flash('success_msg', 'You have successfully taken ownership of this event!');
        res.redirect(`/carnivals/${carnival._id}`);

    } catch (error) {
        console.error('Error taking ownership of carnival:', error);
        req.flash('error_msg', 'An error occurred while taking ownership of the event.');
        res.redirect('/carnivals');
    }
});

module.exports = router;