const express = require('express');
const router = express.Router();

// Import API sub-routes
const sponsorApiRoutes = require('./sponsors');
const maintenanceController = require('../../controllers/maintenance.controller');

// Register API sub-routes
router.use('/sponsors', sponsorApiRoutes);

// Maintenance API routes
router.get('/maintenance/status', maintenanceController.getMaintenanceStatus);

module.exports = router;