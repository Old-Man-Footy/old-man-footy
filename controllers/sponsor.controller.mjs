/**
 * Sponsor Controller - MVC Architecture Implementation
 *
 * Handles sponsor management, public listings, and sponsor profile operations.
 * Follows strict MVC separation of concerns as outlined in best practices.
 */

import { Sponsor, Club } from '../models/index.mjs';
import { Op } from 'sequelize';
import { validationResult } from 'express-validator';
import { AUSTRALIAN_STATES, SPONSORSHIP_LEVELS_ARRAY, SPONSORSHIP_LEVELS, SPONSORSHIP_LEVEL_ORDER } from '../config/constants.mjs';
import { asyncHandler } from '../middleware/asyncHandler.mjs';
import { processStructuredUploads } from '../utils/uploadProcessor.mjs';

/**
 * Display public sponsor listings with search and filter options
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const showSponsorListings = asyncHandler(async (req, res) => {
  const { search, state, businessType, sponsorshipLevel } = req.query;

  // Build where clause for filters
  const whereClause = {
    isActive: true,
    isPubliclyVisible: true,
  };

  if (search) {
    whereClause[Op.or] = [
      { sponsorName: { [Op.like]: `%${search}%` } },
      { businessType: { [Op.like]: `%${search}%` } },
      { location: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
    ];
  }

  if (state) {
    whereClause.state = state;
  }
  if (sponsorshipLevel) {
    whereClause.sponsorshipLevel = sponsorshipLevel;
  }

  const sponsors = await Sponsor.findAll({
    where: whereClause,
    order: [
      [
        { 
          raw: `CASE 
            WHEN sponsorshipLevel = '${SPONSORSHIP_LEVELS.GOLD}' THEN ${SPONSORSHIP_LEVEL_ORDER[SPONSORSHIP_LEVELS.GOLD]}
            WHEN sponsorshipLevel = '${SPONSORSHIP_LEVELS.SILVER}' THEN ${SPONSORSHIP_LEVEL_ORDER[SPONSORSHIP_LEVELS.SILVER]}
            WHEN sponsorshipLevel = '${SPONSORSHIP_LEVELS.BRONZE}' THEN ${SPONSORSHIP_LEVEL_ORDER[SPONSORSHIP_LEVELS.BRONZE]}
            WHEN sponsorshipLevel = '${SPONSORSHIP_LEVELS.SUPPORTING}' THEN ${SPONSORSHIP_LEVEL_ORDER[SPONSORSHIP_LEVELS.SUPPORTING]}
            WHEN sponsorshipLevel = '${SPONSORSHIP_LEVELS.IN_KIND}' THEN ${SPONSORSHIP_LEVEL_ORDER[SPONSORSHIP_LEVELS.IN_KIND]}
            ELSE 6
          END`
        }, 
        'ASC'
      ],
      ['sponsorName', 'ASC']
    ],
    include: [
      {
        model: Club,
        as: 'club',
        where: { isActive: true },
        required: false,
        attributes: ['id', 'clubName', 'state'],
      },
    ],
  });

  return res.render('sponsors/list', {
    title: 'Find Masters Rugby League Sponsors',
    sponsors,
  filters: { search, state, businessType, sponsorshipLevel },
    states: AUSTRALIAN_STATES,
    sponsorshipLevels: SPONSORSHIP_LEVELS_ARRAY,
    additionalCSS: ['/styles/sponsor.styles.css'],
  });
});

/**
 * Display individual sponsor profile page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const showSponsorProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sponsor = await Sponsor.findOne({
    where: {
      id,
      isActive: true,
      isPubliclyVisible: true,
    },
    include: [
      {
        model: Club,
        as: 'club',
        where: { isActive: true, isPubliclyListed: true },
        required: false,
        attributes: ['id', 'clubName', 'state', 'location', 'logoUrl'],
      },
    ],
  });

  if (!sponsor) {
    req.flash('error_msg', 'Sponsor not found.');
    return res.redirect('/sponsors');
  }

  return res.render('sponsors/show', {
    title: `${sponsor.sponsorName} - Sponsor Profile`,
    sponsor,
    club: sponsor.club || null,
    user: req.user || null,
    additionalCSS: ['/styles/sponsor.styles.css'],
  });
});

/**
 * Show sponsor creation form (for admins only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const showCreateSponsor = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.isAdmin) {
    req.flash('error_msg', 'Access denied. Admin privileges required.');
    return res.redirect('/dashboard');
  }

  const clubs = await Club.findAll({
    where: { isActive: true },
    order: [['clubName', 'ASC']],
    attributes: ['id', 'clubName', 'state'],
  });

  return res.render('sponsors/create', {
    title: 'Add New Sponsor',
    user: req.user,
  states: AUSTRALIAN_STATES,
    sponsorshipLevels: SPONSORSHIP_LEVELS_ARRAY,
    additionalCSS: ['/styles/sponsor.styles.css'],
    errors: [],
    formData: {},
    clubs,
  });
});

/**
 * Create a new sponsor (club-specific)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createSponsor = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.isAdmin) {
    req.flash('error_msg', 'Access denied. Admin privileges required.');
    return res.redirect('/dashboard');
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error_msg', 'Please correct the validation errors.');
    const clubs = await Club.findAll({ where: { isActive: true }, order: [['clubName', 'ASC']], attributes: ['id', 'clubName', 'state'] });
    return res.render('sponsors/create', {
      title: 'Add New Sponsor',
      user: req.user,
      states: AUSTRALIAN_STATES,
      sponsorshipLevels: SPONSORSHIP_LEVELS_ARRAY,
      errors: errors.array(),
      formData: req.body,
      additionalCSS: ['/styles/sponsor.styles.css'],
      clubs,
    });
  }

  const {
    sponsorName,
    businessType,
    location,
    state,
    description,
    contactPerson,
    contactEmail,
    contactPhone,
    website,
    facebookUrl,
    instagramUrl,
    twitterUrl,
    linkedinUrl,
    sponsorshipLevel,
    isPubliclyVisible,
    clubId,
  } = req.body;

  // Validate clubId
  const club = await Club.findOne({ where: { id: clubId, isActive: true } });
  if (!club) {
    req.flash('error_msg', 'Invalid club selected.');
    return res.redirect('/sponsors/create');
  }

  // Prepare sponsor data
  const sponsorData = {
    sponsorName: sponsorName?.trim(),
    businessType: businessType?.trim(),
    location: location?.trim(),
    state,
    description: description?.trim(),
    contactPerson: contactPerson?.trim(),
    contactEmail: contactEmail?.trim(),
    contactPhone: contactPhone?.trim(),
    website: website?.trim(),
    facebookUrl: facebookUrl?.trim(),
    instagramUrl: instagramUrl?.trim(),
    twitterUrl: twitterUrl?.trim(),
    linkedinUrl: linkedinUrl?.trim(),
    sponsorshipLevel,
    isPubliclyVisible: isPubliclyVisible === 'on',
    clubId: club.id,
  };

  const sponsor = await Sponsor.create(sponsorData);

  req.flash('success_msg', 'Sponsor created successfully! You can now add images and additional details.');
  return res.redirect(`/sponsors/${sponsor.id}/edit`);
});

/**
 * Show sponsor edit form (for admins only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const showEditSponsor = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.isAdmin) {
    req.flash('error_msg', 'Access denied. Admin privileges required.');
    return res.redirect('/dashboard');
  }

  const { id } = req.params;

  const sponsor = await Sponsor.findOne({
    where: { id, isActive: true },
    include: [
      {
        model: Club,
        as: 'club',
        where: { isActive: true },
        required: false,
        attributes: ['id', 'clubName', 'state'],
      },
    ],
  });

  if (!sponsor) {
    req.flash('error_msg', 'Sponsor not found.');
    return res.redirect('/sponsors');
  }

  const clubs = await Club.findAll({ where: { isActive: true }, order: [['clubName', 'ASC']], attributes: ['id', 'clubName', 'state'] });

  return res.render('sponsors/edit', {
    title: 'Edit Sponsor',
    sponsor,
    states: AUSTRALIAN_STATES,
    sponsorshipLevels: SPONSORSHIP_LEVELS_ARRAY,
    additionalCSS: ['/styles/sponsor.styles.css'],
    clubs,
  });
});

/**
 * Update sponsor information (club-specific)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateSponsor = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.isAdmin) {
    req.flash('error_msg', 'Access denied. Admin privileges required.');
    return res.redirect('/dashboard');
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error_msg', 'Please correct the validation errors.');
    return res.redirect(`/sponsors/${req.params.id}/edit`);
  }

  const { id } = req.params;
  const sponsor = await Sponsor.findOne({
    where: { id, isActive: true },
  });

  if (!sponsor) {
    req.flash('error_msg', 'Sponsor not found.');
    return res.redirect('/sponsors');
  }

  const {
    sponsorName,
    businessType,
    location,
    state,
    description,
    contactPerson,
    contactEmail,
    contactPhone,
    website,
    facebookUrl,
    instagramUrl,
    twitterUrl,
    linkedinUrl,
    sponsorshipLevel,
    isPubliclyVisible,
    clubId,
  } = req.body;

  // Validate clubId
  const club = await Club.findOne({ where: { id: clubId, isActive: true } });
  if (!club) {
    req.flash('error_msg', 'Invalid club selected.');
    return res.redirect(`/sponsors/${id}/edit`);
  }

  // Prepare update data
  const updateData = {
    sponsorName: sponsorName?.trim(),
    businessType: businessType?.trim(),
    location: location?.trim(),
    state,
    description: description?.trim(),
    contactPerson: contactPerson?.trim(),
    contactEmail: contactEmail?.trim(),
    contactPhone: contactPhone?.trim(),
    website: website?.trim(),
    facebookUrl: facebookUrl?.trim(),
    instagramUrl: instagramUrl?.trim(),
    twitterUrl: twitterUrl?.trim(),
    linkedinUrl: linkedinUrl?.trim(),
    sponsorshipLevel,
    isPubliclyVisible: isPubliclyVisible === 'on',
    clubId: club.id,
  };

  // Process structured uploads using defensive shared utility
  const processedUpdateData = processStructuredUploads(req, updateData, 'sponsor', sponsor.id);

  await sponsor.update(processedUpdateData);

  req.flash('success_msg', 'Sponsor updated successfully!');
  return res.redirect(`/sponsors/${sponsor.id}`);
});

/**
 * Delete/deactivate a sponsor
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteSponsor = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.',
    });
  }

  const { id } = req.params;
  const sponsor = await Sponsor.findOne({
    where: { id, isActive: true },
  });

  if (!sponsor) {
    return res.status(404).json({
      success: false,
      message: 'Sponsor not found.',
    });
  }

  // Soft delete by setting isActive to false
  await sponsor.update({ isActive: false });

  return res.json({
    success: true,
    message: 'Sponsor deleted successfully.',
  });
});

/**
 * Toggle sponsor active status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const toggleSponsorStatus = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.',
    });
  }

  const { id } = req.params;
  const { isActive } = req.body;

  const sponsor = await Sponsor.findByPk(id);

  if (!sponsor) {
    return res.status(404).json({
      success: false,
      message: 'Sponsor not found.',
    });
  }

  await sponsor.update({ isActive: Boolean(isActive) });

  return res.json({
    success: true,
    message: `Sponsor ${isActive ? 'activated' : 'deactivated'} successfully.`,
    isActive: sponsor.isActive,
  });
});
/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Edit distance
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}
