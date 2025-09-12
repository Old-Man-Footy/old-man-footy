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
import { AUSTRALIAN_STATES } from '../config/constants.mjs';
import mySidelineService from '../services/mySidelineIntegrationService.mjs';
import { sortSponsorsHierarchically } from '../services/sponsorSortingService.mjs';
import { asyncHandler } from '../middleware/asyncHandler.mjs';

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
    upcomingFilter = 'true'; // Default to showing upcoming events only on first page load
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
    // Allow events that either have a MySideline ID or have a MySideline sync timestamp
    const hasMySidelineMarker = carnival.mySidelineId || carnival.lastMySidelineSync;
    const canTakeOwnership =
      carnival.isActive &&
      hasMySidelineMarker &&
      !carnival.createdByUserId &&
      userWithClub &&
      userWithClub.clubId &&
      // State-based restriction: can only claim events in club's state or events with no state
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
        as: 'sponsors',
        where: { isActive: true },
        required: false,
        through: { attributes: ['displayOrder'] },
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
    userWithClub &&
    userWithClub.clubId &&
    // State-based restriction: can only claim events in your club's state or events with no state
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

  // Check if user can manage this carnival (always allow for owners/admins regardless of active status)
  const canManage =
    userWithClub &&
    (userWithClub.isAdmin ||
      carnival.createdByUserId === userWithClub.id ||
      (userWithClub.clubId &&
        carnival.creator &&
        carnival.creator.club &&
        carnival.creator.club.id === userWithClub.clubId));

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
  const sortedSponsors = sortSponsorsHierarchically(carnival.sponsors || [], 'carnival');

  return res.render('carnivals/show', {
    title: carnival.title,
    carnival: canManage ? carnival : publicCarnivalData, // Show full data to managers, obfuscated to public
    user: userWithClub, // Pass enriched user data with club information
    sponsors: sortedSponsors,
    canTakeOwnership,
    userClubRegistration,
    canRegisterClub,
    canManage,
    canMergeCarnival, // Pass merge option availability
    availableMergeTargets, // Pass available merge targets
    isInactiveCarnival: !carnival.isActive,
    isMySidelineCarnival: !!carnival.mySidelineId,
    isRegistrationActive, // Pass registration status including deadline check
    showPostCreationModal: req.query.showPostCreationModal === 'true', // Pass query parameter to view
    additionalCSS: ['/styles/carnival.styles.css'],
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

    // Handle structured file uploads after carnival creation
    if (req.structuredUploads && req.structuredUploads.length > 0) {
      const uploadUpdates = {};
      const additionalImages = [];
      const drawFiles = [];

      for (const upload of req.structuredUploads) {
        switch (upload.fieldname) {
          case 'logo':
            uploadUpdates.clubLogoURL = upload.path;
            break;
          case 'promotionalImage':
            if (!uploadUpdates.promotionalImageURL) {
              uploadUpdates.promotionalImageURL = upload.path;
            } else {
              additionalImages.push(upload.path);
            }
            break;
          case 'galleryImage':
            additionalImages.push(upload.path);
            break;
          case 'drawDocument':
            drawFiles.push({
              url: upload.path,
              filename: upload.originalname,
              title: req.body.drawTitle || `Draw Document ${drawFiles.length + 1}`,
              uploadMetadata: upload.metadata,
            });
            break;
          case 'bannerImage':
            // Store banner images in additionalImages with metadata
            additionalImages.push(upload.path);
            break;
        }
      }

      // Update carnival with file paths
      if (additionalImages.length > 0) {
        uploadUpdates.additionalImages = additionalImages;
      }

      if (drawFiles.length > 0) {
        uploadUpdates.drawFiles = drawFiles;
        // Maintain legacy compatibility
        uploadUpdates.drawFileURL = drawFiles[0].url;
        uploadUpdates.drawFileName = drawFiles[0].filename;
        uploadUpdates.drawTitle = req.body.drawTitle || drawFiles[0].title;
        uploadUpdates.drawDescription = req.body.drawDescription || '';
      }

      // Update carnival with upload information
      await carnival.update(uploadUpdates);

      // Log structured upload success
      console.log(
        `✅ Carnival ${carnival.id} created with ${req.structuredUploads.length} structured uploads`
      );
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
    // For manually created carnivals, redirect with flag to show important notices modal
    req.flash('success_msg', 'Carnival created successfully! 🎉');
    return res.redirect(`/carnivals/${carnival.id}?showPostCreationModal=true`);
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
  return res.render('carnivals/edit', {
    title: 'Edit Carnival',
    carnival,
    states,
    additionalCSS: ['/styles/carnival.styles.css'],
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
          { claimedAt: null } // Only consider unclaimed events for merging
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

    return res.render('carnivals/edit', {
      title: 'Edit Carnival',
      carnival,
      states,
      errors: errors.array(),
      user: userWithClub, // Pass user data for auto-population
      additionalCSS: ['/styles/carnival.styles.css'],
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

  // Handle structured file uploads (including draw documents)
  if (req.structuredUploads && req.structuredUploads.length > 0) {
    const existingAdditionalImages = carnival.additionalImages || [];
    const existingDrawFiles = carnival.drawFiles || [];

    for (const upload of req.structuredUploads) {
      switch (upload.fieldname) {
        case 'logo':
          updateData.clubLogoURL = upload.path;
          console.log(`📸 Updated carnival ${carnival.id} logo: ${upload.path}`);
          break;
        case 'promotionalImage':
          updateData.promotionalImageURL = upload.path;
          console.log(`📸 Updated carnival ${carnival.id} promotional image: ${upload.path}`);
          break;
        case 'galleryImage':
          existingAdditionalImages.push(upload.path);
          updateData.additionalImages = existingAdditionalImages;
          console.log(`📸 Added gallery image to carnival ${carnival.id}: ${upload.path}`);
          break;
        case 'drawDocument':
          const newDrawFile = {
            url: upload.path,
            filename: upload.originalname,
            title: req.body.drawTitle || `Draw Document ${existingDrawFiles.length + 1}`,
            uploadMetadata: upload.metadata,
          };
          existingDrawFiles.push(newDrawFile);
          updateData.drawFiles = existingDrawFiles;

          // Update legacy fields with first draw file
          if (existingDrawFiles.length === 1) {
            updateData.drawFileURL = newDrawFile.url;
            updateData.drawFileName = newDrawFile.filename;
            updateData.drawTitle = req.body.drawTitle || newDrawFile.title;
            updateData.drawDescription = req.body.drawDescription || '';
          }
          console.log(`📄 Added draw document to carnival ${carnival.id}: ${upload.path}`);
          break;
      }
    }
  }

  await carnival.update(updateData);

  req.flash('success_msg', 'Carnival updated successfully!');
  return res.redirect(`/carnivals/${carnival.id}`);
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

  req.flash('success_msg', `MySideline sync completed. ${result.newCarnivals} new events imported.`);
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
  // Placeholder for carnival sponsors functionality
  req.flash('error_msg', 'Carnival sponsors functionality not yet implemented.');
  return res.redirect(`/carnivals/${req.params.id}`);
});

export const addSponsorToCarnival = asyncHandler(async (req, res) => {
  // Placeholder for add sponsor functionality
  req.flash('error_msg', 'Add sponsor functionality not yet implemented.');
  return res.redirect(`/carnivals/${req.params.id}/sponsors`);
});

export const removeSponsorFromCarnival = asyncHandler(async (req, res) => {
  // Placeholder for remove sponsor functionality
  req.flash('error_msg', 'Remove sponsor functionality not yet implemented.');
  return res.redirect(`/carnivals/${req.params.id}/sponsors`);
});

export const sendEmailToAttendees = asyncHandler(async (req, res) => {
  // Placeholder for email attendees functionality
  req.flash('error_msg', 'Email attendees functionality not yet implemented.');
  return res.redirect(`/carnivals/${req.params.id}`);
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

  // Get gallery images for this carnival
  const { ImageUpload } = await import('../models/index.mjs');
  const images = await ImageUpload.getCarnivalImages(carnivalId);

  // Check if user can upload images for this carnival
  let canUpload = false;
  if (req.user) {
    canUpload = await ImageUpload.canUserUploadForCarnival(req.user, carnivalId);
  }

  res.render('carnivals/gallery', {
    title: `Gallery - ${carnival.title}`,
    carnival: carnival,
    images: images,
    canUpload: canUpload,
    additionalCSS: ['/styles/gallery.styles.css'],
    additionalJS: ['/js/gallery-manager.js']
  });
});

export const viewGallery = viewCarnivalGalleryHandler;
