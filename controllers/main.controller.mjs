/**
 * Main Application Controller - MVC Architecture Implementation
 *
 * Handles homepage, dashboard, and general application logic.
 * Follows strict MVC separation of concerns as outlined in best practices.
 */

import {
  Carnival,
  Club,
  User,
  EmailSubscription,
  ClubPlayer,
  CarnivalClub,
} from '../models/index.mjs';
import { Op } from 'sequelize';
import { validationResult } from 'express-validator';
import ContactEmailService from '../services/email/ContactEmailService.mjs';
import AuthEmailService from '../services/email/AuthEmailService.mjs';
import carouselImageService from '../services/carouselImageService.mjs';
import { AUSTRALIAN_STATES } from '../config/constants.mjs';
import crypto from 'crypto';
import asyncHandler from '../middleware/asyncHandler.mjs';

/**
 * Display homepage with upcoming carnivals
 * Ensures only one response is sent and prevents ERR_HTTP_HEADERS_SENT.
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export const getIndex = asyncHandler(async (req, res) => {
  // Get all upcoming carnivals for homepage display
  // First, try to get 4 carnivals with confirmed dates
  let upcomingCarnivals = await Carnival.findAll({
    where: {
      isActive: true,
      date: { [Op.gte]: new Date() }
    },
    order: [['date', 'ASC']],
    limit: 4,
    include: [
      { model: User, as:'creator', attributes: ['firstName', 'lastName'] }
    ]
  });

  // If we don't have 4 carnivals with dates, fill remainder with undated carnivals
  if (upcomingCarnivals.length < 4) {
    const undatedCarnivals = await Carnival.findAll({
      where: {
        isActive: true,
        date: null
      },
      order: [['createdAt', 'DESC']], // Show most recently created undated carnivals first
      limit: 4 - upcomingCarnivals.length,
      include: [
        { model: User, as:'creator', attributes: ['firstName', 'lastName'] }
      ]
    });
    
    upcomingCarnivals = [...upcomingCarnivals, ...undatedCarnivals];
  }

  // Get statistics for the stats runner
  const stats = {
    totalCarnivals: await Carnival.count({ where: { isActive: true } }),
    upcomingCount: await Carnival.count({
      where: {
        isActive: true,
        [Op.or]: [
          { date: { [Op.gte]: new Date() } },
          { date: null }
        ]
      }
    }),
    clubsCount: await Club.count({
      where: {
        isActive: true,
        isPubliclyListed: true,
      },
    }),
  };

  // Get carousel images for the homepage
  const carouselImages = await carouselImageService.getCarouselImages(8);

  return res.render('index', {
    title: 'Old Man Footy',
    user: req.user || null, // Add user variable for template
    upcomingCarnivals,
    carnivals: upcomingCarnivals, // Also provide as 'carnivals' for template compatibility
    stats,
    carouselImages,
    AUSTRALIAN_STATES,
    additionalCSS: [],
  });
});

/**
 * Display user dashboard
 */
export const getDashboard = asyncHandler(async (req, res) => {
  // Load user with full club information
  const userWithClub = await User.findByPk(req.user.id, {
    include: [
      {
        model: Club,
        as: 'club',
        attributes: [
          'id',
          'clubName',
          'state',
          'location',
          'isActive',
          'isPubliclyListed',
          'logoUrl',
        ],
      },
    ],
  });

  // Get user's carnivals (carnivals they've created)
  const userCarnivals = await Carnival.findAll({
    where: {
      createdByUserId: userWithClub.id,
      isActive: true
    },
    order: [['date', 'DESC']],
    limit: 5
  });

  // Get player count for user's club
  let playerCount = 0;
  if (userWithClub.clubId) {
    playerCount = await ClubPlayer.count({
      where: {
        clubId: userWithClub.clubId,
        isActive: true,
      },
    });
  }

  // Get carnivals the user's club is registered to attend (both upcoming and past)
  let attendingCarnivals = [];
  if (userWithClub.clubId) {
    const carnivalRegistrations = await CarnivalClub.findAll({
      where: {
        clubId: userWithClub.clubId,
        isActive: true,
      },
      include: [
        {
          model: Carnival,
          as: 'carnival',
          where: { isActive: true }, // Only show active carnivals (not deleted ones)
          include: [
            {
              model: User,
              as: 'creator',
              attributes: ['firstName', 'lastName', 'email'],
            },
          ],
        },
      ],
      order: [['carnival', 'date', 'DESC']], // Show most recent first
    });

    // Extract carnival data from the CarnivalClub relationship
    attendingCarnivals = carnivalRegistrations.map((registration) => ({
      ...registration.carnival.toJSON(),
      registration: {
        id: registration.id,
        playerCount: registration.playerCount,
        teamName: registration.teamName,
        isPaid: registration.isPaid,
        registrationDate: registration.registrationDate,
      },
    }));
  }

  // Get upcoming carnivals for dashboard display
  const dashboardUpcomingCarnivals = await Carnival.findAll({
    where: {
      isActive: true,
      [Op.or]: [
        { date: { [Op.gte]: new Date() } },
        { date: null }
      ]
    },
    order: [['date', 'ASC']],
    limit: 5,
    include: [
      { model: User, as: 'creator', attributes: ['firstName', 'lastName'] }
    ]
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
        id: { [Op.ne]: userWithClub.id }, // Exclude current user
      },
      attributes: ['id', 'firstName', 'lastName', 'email'],
      order: [
        ['firstName', 'ASC'],
        ['lastName', 'ASC'],
      ],
    });
  }

  // Get user's email subscription status
  let emailSubscription = null;
  try {
    emailSubscription = await EmailSubscription.findOne({
      where: { email: userWithClub.email }
    });
  } catch (error) {
    console.error('Error fetching email subscription:', error);
    // Continue without subscription data
  }

  // Update the user object to include club information for template
  const enrichedUser = {
    ...userWithClub.toJSON(),
    clubId: userWithClub.club, // This provides clubId.clubName for the template
  };

  return res.render('dashboard', {
    title: 'Dashboard',
    user: enrichedUser,
    userCarnivals,
    attendingCarnivals, // New: carnivals the user's club is attending
    upcomingCarnivals: dashboardUpcomingCarnivals,
    clubs, // Add clubs variable for the dashboard checklist
    carnivals: userCarnivals, // Add carnivals variable as alias for userCarnivals
    eligibleDelegates,
    playerCount, // New: player count for user's club
    emailSubscription, // New: user's email subscription status
    AUSTRALIAN_STATES, // New: available states for subscription management
    additionalCSS: [],
  });
});

/**
 * Display about page
 */
export const getAbout = (_req, res) => {
  return res.render('about', {
    title: 'About Old Man Footy',
    additionalCSS: [],
  });
};

/**
 * Handle email subscription with bot protection
 * Following MVC pattern - returns JSON responses for AJAX requests
 */
export const postSubscribe = async (req, res) => {
    try {
        // Detect if this is an AJAX request
        const isAjax = req.xhr || 
                       req.headers?.accept?.includes('application/json') || 
                       req.headers?.['x-requested-with']?.toLowerCase() === 'xmlhttprequest';
        
        // Add defensive check for req.body
        if (!req.body) {
            console.error('Subscription error: req.body is undefined');
            if (isAjax) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid request data'
                });
            } else {
                req.flash('error', 'Invalid request data');
                return res.redirect('/#newsletter');
            }
        }

        // Extract form data with proper handling for multiple state values
        const { email, website, form_timestamp } = req.body;
        
        // Handle states separately to ensure we get all values when multiple checkboxes are selected
        let states = req.body.state; // This could be a string (single) or array (multiple)
        
        console.log('Raw states from req.body.state:', states);
        console.log('Type of states:', typeof states);
        console.log('Is array:', Array.isArray(states));

        // Bot protection: Check honeypot field
        if (website && website.trim() !== '') {
            console.log('Bot detected: honeypot field filled');
            if (isAjax) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid request'
                });
            } else {
                req.flash('error', 'Invalid request');
                return res.redirect('/#newsletter');
            }
        }

        // Bot protection: Also check if honeypot field exists but contains only whitespace
        if (website !== undefined && website !== null && website !== '') {
            console.log('Bot detected: honeypot field contains whitespace');
            if (isAjax) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid request'
                });
            } else {
                req.flash('error', 'Invalid request');
                return res.redirect('/#newsletter');
            }
        }

        // Bot protection: Check form timing (minimum 2 seconds to fill form, but more lenient)
        if (form_timestamp) {
            const submittedTimestamp = parseInt(form_timestamp, 10);
            const currentTime = Date.now();
            const timeDiff = currentTime - submittedTimestamp;
            const minimumTime = 2000; // 2 seconds (reduced from 3 seconds)
            const maximumTime = 30 * 60 * 1000; // 30 minutes (back to original limit)
            
            console.log(`Form timing check: submitted=${submittedTimestamp}, current=${currentTime}, diff=${timeDiff}ms`);
            
            // Check if timestamp is in the future (suspicious)
            if (submittedTimestamp > currentTime + 5000) { // Allow 5 second clock drift
                console.log(`Bot detected: timestamp in future (${submittedTimestamp} > ${currentTime})`);
                if (isAjax) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid form timestamp'
                    });
                } else {
                    req.flash('error', 'Invalid form timestamp');
                    return res.redirect('/#newsletter');
                }
            }
            
            if (timeDiff < minimumTime) {
                console.log(`Bot detected: form submitted too quickly (${timeDiff}ms)`);
                if (isAjax) {
                    return res.status(400).json({
                        success: false,
                        message: 'Please wait a moment before submitting'
                    });
                } else {
                    req.flash('error', 'Please wait a moment before submitting');
                    return res.redirect('/#newsletter');
                }
            }
            
            if (timeDiff > maximumTime) {
                console.log(`Form session timeout: form submitted after ${timeDiff}ms`);
                if (isAjax) {
                    return res.status(400).json({
                        success: false,
                        message: 'Form session expired, please refresh and try again'
                    });
                } else {
                    req.flash('error', 'Form session expired, please refresh and try again');
                    return res.redirect('/#newsletter');
                }
            }
        } else {
            // If no timestamp is provided, allow it but log for monitoring
            console.log('No form timestamp provided - allowing submission but monitoring for abuse');
        }

        // Validate email
        if (!email) {
            if (isAjax) {
                return res.status(400).json({
                    success: false,
                    message: 'Email address is required'
                });
            } else {
                req.flash('error', 'Email address is required');
                return res.redirect('/#newsletter');
            }
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.toLowerCase())) {
            if (isAjax) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid email address'
                });
            } else {
                req.flash('error', 'Invalid email address');
                return res.redirect('/#newsletter');
            }
        }

        // Handle both single state (string) and multiple states (array) submissions
        let stateArray;
        if (typeof states === 'string') {
            stateArray = [states]; // Single state selected comes as string
        } else if (Array.isArray(states)) {
            stateArray = states; // Multiple states selected comes as array
        } else {
            // Default to all states if none provided - this is the expected behavior
            // No states means user wants notifications from all states
            console.log('No states provided - defaulting to all Australian states');
            stateArray = AUSTRALIAN_STATES; // Default to all states when none specified
        }
        
        console.log(`States received: ${JSON.stringify(states)}, parsed as array: ${JSON.stringify(stateArray)}`);
        
        // Always ensure we have valid states (should always be true after above logic)
        if (!stateArray || stateArray.length === 0) {
            stateArray = AUSTRALIAN_STATES; // Fallback to all states
            console.log('Fallback: Setting to all Australian states');
        }

        // Rate limiting: Check IP address for recent submissions
        const userIP = req.ip || req.connection.remoteAddress;
        const recentSubmissionTime = 10000; // 10 seconds (was 1 minute)
        
        // Simple in-memory rate limiting (for production, use Redis or database)
        if (!global.subscriptionAttempts) {
            global.subscriptionAttempts = new Map();
        }
        
        const lastAttempt = global.subscriptionAttempts.get(userIP);
        if (lastAttempt && (Date.now() - lastAttempt) < recentSubmissionTime) {
            console.log(`Rate limit exceeded for IP: ${userIP}`);
            if (isAjax) {
                return res.status(429).json({
                    success: false,
                    message: 'Too many requests. Please wait a moment before trying again.'
                });
            } else {
                req.flash('error', 'Too many requests. Please wait a moment before trying again.');
                return res.redirect('/#newsletter');
            }
        }
        
        // Record this attempt
        global.subscriptionAttempts.set(userIP, Date.now());

        // Check if email already exists
        const existingSubscription = await EmailSubscription.findOne({
            where: { email: email.toLowerCase() }
        });

        if (existingSubscription && existingSubscription.isActive) {
            console.log(`Attempted resubscription for already active email: ${email.toLowerCase()}`);
            if (isAjax) {
                return res.status(400).json({
                    success: false,
                    message: 'This email is already subscribed to our newsletter!'
                });
            } else {
                req.flash('error', 'This email is already subscribed to our newsletter!');
                return res.redirect('/#newsletter');
            }
        }

        if (existingSubscription && !existingSubscription.isActive) {
            // Reactivate existing subscription with new state preferences
            await existingSubscription.update({
                isActive: true,
                subscribedAt: new Date(),
                states: stateArray
            });
            console.log(`Reactivated subscription for: ${email.toLowerCase()}`);
        } else {
            // Create new subscription
            await EmailSubscription.create({
                email: email.toLowerCase(),
                isActive: true,
                subscribedAt: new Date(),
                states: stateArray,
                source: 'homepage'
            });
            console.log(`New email subscription created: ${email.toLowerCase()}`);
        }

        // Send welcome email (optional - don't fail the subscription if email fails)
        try {
            await AuthEmailService.sendWelcomeEmail(email.toLowerCase(), stateArray);
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Continue - don't fail the subscription just because email failed
        }

        if (isAjax) {
            return res.json({
                success: true,
                message: 'Successfully subscribed to newsletter!'
            });
        } else {
            req.flash('success', 'Successfully subscribed to newsletter!');
            return res.redirect('/#newsletter');
        }

    } catch (error) {
        // Ensure we handle both AJAX and regular form errors appropriately
        console.error('Subscription controller error:', error);
        
        const isAjax = req.xhr || 
                       req.headers?.accept?.includes('application/json') || 
                       req.headers?.['x-requested-with']?.toLowerCase() === 'xmlhttprequest';
        
        if (isAjax) {
            return res.status(500).json({
                success: false,
                message: 'An unexpected error occurred. Please try again.'
            });
        } else {
            req.flash('error', 'An unexpected error occurred. Please try again.');
            return res.redirect('/#newsletter');
        }
    }
};

/**
 * Display unsubscribe page
 */
export const getUnsubscribe = asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).render('error', {
      title: 'Invalid Link',
      message: 'This unsubscribe link is missing required information.',
      error: null,
      additionalCSS: [],
    });
  }

  const subscription = await EmailSubscription.findOne({
    where: { 
      unsubscribeToken: token,
      isActive: true 
    },
  });

  if (!subscription) {
    return res.status(400).render('error', {
      title: 'Invalid Link',
      message: 'This unsubscribe link is invalid or has expired.',
      error: null,
      additionalCSS: [],
    });
  }

  return res.render('unsubscribe', {
    title: 'Unsubscribe from Email Notifications',
    subscription,
    token,
    additionalCSS: ['/styles/forms.css'],
  });
});

/**
 * Process unsubscribe request
 */
export const postUnsubscribe = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).render('error', {
      title: 'Invalid Request',
      message: 'Missing required information to process unsubscribe request.',
      error: null,
      additionalCSS: [],
    });
  }

  const subscription = await EmailSubscription.findOne({
    where: { 
      unsubscribeToken: token,
      isActive: true
    },
  });

  if (!subscription) {
    return res.status(400).render('error', {
      title: 'Invalid Link',
      message: 'This unsubscribe link is invalid or has already been used.',
      error: null,
      additionalCSS: [],
    });
  }

  // Update subscription to inactive (this will trigger the beforeUpdate hook)
  await subscription.update({
    isActive: false,
    // unsubscribedAt is automatically set by the model hook
  });

  return res.render('unsubscribe-success', {
    title: 'Successfully Unsubscribed',
    message: 'You have been successfully unsubscribed from our email notifications.',
    email: subscription.email,
    additionalCSS: ['/styles/forms.css'],
  });
});

/**
 * Display admin statistics
 */
export const getStats = asyncHandler(async (_req, res) => {
  const stats = {
    totalUsers: await User.count(),
    totalCarnivals: await Carnival.count({ where: { isActive: true } }),
    totalClubs: await Club.count(),
    totalSubscriptions: await EmailSubscription.count({ where: { isActive: true } }),
  };

  return res.render('admin/stats', {
    title: 'Admin Statistics',
    stats,
    additionalCSS: ['/styles/admin.styles.css'],
  });
});

/**
 * Send newsletter to subscribers
 */
export const sendNewsletter = asyncHandler(async (req, res) => {
  const { subject, content } = req.body;

  if (!subject || !content) {
    return res.status(400).json({
      success: false,
      message: 'Subject and content are required',
    });
  }

  const subscribers = await EmailSubscription.findAll({
    where: { isActive: true },
  });

  const result = await ContactEmailService.sendNewsletter(subject, content, subscribers);

  return res.json({
    success: true,
    message: `Newsletter sent to ${result.sent} subscribers`,
    details: result,
  });
});

/**
 * Display contact page
 */
export const getContact = asyncHandler(async (req, res) => {
  let userWithClub = null;

  // If user is logged in, fetch their club information for auto-population
  if (req.user) {
    userWithClub = await User.findByPk(req.user.id, {
      include: [
        {
          model: Club,
          as: 'club',
          attributes: ['id', 'clubName', 'state', 'location'],
        },
      ],
      attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber', 'clubId'],
    });

    // Transform the user object to include club information for template compatibility
    if (userWithClub && userWithClub.club) {
      userWithClub = {
        ...userWithClub.toJSON(),
        clubId: userWithClub.club, // This provides clubId.clubName for the template
      };
    }
  }

  return res.render('contact', {
    title: 'Contact Us',
    user: userWithClub || req.user,
    errors: req.flash('error'),
    success: req.flash('success'),
    additionalCSS: [],
  });
});

/**
 * Handle contact form submission
 */
export const postContact = asyncHandler(async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    req.flash('error_msg', 'Please correct the validation errors and try again.');
    return res.render('contact', {
      title: 'Contact Us',
      errors: errors.array(),
      formData: req.body,
      additionalCSS: [],
    });
  }

  const { firstName, lastName, email, phone, subject, clubName, message, newsletter } = req.body;

  // Send contact email using the email service
  try {
    const emailResult = await ContactEmailService.sendContactFormEmail({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim(),
      subject,
      clubName: clubName?.trim(),
      message: message.trim(),
      newsletter: newsletter === 'on',
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
    });

    // Log if email was blocked (E2E/test environments)
    if (emailResult && emailResult.blocked) {
      console.log('📧 Contact form email blocked (E2E/test environment)');
    }
  } catch (error) {
    console.error('Contact form email error:', error);
    // Continue with form processing even if email fails
  }

  // If user wants newsletter and isn't already subscribed, add them
  if (newsletter === 'on') {
    const existingSubscription = await EmailSubscription.findOne({
      where: { email: email.trim().toLowerCase() },
    });

        if (!existingSubscription) {
            await EmailSubscription.create({
                email: email.trim().toLowerCase(),
                states: AUSTRALIAN_STATES, // Fixed: Use 'states' instead of 'subscribedStates'
                isActive: true,
                subscribedAt: new Date(),
                source: 'contact_form'
            });
        }
    }

  req.flash(
    'success_msg',
    "Thank you for contacting us! We'll get back to you within 1-2 business days."
  );
  return res.redirect('/contact');
});
