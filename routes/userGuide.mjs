import express from 'express';
import { getUserGuide } from '../controllers/userGuide.controller.mjs';

const router = express.Router();

// GET /user-guide and GET /user-guide/:pageKey
router.get(['/', '/:pageKey'], getUserGuide);

export default router;
