import express from 'express';
import sponsorApiRoutes from './sponsors.mjs';
import * as maintenanceController from '../../controllers/maintenance.controller.mjs';

const router = express.Router();

// Register API sub-routes
router.use('/sponsors', sponsorApiRoutes);

// Maintenance API routes
router.get('/maintenance/status', maintenanceController.getMaintenanceStatus);

export default router;