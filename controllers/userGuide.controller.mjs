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
  const isAdmin = req.user && req.user.IsAdmin === true;

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
    {
      key: 'player-csv-import',
      title: 'Import Players from CSV',
      url: '/clubs/players/csv-import',
      screenshot: 'player-csv-import.png',
      description: 'Bulk import player data using CSV files.',
      authRequired: true,
      details: [
        'Download CSV template with required columns',
        'Fill template with player information',
        'Upload and validate data before importing',
        'Review import results and handle errors'
      ]
    },
    {
      key: 'player-medical-info',
      title: 'Player Medical Information',
      url: '/clubs/players/add',
      screenshot: 'player-medical-info.png',
      description: 'Recording medical information and emergency contacts for players.',
      authRequired: true,
      details: [
        'Document allergies, medications and medical conditions',
        'Record emergency contact information',
        'Follow best practices for medical data organization',
        'Update information as needed for player safety'
      ]
    },
    {
      key: 'player-bulk-operations',
      title: 'Player Management Strategies',
      url: '/clubs/players',
      screenshot: 'player-bulk-operations.png',
      description: 'Efficient strategies for managing multiple players and player data.',
      authRequired: true,
      details: [
        'CSV import techniques for bulk player management',
        'Organizing and categorizing player information',
        'Communication strategies for player groups',
        'Best practices for large player databases'
      ]
    },
    {
      key: 'carnival-registration',
      title: 'Carnival Club Registration',
      url: '/carnivals',
      screenshot: 'carnival-registration.png',
      description: 'How clubs register for carnivals and manage team participation.',
      authRequired: true,
      details: [
        'Register your club for carnival participation',
        'Manage team rosters and player assignments',
        'Coordinate with carnival organizers',
        'Track registration status and updates'
      ]
    },
    {
      key: 'carnival-team-management',
      title: 'Carnival Team Management',
      url: '/carnivals',
      screenshot: 'carnival-team-management.png',
      description: 'Managing teams within carnivals after registration approval.',
      authRequired: true,
      details: [
        'Build and manage carnival team rosters',
        'Coordinate player assignments and logistics',
        'Handle team communication and preparation',
        'Manage team changes and player availability'
      ]
    },
    {
      key: 'carnival-attendee-management',
      title: 'Carnival Attendee Management',
      url: '/carnivals/create',
      screenshot: 'carnival-attendee-management.png',
      description: 'Managing registered clubs and teams as a carnival organizer.',
      authRequired: true,
      details: [
        'Review and approve club registration requests',
        'Monitor team formation and player assignments',
        'Coordinate event logistics and communications',
        'Manage emergency situations and post-event activities'
      ]
    },
    {
      key: 'carnival-sponsor-management',
      title: 'Carnival Sponsor Management',
      url: '/carnivals/sponsor-management-guide',
      screenshot: 'carnival-sponsor-management.png',
      description: 'Link sponsors to carnival events, manage sponsorship levels, and control sponsor display options.',
      authRequired: true,
      details: [
        'Add sponsors to specific carnival events',
        'Set sponsorship levels (Platinum, Gold, Silver, Bronze, Supporting)',
        'Configure sponsor benefits and display options',
        'Manage sponsor visibility and recognition',
        'Track sponsorship values and relationships'
      ]
    },
    {
      key: 'sponsor-visibility-settings',
      title: 'Sponsor Visibility Settings',
      url: '/carnivals/sponsor-visibility-guide',
      screenshot: 'sponsor-visibility-settings.png',
      description: 'Control how sponsors appear on carnival websites, programs, and public listings.',
      authRequired: true,
      details: [
        'Configure public website display options',
        'Manage sponsor logo sizes and prominence',
        'Control program inclusion and placement',
        'Set up temporal and conditional visibility',
        'Apply bulk visibility changes to multiple sponsors'
      ]
    },
    {
      key: 'admin-dashboard',
      title: 'Administrator Dashboard',
      url: '/admin/dashboard-guide',
      screenshot: 'admin-dashboard.png',
      description: 'Central control center for platform administration with system statistics and monitoring.',
      authRequired: true,
      adminRequired: true,
      details: [
        'Monitor system statistics (users, clubs, carnivals, sponsors)',
        'Track recent activity and growth metrics',
        'Access quick navigation to all administrative functions',
        'Identify system health issues and trends',
        'Generate reports and access management tools'
      ]
    },
    {
      key: 'admin-user-management',
      title: 'Administrator User Management',
      url: '/admin/users-guide',
      screenshot: 'admin-user-management.png',
      description: 'Comprehensive user account administration including editing, password resets, and status control.',
      authRequired: true,
      adminRequired: true,
      details: [
        'View and search all registered users',
        'Edit user details and account information',
        'Reset user passwords securely',
        'Control account activation and deactivation',
        'Delete user accounts with proper validation',
        'Manage user roles and permissions'
      ]
    },
    {
      key: 'admin-club-management',
      title: 'Administrator Club Management',
      url: '/admin/clubs-guide',
      screenshot: 'admin-club-management.png',
      description: 'Complete oversight and control over all clubs including editing, status management, and logo uploads.',
      authRequired: true,
      adminRequired: true,
      details: [
        'View and search all registered clubs',
        'Edit club details, contact information, and settings',
        'Manage club status (active/inactive) and visibility',
        'Upload and manage club logos',
        'Delete clubs with proper dependency checking',
        'Monitor club compliance and data quality'
      ]
    },
    {
      key: 'admin-carnival-management',
      title: 'Administrator Carnival Management',
      url: '/admin/carnivals-guide',
      screenshot: 'admin-carnival-management.png',
      description: 'Comprehensive carnival event administration including editing, status control, and registration management.',
      authRequired: true,
      adminRequired: true,
      details: [
        'View and search all carnival events',
        'Edit carnival details, dates, locations, and settings',
        'Manage carnival status (draft, published, active, completed)',
        'Control public visibility and discoverability',
        'Monitor and manage club registrations',
        'Oversee carnival participation and compliance'
      ]
    },
    {
      key: 'admin-audit-logs',
      title: 'Administrator Audit Logs',
      url: '/admin/audit-logs-guide',
      screenshot: 'admin-audit-logs.png',
      description: 'Comprehensive system activity monitoring with security events, compliance reporting, and audit trails.',
      authRequired: true,
      adminRequired: true,
      details: [
        'Monitor real-time system activities and security events',
        'Review historical audit trails for compliance and troubleshooting',
        'Track user authentication, administrative actions, and system operations',
        'Generate detailed audit reports for regulatory compliance',
        'Search and filter audit logs by user, action, resource, and time period',
        'Configure alerts for security incidents and suspicious activities'
      ]
    },
    {
      key: 'admin-reports',
      title: 'Administrator Reports',
      url: '/admin/reports-guide',
      screenshot: 'admin-reports.png',
      description: 'Comprehensive data analysis and business intelligence with user, club, carnival, and sponsor analytics.',
      authRequired: true,
      adminRequired: true,
      details: [
        'Generate detailed reports on users, clubs, carnivals, and sponsors',
        'Analyze platform usage patterns, growth trends, and engagement metrics',
        'Create custom reports with flexible filtering and visualization options',
        'Schedule automated report generation and distribution',
        'Export reports in multiple formats (PDF, Excel, CSV, JSON)',
        'Monitor key performance indicators and business intelligence metrics'
      ]
    },
    {
      key: 'admin-mysideline-sync',
      title: 'Administrator MySideline Sync',
      url: '/admin/mysideline-sync-guide',
      screenshot: 'admin-mysideline-sync.png',
      description: 'Comprehensive management and monitoring of external system integration with MySideline including synchronization, API configuration, and error handling.',
      authRequired: true,
      adminRequired: true,
      details: [
        'Configure and manage MySideline API connections and authentication',
        'Monitor synchronization status and data transfer health',
        'Handle integration errors and perform manual synchronization',
        'Configure data mapping and transformation between systems',
        'Schedule automated synchronization and manage performance',
        'Ensure data consistency and compliance across integrated systems'
      ]
    },
    {
      key: 'admin-system-health',
      title: 'Administrator System Health',
      url: '/admin/system-health-guide',
      screenshot: 'admin-system-health.png',
      description: 'Comprehensive monitoring and management of platform performance, resource utilization, error tracking, and overall system status.',
      authRequired: true,
      adminRequired: true,
      details: [
        'Monitor real-time system performance metrics and response times',
        'Track and analyze system errors with comprehensive error management',
        'Monitor resource utilization including CPU, memory, and database performance',
        'Assess overall system health with composite scoring and trend analysis',
        'Configure proactive alerting for performance and error thresholds',
        'Generate comprehensive health reports and capacity planning insights'
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

  // Filter pages based on user authentication and admin status
  const filteredPages = pages.filter(page => {
    // Always show public pages (authRequired: false)
    if (!page.authRequired) return true;

    // For authenticated-only pages, user must be logged in
    if (!isAuthenticated) return false;

    // For admin-only pages, user must be an admin
    if (page.adminRequired && !isAdmin) return false;

    // Page is accessible
    return true;
  });

  // Map to include screenshot URLs. Use appropriate base folder based on page type
  const pagesMap = Object.fromEntries(filteredPages.map(p => {
    let base;
    if (p.adminRequired) {
      base = '/screenshots/admin-user';
    } else if (p.authRequired) {
      base = '/screenshots/delegate-user';
    } else {
      base = '/screenshots/standard-user';
    }
    return [p.key, { ...p, screenshotUrl: `${base}/${p.screenshot}` }];
  }));

  // Also prepare a pages array where each page has screenshotUrl included
  const pagesWithUrls = filteredPages.map(p => {
    let base;
    if (p.adminRequired) {
      base = '/screenshots/admin-user';
    } else if (p.authRequired) {
      base = '/screenshots/delegate-user';
    } else {
      base = '/screenshots/standard-user';
    }
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
      isAdmin,
      additionalCSS: ['/styles/user-guide.styles.css']
    });
  }

  // No specific page requested: render an index listing the available guide pages
  const title = isAdmin ? 'Administrator User Guide' :
                isAuthenticated ? 'Club Delegate User Guide' :
                'Old Man Footy User Guide';

  return res.render('user-guide/index', {
    title,
    pages: pagesWithUrls,
    user: req.user || null,
    isAuthenticated,
    isAdmin,
    additionalCSS: ['/styles/user-guide.styles.css']
  });
});
