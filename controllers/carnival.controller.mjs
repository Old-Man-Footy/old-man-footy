/**
 * Carnival Controller - MVC Architecture Implementation
 *
 * Handles carnival management, club registration, and carnival operations.
 * Follows strict MVC separation of concerns as outlined in best practices.
 */

import {
  Carnival,
  Club,
  User,
  CarnivalClub,
  ClubPlayer,
  CarnivalClubPlayer,
  Sponsor,
  sequelize,
} from '../models/index.mjs';
import { Op } from 'sequelize';
import { validationResult } from 'express-validator';
import { AUSTRALIAN_STATES, SPONSORSHIP_LEVELS_ARRAY } from '../config/constants.mjs';

// Import recalculation function from carnivalClub controller
import { recalculateRegistrationFees } from './carnivalClub.controller.mjs';
import mySidelineService from '../services/mySidelineIntegrationService.mjs';
import { sortSponsorsHierarchically } from '../services/sponsorSortingService.mjs';

import { asyncHandler } from '../middleware/asyncHandler.mjs';
import { processStructuredUploads } from '../utils/uploadProcessor.mjs';

/**
 * Display list of all carnivals with filtering options
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const listCarnivalsHandler = async (req, res) => {
  const { state, search, upcoming, mysideline, _submitted } = req.query;
  let whereClause = {}; // Remove isActive filter to show all carnivals

  // Set default for upcoming only if no form has been submitted and no explicit filters are applied
  let upcomingFilter = upcoming;
  if (upcomingFilter === undefined && !_submitted && !search && (!state || state === 'all')) {
    upcomingFilter = 'true'; // Default to showing upcoming carnivals only on first page load
  }

  // State filter
  if (state && state !== 'all') {
    whereClause.state = state;
  }

  // Date filter - only apply if upcomingFilter is explicitly 'true'
  if (upcomingFilter === 'true') {
    // Include both upcoming carnivals (with dates >= today) AND active carnivals with no date
    whereClause[Op.or] = [
      {
        date: { [Op.gte]: new Date() },
        isActive: true
      },
      {
        date: null,
        isActive: true
      }
    ];
  }

  // MySideline filter
  if (mysideline === 'true') {
    whereClause.lastMySidelineSync = { [Op.ne]: null };
  } else if (mysideline === 'false') {
    whereClause.lastMySidelineSync = null;
  }

  // Search filter - handle both search and date filters properly
  if (search) {
    const searchConditions = [
      // Use UPPER() function for case-insensitive comparison in SQLite
      sequelize.where(
        sequelize.fn('UPPER', sequelize.col('title')),
        'LIKE',
        `%${search.toUpperCase()}%`
      ),
      sequelize.where(
        sequelize.fn('UPPER', sequelize.col('locationAddress')),
        'LIKE',
        `%${search.toUpperCase()}%`
      ),
      sequelize.where(
        sequelize.fn('UPPER', sequelize.col('organiserContactName')),
        'LIKE',
        `%${search.toUpperCase()}%`
      ),
    ];

    // If we also have upcoming filter, combine them properly
    if (upcomingFilter === 'true') {
      whereClause[Op.and] = [
        {
          [Op.or]: [
            {
              date: { [Op.gte]: new Date() },
              isActive: true
            },
            {
              date: null,
              isActive: true
            }
          ]
        },
        {
          [Op.or]: searchConditions
        }
      ];
      // Remove the original [Op.or] since we're restructuring
      delete whereClause[Op.or];
    } else {
      whereClause[Op.or] = searchConditions;
    }
  } else if (upcomingFilter === 'true' && !whereClause[Op.or]) {
    // Handle upcoming filter without search - ensure we don't overwrite existing Op.or
    whereClause[Op.or] = [
      {
        date: { [Op.gte]: new Date() },
        isActive: true
      },
      {
        date: null,
        isActive: true
      }
    ];
  }

  const carnivals = await Carnival.findAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['firstName', 'lastName'],
      },
    ],
    // Remove database ordering - we'll sort in JavaScript for complex prioritization
  });

  // Custom sorting: Upcoming first, then active no-date, then past/inactive
  const sortedCarnivals = carnivals.sort((a, b) => {
    const now = new Date();
    const aDate = a.date ? new Date(a.date) : null;
    const bDate = b.date ? new Date(b.date) : null;
    
    // Determine category for each carnival
    // Category 1: Upcoming (has date >= today AND is active)
    // Category 2: No date but active
    // Category 3: Past date or inactive
    const getCategory = (carnival, date) => {
      if (!carnival.isActive) return 3; // Inactive always goes to category 3
      if (!date) return 2; // No date but active
      if (date >= now) return 1; // Upcoming
      return 3; // Past date
    };
    
    const aCat = getCategory(a, aDate);
    const bCat = getCategory(b, bDate);
    
    // Sort by category first
    if (aCat !== bCat) {
      return aCat - bCat;
    }
    
    // Within same category, apply specific sorting
    if (aCat === 1) {
      // Category 1: Upcoming - sort by date ascending (soonest first)
      return aDate - bDate;
    } else if (aCat === 2) {
      // Category 2: No date but active - sort alphabetically by title
      return (a.title || '').localeCompare(b.title || '');
    } else {
      // Category 3: Past/inactive - sort by date ascending, then alphabetically
      if (aDate && bDate) {
        return aDate - bDate;
      } else if (aDate && !bDate) {
        return -1; // Items with dates come before items without dates
      } else if (!aDate && bDate) {
        return 1;
      } else {
        // Both have no date, sort alphabetically
        return (a.title || '').localeCompare(b.title || '');
      }
    }
  });

  // Fetch full user data with club information for ownership checking
  let userWithClub = null;
  if (req.user) {
    userWithClub = await User.findByPk(req.user.id, {
      include: [
        {
          model: Club,
          as: 'club',
          attributes: ['id', 'clubName', 'state', 'location'],
        },
      ],
      attributes: [
        'id',
        'firstName',
        'lastName',
        'email',
        'phoneNumber',
        'clubId',
        'isAdmin',
        'isPrimaryDelegate',
      ],
    });
  }

  // Process carnivals through getPublicDisplayData and add ownership information
  const processedCarnivals = sortedCarnivals.map((carnival) => {
    const publicData = carnival.getPublicDisplayData();

    // Check if this carnival can be claimed by the current user
    // Allow carnivals that either have a MySideline ID or have a MySideline sync timestamp
    const hasMySidelineMarker = carnival.mySidelineId || carnival.lastMySidelineSync;
    const canTakeOwnership =
      carnival.isActive &&
      hasMySidelineMarker &&
      !carnival.createdByUserId &&
      userWithClub &&
      userWithClub.clubId &&
      // State-based restriction: can only claim carnivals in club's state or carnivals with no state
      (!carnival.state || !userWithClub.club.state || carnival.state === userWithClub.club.state);

    return {
      ...publicData,
      creator: carnival.creator, // Preserve creator relationship
      canTakeOwnership: canTakeOwnership,
    };
  });

  const states = AUSTRALIAN_STATES;

  return res.render('carnivals/list', {
    title: 'Find Carnivals',
    carnivals: processedCarnivals,
    states,
    currentFilters: { state, search, upcoming: upcomingFilter, mysideline },
    user: userWithClub, // Pass user data to view for ownership checking
    additionalCSS: ['/styles/carnival.styles.css'],
  });
};

/**
 * Display individual carnival details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showCarnivalHandler = async (req, res) => {
    const carnival = await Carnival.findByPk(req.params.id, {
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['firstName', 'lastName'],
        include: [
          {
            model: Club,
            as: 'club',
          },
        ],
      },
      {
        model: Sponsor,
        as: 'carnivalSponsors',
        where: { isActive: true },
        required: false,
      },
      // Include attendees relationship   
      {
        model: Club,
        as: 'attendingClubs',
        attributes: [
          'id',
          'clubName',
          'state',
          'location',
          'logoUrl',
          'isActive',
          'isPubliclyListed',
        ],
        through: { attributes: [] },
        required: false,
      }, 
      {
        model: Club,
        as: 'hostClub',
        required: false,
        attributes: [
          'id', 
          'clubName', 
          'logoUrl', 
          'state', 
          'location', 
          'contactPerson', 
          'contactEmail', 
          'contactPhone',
          'isActive',
          'isPubliclyListed'
        ]
      },
    ],
  });

  if (!carnival) {
    req.flash('error_msg', 'Carnival not found.');
    return res.redirect('/carnivals');
  }

  // Fetch the host club using clubId (strict MVC: no DB logic in view)
  let hostClub = null;
  if (carnival.clubId) {
    hostClub = await Club.findByPk(carnival.clubId, {
      attributes: [
        'id', 
        'clubName', 
        'logoUrl', 
        'state', 
        'location', 
        'contactPerson', 
        'contactEmail', 
        'contactPhone',
        'isActive',
        'isPubliclyListed',
      ],
    });
  }

  // Process carnival data through getPublicDisplayData for public views
  const publicCarnivalData = carnival.getPublicDisplayData();

  // Fetch full user data with club information for auto-populating registration form
  let userWithClub = null;
  if (req.user) {
    userWithClub = await User.findByPk(req.user.id, {
      include: [
        {
          model: Club,
          as: 'club',
          attributes: ['id', 'clubName', 'state', 'location'],
        },
      ],
      attributes: [
        'id',
        'firstName',
        'lastName',
        'email',
        'phoneNumber',
        'clubId',
        'isAdmin',
        'isPrimaryDelegate',
      ],
    });
  }

  // Check if this is a MySideline carnival that can be claimed (only for active carnivals)
  const canTakeOwnership =
    carnival.isActive &&
    carnival.mySidelineId &&
    !carnival.createdByUserId &&
    !carnival.clubId && // Cannot claim if already claimed by any club
    userWithClub &&
    userWithClub.clubId &&
    // State-based restriction: can only claim carnivals in your club's state or carnivals with no state
    (!carnival.state || !userWithClub.club.state || carnival.state === userWithClub.club.state);

  // Check if user's club is already registered for this carnival (only for active carnivals)
  let userClubRegistration = null;
  let canRegisterClub = false;

  if (carnival.isActive && userWithClub && userWithClub.clubId) {
    // Check if user's club is already registered - include approval status
    userClubRegistration = await CarnivalClub.findOne({
      where: {
        carnivalId: carnival.id,
        clubId: userWithClub.clubId,
        isActive: true,
      },
      attributes: [
        'id',
        'approvalStatus',
        'isPaid',
        'playerCount',
        'teamName',
        'contactPerson',
        'registrationDate',
        'rejectionReason',
      ],
    });

    // User can register if:
    // 1. They have a club
    // 2. Their club is not already registered
    // 3. They are not the carnival owner
    // 4. Carnival is active
    canRegisterClub = !userClubRegistration && carnival.createdByUserId !== userWithClub.id;
  }

  // Check if user can edit this carnival (standardized permission check)
  const canEditCarnival = userWithClub ? await carnival.canUserEditAsync(userWithClub) : false;

  // Use single standard permission check for all management operations
  const canManage = canEditCarnival;

  // Check if merge carnival option should be available
  let canMergeCarnival = false;
  let availableMergeTargets = [];

  if (userWithClub && carnival.lastMySidelineSync && carnival.isActive) {
    // Admin users can merge any MySideline carnival into any active non-MySideline carnival
    if (userWithClub.isAdmin) {
      availableMergeTargets = await Carnival.findAll({
        where: {
          isActive: true,
          isManuallyEntered: true, // Non-MySideline carnivals only
          id: { [Op.ne]: carnival.id }, // Exclude current carnival
        },
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['firstName', 'lastName'],
            include: [
              {
                model: Club,
                as: 'club',
                attributes: ['clubName'],
              },
            ],
          },
        ],
        attributes: ['id', 'title', 'date', 'state', 'createdByUserId'],
        order: [['date', 'DESC']],
      });

      canMergeCarnival = availableMergeTargets.length > 0;
    }
    // Regular users can only merge carnivals they own
    else if (carnival.createdByUserId === userWithClub.id) {
      availableMergeTargets = await Carnival.findAll({
        where: {
          createdByUserId: userWithClub.id,
          isActive: true,
          isManuallyEntered: true, // Non-MySideline carnivals only
          id: { [Op.ne]: carnival.id }, // Exclude current carnival
        },
        attributes: ['id', 'title', 'date', 'state'],
        order: [['date', 'DESC']],
      });

      canMergeCarnival = availableMergeTargets.length > 0;
    }
  }

  // Check if registration is currently active (includes deadline check)
  const isRegistrationActive = await carnival.isRegistrationActiveAsync();

  // Sort sponsors hierarchically using the sorting service
  const sortedSponsors = sortSponsorsHierarchically(carnival.carnivalSponsors || [], 'carnival');

  return res.render('carnivals/show', {
    title: carnival.title,
    carnival: canManage ? carnival : publicCarnivalData, // Show full data to managers, obfuscated to public
    user: userWithClub, // Pass enriched user data with club information
    sponsors: sortedSponsors,
    canTakeOwnership,
    userClubRegistration,
    canRegisterClub,
    canManage,
    canEditCarnival, // Pass proper edit permission check
    canMergeCarnival, // Pass merge option availability
    availableMergeTargets, // Pass available merge targets
    isInactiveCarnival: !carnival.isActive,
    isMySidelineCarnival: !!carnival.mySidelineId,
    isRegistrationActive, // Pass registration status including deadline check
    showPostCreationModal: req.query.showPostCreationModal === 'true', // Pass query parameter to view
    additionalCSS: ['/styles/carnival.styles.css','/styles/sponsor.styles.css'],
    hostClub,
  });
};

/**
 * Display create carnival form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showCreateFormHandler = async (req, res) => {
  const states = AUSTRALIAN_STATES;

  // Fetch user's club information for auto-population
  let userWithClub = null;
  if (req.user) {
    userWithClub = await User.findByPk(req.user.id, {
      include: [
        {
          model: Club,
          as: 'club',
          attributes: ['id', 'clubName', 'state', 'contactPerson', 'contactEmail', 'contactPhone'],
        },
      ],
      attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber', 'clubId'],
    });
  }

  return res.render('carnivals/new', {
    title: 'Add New Carnival',
    states,
    user: userWithClub, // Pass user with club data for auto-population
    additionalCSS: ['/styles/carnival.styles.css'],
  });
};


/**
 *
 *
 * @param {*} req
 * @param {*} res
 * @return {*} 
 */
const createCarnivalHandler = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const states = AUSTRALIAN_STATES;

    // Fetch user's club information for auto-population on error
    let userWithClub = null;
    if (req.user) {
      userWithClub = await User.findByPk(req.user.id, {
        include: [
          {
            model: Club,
            as: 'club',
            attributes: [
              'id',
              'clubName',
              'state',
              'contactPerson',
              'contactEmail',
              'contactPhone',
            ],
          },
        ],
        attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber', 'clubId'],
      });
    }

    return res.render('carnivals/new', {
      title: 'Add New Carnival',
      states,
      errors: errors.array(),
      formData: {
        ...req.body,
        organiserContactEmail: req.body.organiserContactEmail // Ensure this is always preserved
      },
      user: userWithClub, // Pass user data for auto-population
      additionalCSS: ['/styles/carnival.styles.css'],
    });
  }

  // Prepare carnival data
  const carnivalData = {
    title: req.body.title,
    date: new Date(req.body.date),
    endDate: req.body.endDate ? new Date(req.body.endDate) : null,
    locationAddress: req.body.locationAddress,
    // MySideline-compatible address fields
    locationSuburb: req.body.locationSuburb || null,
    locationPostcode: req.body.locationPostcode || null,
    locationLatitude: req.body.locationLatitude ? parseFloat(req.body.locationLatitude) : null,
    locationLongitude: req.body.locationLongitude ? parseFloat(req.body.locationLongitude) : null,
    locationCountry: req.body.locationCountry || 'Australia',
    organiserContactName: req.body.organiserContactName,
    organiserContactEmail: req.body.organiserContactEmail,
    organiserContactPhone: req.body.organiserContactPhone,
    scheduleDetails: req.body.scheduleDetails,
    registrationLink: req.body.registrationLink || '',
    feesDescription: req.body.feesDescription || '',
    callForVolunteers: req.body.callForVolunteers || '',
    state: req.body.state,
    createdByUserId: req.user.id,
    clubId: req.user.clubId || null, // Set clubId on creation
    isManuallyEntered: true,
    // Social media links
    socialMediaFacebook: req.body.socialMediaFacebook || '',
    socialMediaInstagram: req.body.socialMediaInstagram || '',
    socialMediaTwitter: req.body.socialMediaTwitter || '',
    socialMediaWebsite: req.body.socialMediaWebsite || '',
    // Fee structure
    teamRegistrationFee: req.body.teamRegistrationFee ? parseFloat(req.body.teamRegistrationFee) : 0,
    perPlayerFee: req.body.perPlayerFee ? parseFloat(req.body.perPlayerFee) : 0,
  };

  // Use the duplicate detection and merging service
  let carnival;
  try {
    // Check if user is forcing creation despite duplicate warning
    const forceCreate = req.body.forceCreate === 'true';

    if (forceCreate) {
      // Create directly without duplicate checking
      carnival = await Carnival.create(carnivalData);
    } else {
      // Use duplicate detection and merging
      carnival = await createOrMergeCarnival(carnivalData, req.user.id);
    }

    // Handle all uploads using shared processor (defensive against corrupted uploads)
    if (req.structuredUploads && req.structuredUploads.length > 0) {
      const uploadUpdates = await processStructuredUploads(req, {}, 'carnivals', carnival.id);
      
      // Update carnival with processed upload data
      if (Object.keys(uploadUpdates).length > 0) {
        await carnival.update(uploadUpdates);
        console.log(`✅ Carnival ${carnival.id} created with ${req.structuredUploads.length} structured uploads`);
      }
    }

    // Check if this was a merge operation
    const wasMerged = carnival.lastMySidelineSync && carnival.claimedAt;
  } catch (duplicateError) {
    // Handle duplicate detection errors
    if (duplicateError.message.includes('similar carnival already exists')) {
      const states = AUSTRALIAN_STATES;

      // Fetch user's club information for auto-population on duplicate error
      let userWithClub = null;
      if (req.user) {
        userWithClub = await User.findByPk(req.user.id, {
          include: [
            {
              model: Club,
              as: 'club',
              attributes: [
                'id',
                'clubName',
                'state',
                'contactPerson',
                'contactEmail',
                'contactPhone',
              ],
            },
          ],
          attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber', 'clubId'],
        });
      }

      return res.render('carnivals/new', {
        title: 'Add New Carnival',
        states,
        errors: [{ msg: duplicateError.message }],
        formData: req.body,
        user: userWithClub, // Pass user data to auto-population
        duplicateWarning: true,
        additionalCSS: ['/styles/carnival.styles.css'],
      });
    }
    throw duplicateError; // Re-throw if it's not a duplicate issue
  }

  // Send notification emails to subscribers
  // TODO: make this so it sends a weekly summary, not one email for every new carnival.
  // await emailService.notifyNewCarnival(carnival);

  // Set comprehensive success message with important next steps
  const wasMerged = carnival.lastMySidelineSync && carnival.claimedAt;
  if (wasMerged) {
    req.flash(
      'success_msg',
      `Carnival successfully merged with existing MySideline carnival! Your data has been combined with the imported carnival: "${carnival.title}"`
    );
    return res.redirect(`/carnivals/${carnival.id}`);
  } else {
    // For manually created carnivals, redirect to edit page to allow adding images
    req.flash('success_msg', 'Carnival created successfully! 🎉 Now you can add images and additional details.');
    return res.redirect(`/carnivals/${carnival.id}/edit`);
  }
};

/**
 * Display edit carnival form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showEditFormHandler = async (req, res) => {
  const carnival = await Carnival.findByPk(req.params.id);

  if (!carnival) {
    req.flash('error_msg', 'Carnival not found.');
    return res.redirect('/dashboard');
  }

  // Check if user can edit this carnival (using async method for club delegate checking)
  const canEdit = await carnival.canUserEditAsync(req.user);
  if (!canEdit) {
    req.flash('error_msg', 'You can only edit carnivals hosted by your club.');
    return res.redirect('/dashboard');
  }

  const states = AUSTRALIAN_STATES;
  
  // Debug CSRF token generation
  let csrfToken;
  try {
    if (typeof req.csrfToken === 'function') {
      csrfToken = req.csrfToken();
    } else {
      console.error('req.csrfToken is not a function:', typeof req.csrfToken);
      csrfToken = null;
    }
  } catch (error) {
    console.error('Error generating CSRF token:', error.message);
    csrfToken = null;
  }
  
  return res.render('carnivals/edit', {
    title: 'Edit Carnival',
    carnival,
    states,
    csrfToken,
    additionalCSS: ['/styles/carnival.styles.css'],
    additionalJS: ['/js/carnival-edit.js'],
  });
};


/**
 * Create or merge a carnival carnival, preventing duplicates.
 * If a matching MySideline carnival exists (by title/mySidelineTitle and date),
 * update it with any new data from the user-created carnival, otherwise create a new one.
 * @param {Object} carnivalData - The carnival data to create.
 * @param {number} userId - The user ID creating the carnival.
 * @returns {Promise<Carnival>} The created or merged carnival instance.
 */
export async function createOrMergeCarnival(carnivalData, userId) {
    if (!carnivalData.title || !carnivalData.date) {
      throw new Error('Carnival title and date are required for duplicate detection.');
    }
  
    // Find a carnival with the same title or mySidelineTitle and the same date
    const existing = await Carnival.findOne({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { title: carnivalData.title },
              { mySidelineTitle: carnivalData.title }
            ]
          },
          { date: carnivalData.date },
          { claimedAt: null } // Only consider unclaimed carnivals for merging
        ]
      }
    });
  
    if (existing) {
      // Only merge if the existing carnival is a MySideline import
      if (!existing.isManuallyEntered) {
        // Merge user-provided data into the MySideline carnival (prefer user data if present)
        await existing.update({
          ...carnivalData,
          isManuallyEntered: false, // preserve MySideline status
          createdByUserId: userId,
          claimedAt: new Date(),
          updatedAt: new Date()
        });
        return existing;
      } else if (existing.clubId === carnivalData.clubId) {
        // If the existing carnival is manually entered but belongs to the same club, merge data
        throw new Error('A similar manually created carnival already exists for this date. Please check for duplicates.');
      }
      // If the existing carnival is manually entered and belongs to a different club, allow creation.    
    }
  
    // No duplicate found, create new carnival
    return await Carnival.create({ ...carnivalData, createdByUserId: userId });
  }

/**
 * Update existing carnival
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateCarnivalHandler = async (req, res) => {
  console.log('🎯 updateCarnivalHandler - CONTROLLER ENTRY POINT - ID:', req.params.id);
  console.log('🎯 updateCarnivalHandler - Request method:', req.method);
  console.log('🎯 updateCarnivalHandler - Request URL:', req.url);
  console.log('🎯 updateCarnivalHandler - User ID:', req.user?.id);
  console.log('🎯 updateCarnivalHandler - Body keys:', Object.keys(req.body || {}));
  console.log('🎯 updateCarnivalHandler - Files keys:', Object.keys(req.files || {}));
  console.log('⚡ updateCarnivalHandler - Starting controller method for ID:', req.params.id);
  
  try {
    console.log('⚡ updateCarnivalHandler - Finding carnival by PK:', req.params.id);
    const carnival = await Carnival.findByPk(req.params.id);

    if (!carnival) {
      console.log('❌ updateCarnivalHandler - Carnival not found for ID:', req.params.id);
      req.flash('error_msg', 'Carnival not found.');
      return res.redirect('/dashboard');
    }
  
    // Check if user can edit this carnival (using async method for club delegate checking)
    console.log('⚡ updateCarnivalHandler - Checking user permissions for user:', req.user?.id);
    try {
      const canEdit = await carnival.canUserEditAsync(req.user);
      if (!canEdit) {
        console.log('❌ updateCarnivalHandler - User lacks edit permissions');
        req.flash('error_msg', 'You can only edit carnivals hosted by your club.');
        return res.redirect('/dashboard');
      }
    } catch (error) {
      console.error('❌ updateCarnivalHandler - Error checking permissions:', error);
      throw error;
    }

  console.log('⚡ updateCarnivalHandler - Checking validation results');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ updateCarnivalHandler - Validation errors found:', errors.array());
    // Check if this is an AJAX request
    const isAjax = req.xhr || req.headers.accept.indexOf('json') > -1 || req.headers['x-requested-with'] === 'XMLHttpRequest';
    console.log('⚡ updateCarnivalHandler - Is AJAX request:', isAjax);
    
    if (isAjax) {
      console.log('⚡ updateCarnivalHandler - Returning JSON error response');
      // Return JSON response for AJAX requests
      return res.status(400).json({
        success: false,
        message: 'Validation errors occurred',
        errors: errors.array()
      });
    }

    const states = AUSTRALIAN_STATES;

    // Fetch user's club information for auto-population on error
    let userWithClub = null;
    if (req.user) {
      userWithClub = await User.findByPk(req.user.id, {
        include: [
          {
            model: Club,
            as: 'club',
            attributes: [
              'id',
              'clubName',
              'state',
              'contactPerson',
              'contactEmail',
              'contactPhone',
            ],
          },
        ],
        attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber', 'clubId'],
      });
    }

    return res.render('carnivals/edit', {
      title: 'Edit Carnival',
      carnival,
      states,
      errors: errors.array(),
      user: userWithClub, // Pass user data for auto-population
      additionalCSS: ['/styles/carnival.styles.css'],
      additionalJS: ['/js/carnival-edit.js'],
    });
  }

  // Update carnival data
  const updateData = {
    title: req.body.title,
    date: new Date(req.body.date),
    endDate: req.body.endDate ? new Date(req.body.endDate) : null,
    locationAddress: req.body.locationAddress,
    // MySideline-compatible address fields
    locationSuburb: req.body.locationSuburb || null,
    locationPostcode: req.body.locationPostcode || null,
    locationLatitude: req.body.locationLatitude ? parseFloat(req.body.locationLatitude) : null,
    locationLongitude: req.body.locationLongitude ? parseFloat(req.body.locationLongitude) : null,
    locationCountry: req.body.locationCountry || 'Australia',
    organiserContactName: req.body.organiserContactName,
    organiserContactEmail: req.body.organiserContactEmail,
    organiserContactPhone: req.body.organiserContactPhone,
    scheduleDetails: req.body.scheduleDetails,
    registrationLink: req.body.registrationLink || '',
    feesDescription: req.body.feesDescription || '',
    callForVolunteers: req.body.callForVolunteers || '',
    state: req.body.state,
    // Update social media links
    socialMediaFacebook: req.body.socialMediaFacebook || '',
    socialMediaInstagram: req.body.socialMediaInstagram || '',
    socialMediaTwitter: req.body.socialMediaTwitter || '',
    socialMediaWebsite: req.body.socialMediaWebsite || '',
    // Update fee structure
    teamRegistrationFee: req.body.teamRegistrationFee ? parseFloat(req.body.teamRegistrationFee) : 0,
    perPlayerFee: req.body.perPlayerFee ? parseFloat(req.body.perPlayerFee) : 0,
  };

  const filesToDelete = {};
  
  // Check for logo deletion
  if (req.body.delete_logo === 'true') {
    filesToDelete.logo = carnival.logo;
    updateData.logo = null;
  }
  
  // Check for promotional image deletion
  if (req.body.delete_promotionalImage === 'true') {
    filesToDelete.promotionalImage = carnival.promotionalImage;
    updateData.promotionalImage = null;
  }
  
  // Check for draw document deletion
  if (req.body.delete_drawDocument === 'true') {
    filesToDelete.drawDocument = carnival.drawDocument;
    updateData.drawDocument = null;
  }

  // Process file deletions
  if (Object.keys(filesToDelete).length > 0) {
    try {
      const fs = await import('fs').then(module => module.promises);
      const path = await import('path');
      
      for (const [fieldName, filePath] of Object.entries(filesToDelete)) {
        if (filePath) {
          try {
            // Convert web URL back to file system path
            const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
            const fullPath = path.resolve(cleanPath);
            
            // Check if file exists before attempting deletion
            await fs.access(fullPath);
            await fs.unlink(fullPath);
          } catch (deleteError) {
            console.warn(`⚠️ updateCarnivalHandler - Could not delete file ${filePath}:`, deleteError.message);
            // Continue with update even if file deletion fails
          }
        }
      }
    } catch (error) {
      console.error('❌ updateCarnivalHandler - Error during file deletion:', error);
      // Continue with update even if file deletion fails
    }
  }

  // Handle all uploads using shared processor (defensive against corrupted uploads)
  console.log('⚡ updateCarnivalHandler - Checking for structured uploads');
  console.log('⚡ updateCarnivalHandler - req.structuredUploads:', req.structuredUploads?.length || 0);
  if (req.structuredUploads && req.structuredUploads.length > 0) {
    try {
      const processedUploads = await processStructuredUploads(req, updateData, 'carnivals', carnival.id);
      
      // Merge processed uploads into updateData
      Object.assign(updateData, processedUploads);
    } catch (error) {
      console.error('❌ updateCarnivalHandler - Error processing uploads:', error);
      throw error;
    }
  }

  // Check if fee structure changed before updating
  const oldTeamFee = parseFloat(carnival.teamRegistrationFee) || 0;
  const oldPerPlayerFee = parseFloat(carnival.perPlayerFee) || 0;
  const newTeamFee = parseFloat(updateData.teamRegistrationFee) || 0;
  const newPerPlayerFee = parseFloat(updateData.perPlayerFee) || 0;
  
  const feeStructureChanged = (oldTeamFee !== newTeamFee) || (oldPerPlayerFee !== newPerPlayerFee);
  try {
    await carnival.update(updateData);
  } catch (error) {
    console.error('❌ updateCarnivalHandler - Error updating carnival:', error);
    throw error;
  }

  // If fee structure changed, recalculate fees for all existing registrations
  if (feeStructureChanged) {
    const registrations = await CarnivalClub.findAll({
      where: {
        carnivalId: carnival.id,
        isActive: true
      },
      attributes: ['id']
    });

    // Recalculate fees for each registration
    for (const registration of registrations) {
      try {
        await recalculateRegistrationFees(registration.id);
      } catch (error) {
        console.error(`Failed to recalculate fees for registration ${registration.id}:`, error);
      }
    }
    
    if (registrations.length > 0) {
      req.flash('info_msg', `Fee structure updated. Registration fees have been automatically recalculated for ${registrations.length} existing registration(s).`);
    }
  }

  // Check if this is an AJAX request
  const isAjax = req.xhr || req.headers.accept.indexOf('json') > -1 || req.headers['x-requested-with'] === 'XMLHttpRequest';
  console.log('⚡ updateCarnivalHandler - Final response, isAjax:', isAjax);
  
  if (isAjax) {
    // Return JSON response for AJAX requests
    return res.json({
      success: true,
      message: 'Carnival updated successfully!',
      redirectUrl: `/carnivals/${carnival.id}`
    });
  }

  req.flash('success_msg', 'Carnival updated successfully!');
  return res.redirect(`/carnivals/${carnival.id}`);
  
  } catch (error) {
    console.error('🚨 updateCarnivalHandler - UNHANDLED ERROR IN CONTROLLER:', error);
    console.error('🚨 updateCarnivalHandler - Error stack:', error.stack);
    console.error('🚨 updateCarnivalHandler - Error name:', error.name);
    console.error('🚨 updateCarnivalHandler - Error message:', error.message);
    
    // Check if this is an AJAX request
    const isAjax = req.xhr || req.headers.accept?.indexOf('json') > -1 || req.headers['x-requested-with'] === 'XMLHttpRequest';
    
    if (isAjax) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error occurred',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      });
    }
    
    req.flash('error_msg', 'An error occurred while updating the carnival. Please try again.');
    return res.redirect(`/carnivals/${req.params.id}/edit`);
  }
};

/**
 * Delete carnival
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteCarnivalHandler = async (req, res) => {
  const carnival = await Carnival.findByPk(req.params.id);

  if (!carnival) {
    req.flash('error_msg', 'Carnival not found.');
    return res.redirect('/dashboard');
  }

  // Check if user can edit this carnival (using async method for club delegate checking)
  const canEdit = await carnival.canUserEditAsync(req.user);
  if (!canEdit) {
    req.flash('error_msg', 'You can only delete carnivals hosted by your club.');
    return res.redirect('/dashboard');
  }

  // Soft delete by setting isActive to false
  await carnival.update({ isActive: false });

  req.flash('success_msg', 'Carnival deleted successfully.');
  return res.redirect('/dashboard');
};

/**
 * Take ownership of MySideline carnival
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const takeOwnershipHandler = async (req, res) => {
  // Use the Carnival model's takeOwnership method instead of mySidelineService
  const result = await Carnival.takeOwnership(req.params.id, req.user.id);

  if (result.success) {
    req.flash('success_msg', result.message);
  } else {
    req.flash('error_msg', result.message);
  }

  return res.redirect(`/carnivals/${req.params.id}`);
};

/**
 * Release ownership of MySideline carnival
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const releaseOwnershipHandler = async (req, res) => {
  // Use the Carnival model's releaseOwnership method
  const result = await Carnival.releaseOwnership(req.params.id, req.user.id);

  if (result.success) {
    req.flash('success_msg', result.message);
  } else {
    req.flash('error_msg', result.message);
  }

  return res.redirect(`/carnivals/${req.params.id}`);
};

/**
 * Trigger MySideline sync (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const syncMySidelineHandler = async (req, res) => {
  // Check if user is admin/primary delegate
  if (!req.user.isPrimaryDelegate && !req.user.isAdmin) {
    req.flash('error_msg', 'Access denied. Only administrators can sync MySideline data.');
    return res.redirect('/dashboard');
  }

  const result = await mySidelineService.syncCarnivals();

  req.flash('success_msg', `MySideline sync completed. ${result.newCarnivals} new carnivals imported.`);
  return res.redirect('/dashboard');
};

export const list = asyncHandler(listCarnivalsHandler);
export const show = asyncHandler(showCarnivalHandler);
export const getNew = asyncHandler(showCreateFormHandler);
export const postNew = asyncHandler(createCarnivalHandler);
export const getEdit = asyncHandler(showEditFormHandler);
export const postEdit = asyncHandler(updateCarnivalHandler);
export const deleteCarnival = asyncHandler(deleteCarnivalHandler);
export const takeOwnership = asyncHandler(takeOwnershipHandler);
export const releaseOwnership = asyncHandler(releaseOwnershipHandler);
export const syncMySideline = asyncHandler(syncMySidelineHandler);

// Add the missing exports that routes are expecting
export { deleteCarnival as delete }; // 'delete' alias for deleteCarnival
export const mergeCarnival = asyncHandler(async (req, res) => {
  // Placeholder for merge carnival functionality
  req.flash('error_msg', 'Merge carnival functionality not yet implemented.');
  return res.redirect(`/carnivals/${req.params.id}`);
});

export const showCarnivalSponsors = asyncHandler(async (req, res) => {
  try {
    const carnivalId = req.params.id;
    
    // Fetch the carnival
    const carnival = await Carnival.findByPk(carnivalId);
    if (!carnival) {
      req.flash('error_msg', 'Carnival not found');
      return res.redirect('/carnivals');
    }

    // Fetch current carnival sponsors using direct relationship
    const carnivalSponsors = await carnival.getCarnivalSponsors({
      where: { isActive: true },
      order: [['sponsorName', 'ASC']]
    });
    
    // Fetch all available sponsors
    const sponsors = await Sponsor.findAll({
      where: { isActive: true },
      order: [['sponsorName', 'ASC']]
    });

    res.render('shared/sponsors/sponsors', {
      title: `${carnival.title} - Sponsors`,
      entityType: 'carnival',
      entityData: carnival,
      routePrefix: `/carnivals/${carnival.id}`,
      sponsors: carnivalSponsors,
      allSponsors: sponsors,
      user: req.user
    });
  } catch (error) {
    console.error('Error showing carnival sponsors:', error);
    req.flash('error_msg', 'Failed to load carnival sponsors');
    return res.redirect(`/carnivals/${req.params.id}/edit`);
  }
});

export const showAddSponsorForm = asyncHandler(async (req, res) => {
  try {
    const carnivalId = req.params.id;
    
    // Fetch the carnival
    const carnival = await Carnival.findByPk(carnivalId, {
      include: [{
        model: Club,
        as: 'hostClub'
      }]
    });
    
    if (!carnival) {
      req.flash('error_msg', 'Carnival not found');
      return res.redirect('/carnivals');
    }

    // Fetch sponsors already linked to this carnival using direct relationship
    const carnivalSponsors = await carnival.getCarnivalSponsors({
      where: { isActive: true }
    });
    const linkedSponsorIds = carnivalSponsors.map(sponsor => sponsor.id);
    
    // Fetch available sponsors (both club sponsors and general sponsors not already linked)
    let availableSponsors = [];
    
    if (carnival.hostClub) {
      // Get sponsors linked to the hosting club
      const clubSponsors = await carnival.hostClub.getClubSponsors({
        where: { isActive: true },
        order: [['sponsorName', 'ASC']]
      });
      availableSponsors = clubSponsors.filter(sponsor => !linkedSponsorIds.includes(sponsor.id));
    }
    
    // Also get general sponsors not linked to any club and not already linked to this carnival
    const generalSponsors = await Sponsor.findAll({
      where: { 
        isActive: true,
        clubId: null, // Only sponsors not linked to clubs
        carnivalId: null, // Only sponsors not linked to carnivals
        id: { [Op.notIn]: linkedSponsorIds }
      },
      order: [['sponsorName', 'ASC']]
    });
    
    // Combine club sponsors and general sponsors
    availableSponsors = [...availableSponsors, ...generalSponsors];

    res.render('carnivals/add-sponsor', {
      title: `Add Sponsor - ${carnival.title}`,
      carnival,
      availableSponsors,
      user: req.user,
      states: AUSTRALIAN_STATES,
      sponsorshipLevels: SPONSORSHIP_LEVELS_ARRAY
    });
  } catch (error) {
    console.error('Error showing add sponsor form:', error);
    req.flash('error_msg', 'Failed to load sponsor form');
    return res.redirect(`/carnivals/${req.params.id}/sponsors`);
  }
});

export const addSponsorToCarnival = asyncHandler(async (req, res) => {
  try {
    const carnivalId = req.params.id;
    const { sponsorId, createNew, sponsorName, contactPerson, contactEmail, location, state, sponsorshipLevel, website, description } = req.body;

    // Check if carnival exists
    const carnival = await Carnival.findByPk(carnivalId);
    if (!carnival) {
      req.flash('error_msg', 'Carnival not found');
      return res.redirect('/carnivals');
    }

    let sponsor;

    if (createNew === 'true') {
      // Creating a new carnival-specific sponsor
      if (!sponsorName || sponsorName.trim().length === 0) {
        req.flash('error_msg', 'Sponsor name is required when creating a new sponsor');
        return res.redirect(`/carnivals/${carnivalId}/sponsors/add`);
      }

      // Check if a sponsor with this name already exists
      const existingSponsor = await Sponsor.findOne({
        where: {
          sponsorName: sponsorName.trim()
        }
      });

      if (existingSponsor) {
        req.flash('error_msg', `A sponsor named "${sponsorName}" already exists. Please use the "Link Existing Sponsor" option instead.`);
        return res.redirect(`/carnivals/${carnivalId}/sponsors/add`);
      }

      // Create new sponsor directly linked to carnival
      sponsor = await Sponsor.create({
        sponsorName: sponsorName.trim(),
        contactPerson: contactPerson ? contactPerson.trim() : null,
        contactEmail: contactEmail ? contactEmail.trim() : null,
        location: location ? location.trim() : null,
        state: state || null,
        sponsorshipLevel: sponsorshipLevel || null,
        website: website ? website.trim() : null,
        description: description ? description.trim() : null,
        isPubliclyVisible: true, // Carnival sponsors are publicly visible by default
        carnivalId: carnivalId, // Direct link to carnival
        createdBy: req.user.id,
        createdAt: new Date()
      });
      
    } else {
      // Copying existing sponsor to carnival
      if (!sponsorId) {
        req.flash('error_msg', 'Sponsor selection is required');
        return res.redirect(`/carnivals/${carnivalId}/sponsors/add`);
      }

      // Check if sponsor exists
      const originalSponsor = await Sponsor.findByPk(sponsorId);
      if (!originalSponsor) {
        req.flash('error_msg', 'Selected sponsor not found');
        return res.redirect(`/carnivals/${carnivalId}/sponsors/add`);
      }

      // Check if sponsor already linked to this carnival
      const existingSponsor = await Sponsor.findOne({
        where: {
          carnivalId: carnivalId,
          sponsorName: originalSponsor.sponsorName
        }
      });

      if (existingSponsor) {
        req.flash('error_msg', `${originalSponsor.sponsorName} is already linked to this carnival`);
        return res.redirect(`/carnivals/${carnivalId}/sponsors/add`);
      }

      // Create a copy of the sponsor linked to the carnival
      sponsor = await originalSponsor.createCopy({ carnivalId: carnivalId });
    }

    const actionText = createNew === 'true' ? 'created and added' : 'copied and added';
    req.flash('success_msg', `${sponsor.sponsorName} has been successfully ${actionText} to ${carnival.title}. Complete the sponsor details below.`);
    return res.redirect(`/carnivals/${carnivalId}/sponsors/${sponsor.id}/edit`);

  } catch (error) {
    console.error('Error adding sponsor to carnival:', error);
    req.flash('error_msg', 'Failed to add sponsor to carnival');
    return res.redirect(`/carnivals/${req.params.id}/sponsors/add`);
  }
});

export const removeSponsorFromCarnival = asyncHandler(async (req, res) => {
  try {
    const carnivalId = parseInt(req.params.id);
    const sponsorId = parseInt(req.params.sponsorId);

    // Check if carnival exists
    const carnival = await Carnival.findByPk(carnivalId);
    if (!carnival) {
      req.flash('error_msg', 'Carnival not found');
      return res.redirect('/carnivals');
    }

    // Check if sponsor exists and belongs to this carnival
    const sponsor = await Sponsor.findOne({
      where: {
        id: sponsorId,
        carnivalId: carnivalId
      }
    });

    if (!sponsor) {
      req.flash('error_msg', 'Sponsor not found or not associated with this carnival');
      return res.redirect(`/carnivals/${carnivalId}/sponsors`);
    }

    // Check user permissions - only admin or carnival owner can remove sponsors
    if (!req.user.isAdmin && carnival.createdByUserId !== req.user.id) {
      req.flash('error_msg', 'Access denied. You do not have permission to remove sponsors from this carnival.');
      return res.redirect(`/carnivals/${carnivalId}/sponsors`);
    }

    const sponsorName = sponsor.sponsorName;

    // DELETE the sponsor record entirely
    await sponsor.destroy();

    req.flash('success_msg', `${sponsorName} has been successfully removed from ${carnival.title}`);
    return res.redirect(`/carnivals/${carnivalId}/sponsors`);

  } catch (error) {
    console.error('Error removing sponsor from carnival:', error);
    req.flash('error_msg', 'Failed to remove sponsor from carnival');
    return res.redirect(`/carnivals/${req.params.id}/sponsors`);
  }
});

/**
 * Show edit form for carnival-specific sponsor
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const showEditCarnivalSponsor = asyncHandler(async (req, res) => {
  const { id: carnivalId, sponsorId } = req.params;

  // Check if carnival exists
  const carnival = await Carnival.findByPk(carnivalId);
  if (!carnival) {
    req.flash('error_msg', 'Carnival not found');
    return res.redirect('/carnivals');
  }

  // Check user permissions - only admin or carnival owner can edit sponsors
  if (!req.user.isAdmin && carnival.createdByUserId !== req.user.id) {
    req.flash('error_msg', 'Access denied. You do not have permission to edit sponsors for this carnival.');
    return res.redirect(`/carnivals/${carnivalId}/sponsors`);
  }

  // Find sponsor belonging to this carnival
  const sponsor = await Sponsor.findOne({
    where: { 
      id: sponsorId, 
      isActive: true,
      carnivalId: carnivalId // Ensure sponsor belongs to this carnival
    }
  });

  if (!sponsor) {
    req.flash('error_msg', 'Sponsor not found or not associated with this carnival.');
    return res.redirect(`/carnivals/${carnivalId}/sponsors`);
  }

  return res.render('shared/sponsors/edit-sponsor', {
    title: 'Edit Carnival Sponsor',
    entityType: 'carnival',
    entityData: carnival,
    routePrefix: `/carnivals/${carnival.id}`,
    sponsor,
    states: AUSTRALIAN_STATES,
    sponsorshipLevels: SPONSORSHIP_LEVELS_ARRAY,
    additionalCSS: ['/styles/sponsor.styles.css'],
  });
});

/**
 * Update carnival-specific sponsor
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateCarnivalSponsor = asyncHandler(async (req, res) => {
  const { id: carnivalId, sponsorId } = req.params;

  // Check if carnival exists
  const carnival = await Carnival.findByPk(carnivalId);
  if (!carnival) {
    req.flash('error_msg', 'Carnival not found');
    return res.redirect('/carnivals');
  }

  // Check user permissions - only admin or carnival owner can edit sponsors
  if (!req.user.isAdmin && carnival.createdByUserId !== req.user.id) {
    req.flash('error_msg', 'Access denied. You do not have permission to edit sponsors for this carnival.');
    return res.redirect(`/carnivals/${carnivalId}/sponsors`);
  }

  // Find sponsor belonging to this carnival
  const sponsor = await Sponsor.findOne({
    where: { 
      id: sponsorId, 
      isActive: true,
      carnivalId: carnivalId // Ensure sponsor belongs to this carnival
    }
  });

  if (!sponsor) {
    req.flash('error_msg', 'Sponsor not found or not associated with this carnival.');
    return res.redirect(`/carnivals/${carnivalId}/sponsors`);
  }

  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Check if this is an AJAX request
    const isAjaxRequest = req.xhr || 
                         req.headers.accept?.indexOf('json') > -1 || 
                         req.headers['content-type']?.indexOf('multipart/form-data') > -1;
    
    if (isAjaxRequest) {
      // Return JSON response for AJAX requests
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    // Traditional form submission
    req.flash('error_msg', 'Please correct the validation errors.');
    return res.redirect(`/carnivals/${carnivalId}/sponsors/${sponsorId}/edit`);
  }

  const {
    sponsorName,
    businessType,
    sponsorshipLevel,
    contactPerson,
    contactEmail,
    contactPhone,
    website,
    facebookUrl,
    instagramUrl,
    twitterUrl,
    location,
    state,
    description,
    isPubliclyVisible,
  } = req.body;

  try {
    // Prepare update data
    const updateData = {
      sponsorName: sponsorName.trim(),
      businessType: businessType ? businessType.trim() : null,
      sponsorshipLevel,
      contactPerson: contactPerson ? contactPerson.trim() : null,
      contactEmail: contactEmail ? contactEmail.trim() : null,
      contactPhone: contactPhone ? contactPhone.trim() : null,
      website: website ? website.trim() : null,
      facebookUrl: facebookUrl ? facebookUrl.trim() : null,
      instagramUrl: instagramUrl ? instagramUrl.trim() : null,
      twitterUrl: twitterUrl ? twitterUrl.trim() : null,
      location: location ? location.trim() : null,
      state,
      description: description ? description.trim() : null,
      isPubliclyVisible: isPubliclyVisible === 'true',
    };

    // Process uploaded files if present
    if (req.structuredUploads && req.structuredUploads.length > 0) {
      const processedUploads = await processStructuredUploads(req, updateData, 'carnivals', carnivalId, sponsor.id);
    } else if (req.file) {
      // Legacy fallback for direct file upload
      updateData.logoFilename = req.file.filename;
    } else {
      // Keep existing logo filename if no new upload
      updateData.logoFilename = sponsor.logoFilename;
    }

    // Update sponsor
    await sponsor.update(updateData);

    req.flash('success_msg', `Sponsor "${sponsorName}" has been updated successfully.`);
    return res.redirect(`/carnivals/${carnivalId}/sponsors`);
  } catch (error) {
    console.error('Error updating carnival sponsor:', error);
    req.flash('error_msg', 'An error occurred while updating the sponsor.');
    return res.redirect(`/carnivals/${carnivalId}/sponsors/${sponsorId}/edit`);
  }
});

export const sendEmailToAttendees = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, customMessage } = req.body;
    const user = req.user;

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessage = errors.array().map(error => error.msg).join(', ');
      req.flash('error_msg', errorMessage);
      return res.redirect(`/carnivals/${id}`);
    }

    // Validate required fields
    if (!subject || !customMessage) {
      req.flash('error_msg', 'Subject and message are required.');
      return res.redirect(`/carnivals/${id}`);
    }

    // Fetch carnival with attending clubs and their contact information
    const carnival = await Carnival.findByPk(id, {
      include: [
        {
          model: Club,
          as: 'attendingClubs',
          attributes: ['id', 'clubName', 'state', 'location', 'contactEmail', 'contactPerson'],
          through: {
            attributes: ['approvalStatus', 'contactEmail', 'contactPerson'],
            where: { isActive: true, approvalStatus: 'approved' },
          },
          required: false,
        },
      ],
    });

    if (!carnival) {
      req.flash('error_msg', 'Carnival not found.');
      return res.redirect('/carnivals');
    }

    // Check if user has permission to send emails
    const isCreator = user.id === carnival.createdByUserId;
    const isAttendingClub = user.clubId && carnival.attendingClubs.some(club => club.id === user.clubId);
    
    if (!isCreator && !isAttendingClub) {
      req.flash('error_msg', 'You do not have permission to send emails for this carnival.');
      return res.redirect(`/carnivals/${id}`);
    }

    // Filter attending clubs to only approved ones
    const approvedClubs = carnival.attendingClubs.filter(club => 
      club.CarnivalClub?.approvalStatus === 'approved'
    );

    if (approvedClubs.length === 0) {
      req.flash('error_msg', 'No approved attending clubs to email.');
      return res.redirect(`/carnivals/${id}`);
    }

    // Import and use the CarnivalEmailService
    const { CarnivalEmailService } = await import('../services/email/CarnivalEmailService.mjs');
    const emailService = new CarnivalEmailService();
    
    // Get sender name
    const senderName = `${user.firstName} ${user.lastName}`;
    
    // Send emails to attendee clubs
    const result = await emailService.sendCarnivalInfoToAttendees(
      carnival, 
      approvedClubs, 
      senderName, 
      customMessage
    );

    if (result.success) {
      req.flash('success_msg', 
        `Email successfully sent to ${result.emailsSent} attending club${result.emailsSent !== 1 ? 's' : ''}.`
      );
    } else {
      req.flash('error_msg', result.message || 'Failed to send emails to attending clubs.');
    }

    return res.redirect(`/carnivals/${id}`);

  } catch (error) {
    console.error('Error sending email to attendees:', error);
    req.flash('error_msg', 'An error occurred while sending emails. Please try again.');
    return res.redirect(`/carnivals/${req.params.id}`);
  }
});

export const showAllPlayers = asyncHandler(async (req, res) => {
  const carnivalId = req.params.id;

  // Fetch carnival with attending clubs and their players
  const carnival = await Carnival.findByPk(carnivalId, {
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['firstName', 'lastName', 'id'],
      },
      {
        model: Club,
        as: 'attendingClubs',
        attributes: ['id', 'clubName', 'state', 'location', 'logoUrl'],
        through: {
          attributes: ['approvalStatus', 'isPaid', 'playerCount'],
          where: { isActive: true },
        },
        required: false,
        include: [
          {
            model: ClubPlayer,
            as: 'players',
            attributes: ['id', 'firstName', 'lastName', 'dateOfBirth', 'email', 'shorts'],
            where: { isActive: true },
            required: false,
            include: [
              {
                model: CarnivalClubPlayer,
                as: 'carnivalAssignments',
                attributes: ['attendanceStatus', 'notes'],
                where: {
                  isActive: true,
                  '$attendingClubs.CarnivalClub.id$': {
                    [Op.col]: 'attendingClubs->players->carnivalAssignments.carnivalClubId',
                  },
                },
                required: false,
              },
            ],
          },
        ],
      },
    ],
  });

  if (!carnival) {
    req.flash('error_msg', 'Carnival not found.');
    return res.redirect('/carnivals');
  }

  // Check if user has permission to view player lists
  // Allow: carnival owner, admin users, or delegates from attending clubs
  let hasPermission = false;

  if (req.user) {
    // Check if user is admin
    if (req.user.isAdmin) {
      hasPermission = true;
    }
    // Check if user is carnival creator
    else if (carnival.createdByUserId === req.user.id) {
      hasPermission = true;
    }
    // Check if user is from an attending club
    else if (req.user.clubId) {
      const userClubAttending = carnival.attendingClubs.some(
        (club) =>
          club.id === req.user.clubId &&
          (club.CarnivalClub.approvalStatus === 'approved' ||
            club.CarnivalClub.approvalStatus === 'pending')
      );
      if (userClubAttending) {
        hasPermission = true;
      }
    }
  }

  if (!hasPermission) {
    req.flash('error_msg', 'You do not have permission to view the player list for this carnival.');
    return res.redirect(`/carnivals/${carnivalId}`);
  }

  // Build comprehensive player list with club and attendance information
  const players = [];
  const clubSummary = [];

  carnival.attendingClubs.forEach((club) => {
    const clubPlayers = club.players || [];
    let mastersCount = 0;
    let attendingCount = 0;

    clubPlayers.forEach((player) => {
      // Calculate age
      const age = player.dateOfBirth
        ? Math.floor(
            (Date.now() - new Date(player.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
          )
        : null;

      const isMasters = age && age >= 35;
      if (isMasters) mastersCount++;

      // Get attendance status from carnival assignment
      let attendanceStatus = 'Unknown';
      let attendanceNotes = '';

      if (player.carnivalAssignments && player.carnivalAssignments.length > 0) {
        const assignment = player.carnivalAssignments[0];
        switch (assignment.attendanceStatus) {
          case 'confirmed':
            attendanceStatus = 'Attending';
            attendingCount++;
            break;
          case 'tentative':
            attendanceStatus = 'Maybe';
            break;
          case 'unavailable':
            attendanceStatus = 'Not Attending';
            break;
          default:
            attendanceStatus = 'Unknown';
        }
        attendanceNotes = assignment.notes || '';
      }

      // Add player to the list with enriched data
      players.push({
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        dateOfBirth: player.dateOfBirth,
        age: age,
        email: player.email,
        shortsColour: player.shorts,
        Club: {
          id: club.id,
          clubName: club.clubName,
          state: club.state,
          location: club.location,
          logoUrl: club.logoUrl,
        },
        CarnivalClubPlayer: {
          attendanceStatus: attendanceStatus,
          notes: attendanceNotes,
        },
      });
    });

    // Add club summary
    clubSummary.push({
      clubId: club.id,
      clubName: club.clubName,
      state: club.state,
      location: club.location,
      logoUrl: club.logoUrl,
      totalPlayers: clubPlayers.length,
      mastersPlayers: mastersCount,
      attendingPlayers: attendingCount,
      approvalStatus: club.CarnivalClub.approvalStatus,
      isPaid: club.CarnivalClub.isPaid,
    });
  });

  // Sort players by club name, then by player name
  players.sort((a, b) => {
    const clubCompare = (a.Club?.clubName || '').localeCompare(b.Club?.clubName || '');
    if (clubCompare !== 0) return clubCompare;

    const nameCompare = (a.firstName || '').localeCompare(b.firstName || '');
    if (nameCompare !== 0) return nameCompare;

    return (a.lastName || '').localeCompare(b.lastName || '');
  });

  // Sort club summary by club name
  clubSummary.sort((a, b) => a.clubName.localeCompare(b.clubName));

  return res.render('carnivals/players', {
    title: `All Players - ${carnival.title}`,
    carnival: {
      id: carnival.id,
      title: carnival.title,
      date: carnival.date,
      locationAddress: carnival.locationAddress,
    },
    players,
    clubSummary,
    totalPlayers: players.length,
    totalClubs: clubSummary.length,
    additionalCSS: ['/styles/carnival.styles.css'],
  });
});

/**
 * Display carnival gallery page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const viewCarnivalGalleryHandler = asyncHandler(async (req, res) => {
  const carnivalId = parseInt(req.params.id);
  const page = parseInt(req.query.page) || 1;
  const limit = 12; // 12 images per page
  
  if (!carnivalId) {
    req.flash('error', 'Invalid carnival ID');
    return res.redirect('/carnivals');
  }

  // Find the carnival
  const carnival = await Carnival.findByPk(carnivalId);
  if (!carnival) {
    req.flash('error', 'Carnival not found');
    return res.redirect('/carnivals');
  }

  // Get gallery images for this carnival with pagination
  const ImageUpload = (await import('../models/ImageUpload.mjs')).default;
  const result = await ImageUpload.getCarnivalImages(carnivalId, { page, limit });

  // Check if user can upload images for this carnival
  let canUpload = false;
  if (req.user) {
    canUpload = await ImageUpload.canUserUploadForCarnival(req.user, carnivalId);
  }

  res.render('carnivals/gallery', {
    title: `Gallery - ${carnival.title}`,
    carnival: carnival,
    images: result.images,
    pagination: result.pagination,
    canUpload: canUpload,
    additionalCSS: ['/styles/gallery.styles.css'],
    additionalJS: ['/js/gallery-manager.js']
  });
});

export const viewGallery = viewCarnivalGalleryHandler;
