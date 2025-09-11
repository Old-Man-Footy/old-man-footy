import express from 'express';
import { applyApiSecurity } from '../../middleware/security.mjs';
import sponsorApiRoutes from './sponsors.mjs';
import imageApiRoutes from './images.mjs';
import helpApiRoutes from './help.mjs';
import * as maintenanceController from '../../controllers/maintenance.controller.mjs';

const router = express.Router();

// Apply centralized API security to all routes
router.use(applyApiSecurity);

// Register API sub-routes
router.use('/sponsors', sponsorApiRoutes);
router.use('/images', imageApiRoutes);
router.use('/help', helpApiRoutes);

// Maintenance API routes
router.get('/maintenance/status', maintenanceController.getMaintenanceStatus);

export default router;