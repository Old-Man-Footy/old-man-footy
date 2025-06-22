/**
 * Coming Soon Controller
 * Handles coming soon mode functionality following MVC architecture
 */

/**
 * Display coming soon page
 * @param {Object} _req - Express request object
 * @param {Object} res - Express response object
 */
export const showComingSoonPage = (_req, res) => {
  const comingSoonData = {
    title: 'Coming Soon - Old Man Footy',
    heading: 'Something Exciting is Coming!',
    message:
      "We're putting the finishing touches on Old Man Footy - your ultimate hub for Masters Rugby League.",
    subMessage:
      'Get ready to discover carnivals, connect with clubs, and be part of the growing Masters community across Australia.',
    launchMessage: 'Launch coming soon! Stay tuned for updates.',
    contactEmail: process.env.SUPPORT_EMAIL || 'support@oldmanfooty.au',
    appName: process.env.APP_NAME || 'Old Man Footy',
    appUrl: process.env.APP_URL || 'https://oldmanfooty.au',
    socialMedia: {
      facebook: process.env.SOCIAL_FACEBOOK_URL || '',
      instagram: process.env.SOCIAL_INSTAGRAM_URL || '',
      twitter: process.env.SOCIAL_TWITTER_URL || '',
    },
  };

  res.status(200).render('coming-soon', comingSoonData);
};

/**
 * API endpoint to check coming soon status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getComingSoonStatus = (req, res) => {
  const isComingSoonMode = process.env.FEATURE_COMING_SOON_MODE === 'true';

  return res.json({
    comingSoonMode: isComingSoonMode,
    message: isComingSoonMode
      ? 'Site is currently in coming soon mode'
      : 'Site is live and operational',
  });
};
