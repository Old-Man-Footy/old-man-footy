/**
 * User Guide Controller - MVC Architecture Implementation
 *
 * Handles user guide display and documentation-related operations.
 * Follows strict MVC separation of concerns as outlined in best practices.
 */

import { asyncHandler } from '../middleware/asyncHandler.mjs';

/**
 * Display user guide page with authentication-based content
 * Shows a set of guide pages (one screenshot per page) and uses
 * `req.user` presence to decide whether to serve the delegate guide
 * or the standard guide.
 *
 * NOTE: This intentionally checks only whether a user is logged in
 * (i.e. `req.user` is truthy) as requested by the product owner.
 */
export const getUserGuide = asyncHandler(async (req, res) => {
  // Consider any truthy req.user as authenticated (product decision: check presence only)
  const isAuthenticated = !!req.user;

  // Base folder for screenshots served from public/
  const screenshotBase = isAuthenticated ? '/screenshots/delegate-user' : '/screenshots/standard-user';

  // Define the canonical pages and their metadata. These are
  // standalone EJS pages (brand-new content), not derived from
  // any markdown source.
  const pages = [
    {
      key: 'dashboard',
      title: 'Dashboard',
      url: '/dashboard',
      screenshot: 'dashboard.png',
      description: 'Overview of your site dashboard and quick stats.',
      authRequired: true,
      details: [
        'At-a-glance statistics about your club and events',
        'Quick actions for viewing, editing or registering carnivals',
        'Shortcuts to club management and reports'
      ]
    },
    {
      key: 'club-players',
      title: 'Club Players',
      url: '/clubs/players',
      screenshot: 'club-players.png',
      description: 'List and manage players associated with your club.',
      authRequired: true,
      details: [
        'Add, edit and remove players from your club roster',
        'Manage player contact and medical details',
        'Assign players to carnival teams and track availability'
      ]
    },
    {
      key: 'clubs-manage',
      title: 'Manage Club',
      url: '/clubs/manage',
  screenshot: 'club-manage.png',
      description: 'Edit core club details and settings.',
      authRequired: true,
      details: [
        'Update club profile, description and meeting details',
        'Upload and manage club logos and images',
        'Maintain contact and social links for your club'
      ]
    },
    {
      key: 'alternate-names',
      title: 'Alternate Names',
      url: '/clubs/manage/alternate-names',
  screenshot: 'club-manage-alternate-names.png',
      description: 'Add or remove alternate names for the club.',
      authRequired: true,
      details: [
        'Create alternate display names (abbreviations, nicknames)',
        'Improve searchability of your club across the site',
        'Edit or remove outdated names as needed'
      ]
    },
    {
      key: 'manage-sponsors',
      title: 'Manage Sponsors',
      url: '/clubs/manage/sponsors',
  screenshot: 'club-manage-sponsors.png',
      description: 'Manage sponsors attached to this club.',
      authRequired: true,
      details: [
        'Add sponsors with logos, descriptions and links',
        'Toggle public visibility for sponsor listings',
        'Edit sponsor information and replace logos'
      ]
    },
    {
      key: 'sponsor-detail',
      title: 'Sponsor Details',
      url: '/sponsors/:id',
      screenshot: 'sponsor-detail.png',
      description: 'View detailed information for a sponsor.',
  authRequired: true,
      details: [
        'See public sponsor profile and contact links',
        'Understand visibility and how sponsors appear on club pages',
        'Edit sponsor details if you have permission'
      ]
    },
    {
      key: 'add-player',
      title: 'Add Player',
      url: '/clubs/players/add',
      screenshot: 'club-players-add.png',
      description: 'Use this form to add a new club player.',
      authRequired: true,
      details: [
        'Complete required identity and contact fields',
        'Provide emergency contacts and medical notes',
        'Save the record to add the player to your roster'
      ]
    },
    // Delegate-specific workflows not previously listed
    {
      key: 'create-carnival',
      title: 'Create Carnival',
      url: '/carnivals/create',
      screenshot: 'create-carnival.png',
      description: 'Create and configure a new carnival event.',
      authRequired: true,
      details: [
        'Enter event name, date, location and registration settings',
        'Add participating clubs and set team limits',
        'Publish the carnival when ready to accept registrations'
      ]
    },
    {
      key: 'create-team',
      title: 'Create Team',
      url: '/teams/create',
      screenshot: 'create-team.png',
      description: 'Create a new team for carnival entries.',
      authRequired: true,
      details: [
        'Assign players to a team and set team details',
        'Choose team grade and captain/coach contacts',
        'Save and link team to a carnival entry'
      ]
    },
    {
      key: 'claim-carnival',
      title: 'Claim Carnival',
      url: '/carnivals/claim',
      screenshot: 'claim-carnival.png',
      description: 'Claim an unclaimed carnival or request organiser rights.',
      authRequired: true,
      details: [
        'Search for unclaimed carnivals by name or date',
        'Submit a claim request with evidence of organisation',
        'Manage claim status and communications'
      ]
    },
    // Public pages for non-authenticated users
    {
      key: 'homepage',
      title: 'Homepage',
      url: '/',
      screenshot: 'homepage-overview.png',
      description: 'Platform overview and entry point for all visitors.',
      authRequired: false,
      details: [
        'Overview of recent updates and announcements',
        'Quick links to Carnivals, Clubs, and Sponsors',
        'Access to register or log in for full features'
      ]
    },
    {
      key: 'carnivals',
      title: 'Carnivals',
      url: '/carnivals',
      screenshot: 'carnivals-listing.png',
      description: 'Browse upcoming Masters Rugby League events.',
      authRequired: false,
      details: [
        'Filter and search events by location and date',
        'View event details and registration links',
        'See which clubs are participating'
      ]
    },
    {
      key: 'clubs',
      title: 'Clubs Directory',
      url: '/clubs',
      screenshot: 'clubs-directory.png',
      description: 'Find Masters Rugby League clubs across Australia.',
      authRequired: false,
      details: [
        'Search clubs by name, state, or region',
        'View club profiles and contact information',
        'Discover local clubs and opportunities to join'
      ]
    },
    {
      key: 'sponsors',
      title: 'Sponsors',
      url: '/sponsors',
      screenshot: 'sponsors-network.png',
      description: 'Explore businesses supporting Masters Rugby League.',
      authRequired: false,
      details: [
        'Browse sponsor directory and partnership information',
        'See sponsor profiles and contact links',
        'Learn how to become a sponsor'
      ]
    },
    {
      key: 'contact',
      title: 'Contact',
      url: '/contact',
      screenshot: 'contact-page.png',
      description: 'Get support or ask questions about the platform.',
      authRequired: false,
      details: [
        'Submit enquiries through the contact form',
        'Find support email addresses and resources',
        'Report issues or request help'
      ]
    }
  ];

  // Map to include screenshot URLs. Use per-page base so public pages keep
  // their standard screenshots while delegate-only pages use the delegate folder.
  const pagesMap = Object.fromEntries(pages.map(p => {
    const base = p.authRequired ? '/screenshots/delegate-user' : '/screenshots/standard-user';
    return [p.key, { ...p, screenshotUrl: `${base}/${p.screenshot}` }];
  }));

  // Also prepare a pages array where each page has screenshotUrl included so
  // the index view can render thumbnails without needing per-page rendering.
  const pagesWithUrls = pages.map(p => {
    const base = p.authRequired ? '/screenshots/delegate-user' : '/screenshots/standard-user';
    return { ...p, screenshotUrl: `${base}/${p.screenshot}` };
  });

  // If a page key is requested (route param), render that specific EJS page
  const requestedKey = req.params && req.params.pageKey ? String(req.params.pageKey) : null;

  if (requestedKey) {
    const page = pagesMap[requestedKey];
    if (!page) {
      // Unknown page -- 404
      return res.status(404).render('error', { title: 'Not Found', message: 'User guide page not found', error: {} , user: req.user || null });
    }

    return res.render(`user-guide/${requestedKey}`, {
      title: page.title + ' — User Guide',
      page,
      pages: pagesWithUrls,
      user: req.user || null,
      isAuthenticated,
      additionalCSS: ['/styles/user-guide.styles.css']
    });
  }

  // No specific page requested: render an index listing the available guide pages
  return res.render('user-guide/index', {
    title: isAuthenticated ? 'Club Delegate User Guide' : 'Old Man Footy User Guide',
    pages: pagesWithUrls,
    user: req.user || null,
    isAuthenticated,
    additionalCSS: ['/styles/user-guide.styles.css']
  });
});
