import express from 'express';
import { getHelpContent, getHelpContentValidators } from '../../controllers/help.controller.mjs';

const router = express.Router();

router.get('/:pageIdentifier', getHelpContentValidators, getHelpContent);

export default router;
