const express = require('express');
const router = express.Router();

// Import API sub-routes
const sponsorApiRoutes = require('./sponsors');

// Register API sub-routes
router.use('/sponsors', sponsorApiRoutes);

module.exports = router;