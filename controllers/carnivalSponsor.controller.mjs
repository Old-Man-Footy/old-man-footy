/**
 * CarnivalSponsor Controller - Junction Table Management
 *
 * Handles CRUD operations for carnival-sponsor relationships
 * for the Old Man Footy platform.
 */

import { CarnivalSponsor, Carnival, Sponsor } from '../models/index.mjs';
import { Op } from 'sequelize';
import { wrapControllers } from '../middleware/asyncHandler.mjs';
import { SPONSORSHIP_LEVELS } from '../config/constants.mjs';

/**
 * Create a new carnival-sponsor relationship
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createCarnivalSponsor = async (req, res) => {
  const {
    carnivalId,
    sponsorId,
    sponsorshipLevel,
    sponsorshipValue,
    packageDetails,
    displayOrder,
    logoDisplaySize,
    includeInProgram,
    includeOnWebsite,
    notes,
  } = req.body;

  // Validate required fields
  if (!carnivalId || !sponsorId) {
    return res.status(400).json({
      success: false,
      message: 'Carnival ID and Sponsor ID are required',
    });
  }

  // Check if carnival and sponsor exist
  const carnival = await Carnival.findByPk(carnivalId);
  const sponsor = await Sponsor.findByPk(sponsorId);

  if (!carnival) {
    return res.status(404).json({
      success: false,
      message: 'Carnival not found',
    });
  }

  if (!sponsor) {
    return res.status(404).json({
      success: false,
      message: 'Sponsor not found',
    });
  }

  // Check for existing active relationship
  const existingRelationship = await CarnivalSponsor.findOne({
    where: {
      carnivalId,
      sponsorId,
      isActive: true,
    },
  });

  if (existingRelationship) {
    return res.status(409).json({
      success: false,
      message:
        'An active sponsorship relationship already exists between this carnival and sponsor',
    });
  }

  // Set default sponsorship level if not provided
  let validSponsorshipLevel = sponsorshipLevel;
  if (!validSponsorshipLevel) {
    validSponsorshipLevel = SPONSORSHIP_LEVELS.BRONZE;
  }

  // Validate sponsorship level using constants
  if (!Object.values(SPONSORSHIP_LEVELS).includes(validSponsorshipLevel)) {
    return res.status(400).json({
      error: {
        status: 400,
        message: `Invalid sponsorship level. Must be one of: ${Object.values(
          SPONSORSHIP_LEVELS
        ).join(', ')}`,
      },
    });
  }

  // Create the relationship
  const carnivalSponsor = await CarnivalSponsor.create({
    carnivalId,
    sponsorId,
    sponsorshipLevel: validSponsorshipLevel,
    sponsorshipValue: sponsorshipValue || null,
    packageDetails: packageDetails || null,
    displayOrder: displayOrder || 0,
    logoDisplaySize: logoDisplaySize || 'Medium',
    includeInProgram: includeInProgram !== undefined ? includeInProgram : true,
    includeOnWebsite: includeOnWebsite !== undefined ? includeOnWebsite : true,
    notes: notes || null,
  });

  // Fetch the created relationship with includes
  const createdRelationship = await CarnivalSponsor.findByPk(carnivalSponsor.id, {
    include: [
      { model: Carnival, as: 'carnival' },
      { model: Sponsor, as: 'sponsor' },
    ],
  });

  res.status(201).json({
    success: true,
    message: 'Carnival-sponsor relationship created successfully',
    data: createdRelationship,
  });
};

/**
 * Get all carnival-sponsor relationships with filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getCarnivalSponsors = async (req, res) => {
  const {
    carnivalId,
    sponsorId,
    sponsorshipLevel,
    isActive = 'true',
    page = 1,
    limit = 50,
  } = req.query;

  const where = {};

  if (carnivalId) where.carnivalId = carnivalId;
  if (sponsorId) where.sponsorId = sponsorId;
  if (sponsorshipLevel) where.sponsorshipLevel = sponsorshipLevel;
  if (isActive !== 'all') where.isActive = isActive === 'true';

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const { count, rows } = await CarnivalSponsor.findAndCountAll({
    where,
    include: [
      { model: Carnival, as: 'carnival' },
      { model: Sponsor, as: 'sponsor' },
    ],
    order: [
      ['displayOrder', 'ASC'],
      ['sponsorshipLevel', 'ASC'],
      ['createdAt', 'DESC'],
    ],
    limit: parseInt(limit),
    offset,
  });

  return res.json({
    success: true,
    data: {
      relationships: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        totalItems: count,
        itemsPerPage: parseInt(limit),
      },
    },
  });
};

/**
 * Get a specific carnival-sponsor relationship
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getCarnivalSponsor = async (req, res) => {
  const { id } = req.params;

  const carnivalSponsor = await CarnivalSponsor.findByPk(id, {
    include: [
      { model: Carnival, as: 'carnival' },
      { model: Sponsor, as: 'sponsor' },
    ],
  });

  if (!carnivalSponsor) {
    return res.status(404).json({
      success: false,
      message: 'Carnival-sponsor relationship not found',
    });
  }

  return res.json({
    success: true,
    data: carnivalSponsor,
  });
};

/**
 * Update a carnival-sponsor relationship
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateCarnivalSponsor = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const carnivalSponsor = await CarnivalSponsor.findByPk(id);

  if (!carnivalSponsor) {
    return res.status(404).json({
      success: false,
      message: 'Carnival-sponsor relationship not found',
    });
  }

  // Update the relationship
  await carnivalSponsor.update(updateData);

  // Fetch updated relationship with includes
  const updatedRelationship = await CarnivalSponsor.findByPk(id, {
    include: [
      { model: Carnival, as: 'carnival' },
      { model: Sponsor, as: 'sponsor' },
    ],
  });

  return res.json({
    success: true,
    message: 'Carnival-sponsor relationship updated successfully',
    data: updatedRelationship,
  });
};

/**
 * Delete (deactivate) a carnival-sponsor relationship
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteCarnivalSponsor = async (req, res) => {
  const { id } = req.params;
  const { permanent = false } = req.query;

  const carnivalSponsor = await CarnivalSponsor.findByPk(id);

  if (!carnivalSponsor) {
    return res.status(404).json({
      success: false,
      message: 'Carnival-sponsor relationship not found',
    });
  }

  if (permanent === 'true') {
    // Permanent deletion
    await carnivalSponsor.destroy();
    return res.json({
      success: true,
      message: 'Carnival-sponsor relationship permanently deleted',
    });
  } else {
    // Soft delete (deactivate)
    await carnivalSponsor.update({
      isActive: false,
    });
    return res.json({
      success: true,
      message: 'Carnival-sponsor relationship deactivated',
    });
  }
};

/**
 * Get sponsors for a specific carnival
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getCarnivalSponsorsForCarnival = async (req, res) => {
  const { carnivalId } = req.params;
  const { activeOnly = 'true' } = req.query;

  const activeRelationships = await CarnivalSponsor.getActiveForCarnival(carnivalId);

  return res.json({
    success: true,
    data: {
      carnivalId: parseInt(carnivalId),
      sponsors: activeRelationships,
    },
  });
};

/**
 * Get carnivals for a specific sponsor
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getCarnivalsForSponsor = async (req, res) => {
  const { sponsorId } = req.params;

  const activeRelationships = await CarnivalSponsor.getActiveForSponsor(sponsorId);

  return res.json({
    success: true,
    data: {
      sponsorId: parseInt(sponsorId),
      carnivals: activeRelationships,
    },
  });
};

/**
 * Get sponsorship summary for a carnival
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getCarnivalSponsorshipSummary = async (req, res) => {
  const { carnivalId } = req.params;

  const summary = await CarnivalSponsor.getSponsorshipSummary(carnivalId);

  return res.json({
    success: true,
    data: {
      carnivalId: parseInt(carnivalId),
      summary,
    },
  });
};

/**
 * Reorder carnival sponsors (update display order)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const reorderCarnivalSponsors = async (req, res) => {
  const { carnivalId } = req.params;
  const { sponsorOrders } = req.body; // Array of { id, displayOrder }

  if (!Array.isArray(sponsorOrders)) {
    return res.status(400).json({
      success: false,
      message: 'sponsorOrders must be an array',
    });
  }

  // Update display orders
  const updatePromises = sponsorOrders.map(({ id, displayOrder }) =>
    CarnivalSponsor.update(
      { displayOrder },
      {
        where: {
          id,
          carnivalId,
          isActive: true,
        },
      }
    )
  );

  await Promise.all(updatePromises);

  // Fetch updated sponsors
  const updatedSponsors = await CarnivalSponsor.getActiveForCarnival(carnivalId);

  return res.json({
    success: true,
    message: 'Carnival sponsor display order updated successfully',
    data: {
      carnivalId: parseInt(carnivalId),
      sponsors: updatedSponsors,
    },
  });
};
