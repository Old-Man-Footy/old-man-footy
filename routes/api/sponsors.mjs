import express from 'express';
import { Op } from 'sequelize';
import { asyncHandler } from '../../middleware/asyncHandler.mjs';
import { AUSTRALIAN_STATES } from '../../config/constants.mjs';
import { Sponsor, Club } from '../../models/index.mjs';

const router = express.Router();

// GET /api/sponsors - list public sponsors (with optional filters)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rawSearch = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const rawState = typeof req.query.state === 'string' ? req.query.state.trim() : '';

    const search = rawSearch && rawSearch.length <= 200 ? rawSearch : '';
    const state = AUSTRALIAN_STATES.includes(rawState) ? rawState : '';

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

    const sponsors = await Sponsor.findAll({
      where: whereClause,
      order: [['sponsorName', 'ASC']],
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

    return res.json({ success: true, data: sponsors });
  })
);

// GET /api/sponsors/:id - get a single public sponsor
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const idNum = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(idNum)) {
      return res.status(400).json({ error: { status: 400, message: 'Invalid sponsor id.' } });
    }

    const sponsor = await Sponsor.findOne({
      where: { id: idNum, isActive: true, isPubliclyVisible: true },
      include: [
        {
          model: Club,
          as: 'club',
          where: { isActive: true },
          required: false,
          attributes: ['id', 'clubName', 'state', 'location', 'logoUrl'],
        },
      ],
    });

    if (!sponsor) {
      return res.status(404).json({ error: { status: 404, message: 'Sponsor not found.' } });
    }

    return res.json({ success: true, data: sponsor });
  })
);

export default router;
