/**
 * Maintenance Controller
 * Handles maintenance mode functionality following MVC architecture
 */

/**
 * Display maintenance page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showMaintenancePage = (req, res) => {
  const maintenanceData = {
    title: 'Site Maintenance - Old Man Footy',
    message: 'We\'re currently performing scheduled maintenance to improve your experience.',
    estimatedReturn: 'We expect to be back online soon. Please check back later.',
    contactEmail: process.env.EMAIL_FROM || 'support@oldmanfooty.au',
    appName: process.env.APP_NAME || 'Old Man Footy',
    appUrl: process.env.APP_URL || 'https://oldmanfooty.au'
  };

  res.status(503).render('maintenance', maintenanceData);
};

/**
 * API endpoint to check maintenance status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getMaintenanceStatus = (req, res) => {
  const isMaintenanceMode = process.env.FEATURE_MAINTENANCE_MODE === 'true';
  
  res.json({
    maintenanceMode: isMaintenanceMode,
    message: isMaintenanceMode ? 'Site is currently in maintenance mode' : 'Site is operational'
  });
};

module.exports = {
  showMaintenancePage,
  getMaintenanceStatus
};