import express from 'express';
import { applySecurity } from '../../middleware/security.mjs';
import sponsorApiRoutes from './sponsors.mjs';
import debugApiRoutes from './debug.mjs';
import * as maintenanceController from '../../controllers/maintenance.controller.mjs';

const router = express.Router();

// Apply centralized API security to all routes
router.use(applySecurity);

// Register API sub-routes
router.use('/sponsors', sponsorApiRoutes);
router.use('/debug', debugApiRoutes);

// Maintenance API routes
router.get('/maintenance/status', maintenanceController.getMaintenanceStatus);

export default router;