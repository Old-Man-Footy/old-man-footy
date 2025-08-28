/**
 * @file generate-user-guide-screenshots.mjs
 * @description Comprehensive screenshot generator for user guide documentation
 *
 * This script systematically captures screenshots of all routes/pages in the application
 * organized by authentication level and user role.
 */

console.log('🎬 Comprehensive Screenshot Generator Starting...', new Date().toISOString());

// Force development environment
process.env.NODE_ENV = 'development';

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Load configuration
import { setEnvironmentVariables } from '../config/config.mjs';
await setEnvironmentVariables();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
  baseURL: process.env.APP_URL || 'http://localhost:3050',
  screenshotDir: join(__dirname, '../public/screenshots'),
  viewport: { width: 1920, height: 1080 },
  timeout: 30000,
  testCredentials: {
    // Generate dynamic credentials for fresh user registration
    generateDelegateCredentials() {
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      return {
        firstName: 'Test',
        lastName: 'Delegate',
        email: `test-delegate-${timestamp}-${randomSuffix}@example.com`,
        password: 'TestDelegate123!',
        phoneNumber: '+61412345678'
      };
    },
    admin: {
      email: process.env.ADMIN_EMAIL || 'admin@oldmanfooty.au',
      password: process.env.ADMIN_PASSWORD || 'Admin123!'
    }
  },
  testClubData: {
    clubName: 'Test Screenshot Club',
    state: 'NSW',
    location: 'Sydney',
    contactEmail: 'test-club@example.com',
    description: 'A test club created for screenshot generation purposes'
  }
};

// Route definitions organized by authentication level
const ROUTE_DEFINITIONS = {
  unauthenticated: {
    description: 'Pages accessible without login',
    routes: [
      { path: '/', name: 'homepage-overview', description: 'Main homepage with upcoming carnivals' },
      { path: '/about', name: 'about-page', description: 'About page' },
      { path: '/contact', name: 'contact-page', description: 'Contact form page' },
      { path: '/user-guide', name: 'user-guide', description: 'User guide index' },
      { path: '/auth/login', name: 'login-page', description: 'User login page' },
      { path: '/auth/register', name: 'registration-page', description: 'User registration page' },
      { path: '/carnivals', name: 'carnivals-listing', description: 'Public carnival listings' },
      { path: '/clubs', name: 'clubs-directory', description: 'Public club listings' },
      { path: '/sponsors', name: 'sponsors-network', description: 'Public sponsor listings' },
      { path: '/health', name: 'health-check', description: 'Health check endpoint' }
    ]
  },

  authenticated: {
    description: 'Pages requiring user authentication',
    routes: [
      { path: '/dashboard', name: 'user-dashboard', description: 'Authenticated user dashboard' },

      // Club Management
      { path: '/clubs/manage', name: 'club-management-with-club', description: 'Club management overview (shows club management options after joining/creating)' },
      { path: '/clubs/manage/profile', name: 'club-profile-management', description: 'Edit club profile' },
      { path: '/clubs/manage/sponsors', name: 'club-sponsors-management', description: 'Manage club sponsors' },
      { path: '/clubs/manage/sponsors/add', name: 'add-club-sponsor', description: 'Add sponsor to club' },
      { path: '/clubs/manage/alternate-names', name: 'club-alternate-names', description: 'Manage club alternate names' },

      // Player Management
      { path: '/clubs/players', name: 'club-players-list', description: 'Club players listing' },
      { path: '/clubs/players/add', name: 'add-new-player', description: 'Add new player form' },
      { path: '/clubs/players/csv-template', name: 'player-csv-template', description: 'Download CSV template' },

      // Carnival Management
      { path: '/carnivals/new', name: 'create-carnival', description: 'Create new carnival form' },
      { path: '/carnivals', name: 'manage-carnivals', description: 'Carnival management listing', navigateFromListing: true }
    ]
  },

  admin: {
    description: 'Pages requiring admin privileges',
    routes: [
      { path: '/admin/dashboard', name: 'admin-dashboard', description: 'Admin dashboard' },
      { path: '/admin/users', name: 'admin-user-management', description: 'User management' },
      { path: '/admin/clubs', name: 'admin-club-management', description: 'Club management (admin)' },
      { path: '/admin/carnivals', name: 'admin-carnival-management', description: 'Carnival management (admin)' },
      { path: '/admin/sponsors', name: 'admin-sponsor-management', description: 'Sponsor management (admin)' },
      { path: '/admin/audit-logs', name: 'admin-audit-logs', description: 'Audit logs' },
      { path: '/admin/reports', name: 'admin-reports', description: 'Reports and analytics' },
      { path: '/admin/system-health', name: 'admin-system-health', description: 'System health monitoring' }
    ]
  }
};

class ComprehensiveScreenshotGenerator {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.setupDirectories();
  }

  setupDirectories() {
    const directories = [
      CONFIG.screenshotDir,
      join(CONFIG.screenshotDir, 'unauthenticated'),
      join(CONFIG.screenshotDir, 'authenticated'),
      join(CONFIG.screenshotDir, 'admin')
    ];

    directories.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });
  }

  async initialize() {
    console.log('🚀 Initializing browser...');
    try {
      this.browser = await chromium.launch({
        headless: true,
        slowMo: 500
      });
      console.log('✅ Browser launched successfully');

      this.context = await this.browser.newContext({
        viewport: CONFIG.viewport,
        ignoreHTTPSErrors: true,
      });
      console.log('✅ Browser context created');

      this.page = await this.context.newPage();
      await this.page.setViewportSize(CONFIG.viewport);
      console.log('✅ Page created with viewport set');

      await this.page.goto(CONFIG.baseURL);
      await this.page.waitForLoadState('networkidle');
      console.log('✅ Browser initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing browser:', error.message);
      throw error;
    }
  }

  async login(credentials) {
    try {
      console.log(`🔐 Logging in as ${credentials.email}...`);
      await this.page.goto(`${CONFIG.baseURL}/auth/login`);
      await this.page.waitForSelector('form[action="/auth/login"]');

      await this.page.fill('input[name="email"]', credentials.email);
      await this.page.fill('input[name="password"]', credentials.password);
      await this.page.click('button[type="submit"]');

      await this.page.waitForURL(/dashboard|admin/, { timeout: CONFIG.timeout });
      await this.page.waitForLoadState('networkidle');
      console.log('✅ Login successful');
      return true;
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      return false;
    }
  }

  async registerUser(credentials) {
    try {
      console.log(`📝 Registering new user: ${credentials.email}...`);
      await this.page.goto(`${CONFIG.baseURL}/auth/register`);
      await this.page.waitForSelector('form[action="/auth/register"]');

      await this.page.fill('input[name="firstName"]', credentials.firstName);
      await this.page.fill('input[name="lastName"]', credentials.lastName);
      await this.page.fill('input[name="email"]', credentials.email);
      await this.page.fill('input[name="phoneNumber"]', credentials.phoneNumber || '');
      await this.page.fill('input[name="password"]', credentials.password);
      await this.page.fill('input[name="confirmPassword"]', credentials.password);

      await this.page.click('button[type="submit"]');

      // Wait for either success (redirect to dashboard) or error message
      try {
        await this.page.waitForURL(/dashboard/, { timeout: CONFIG.timeout });
        await this.page.waitForLoadState('networkidle');
        console.log('✅ User registration successful');
        return true;
      } catch (urlError) {
        // Check if we're still on register page with error
        const currentURL = this.page.url();
        if (currentURL.includes('/auth/register')) {
          const errorElement = await this.page.locator('.alert-danger, .error, [class*="error"]').first();
          if (await errorElement.count() > 0) {
            const errorText = await errorElement.textContent();
            console.error('❌ Registration failed with error:', errorText);
            return false;
          }
        }
        throw urlError;
      }
    } catch (error) {
      console.error('❌ Registration failed:', error.message);
      return false;
    }
  }

  async createClub(clubData) {
    try {
      console.log(`🏟️ Creating club: ${clubData.clubName}...`);
      await this.page.goto(`${CONFIG.baseURL}/clubs/manage`);
      await this.page.waitForSelector('.create-club-form, form[action="/clubs/create"], .btn-primary');

      // Look for the create club form or button
      const createForm = await this.page.locator('form[action="/clubs/create"]');
      if (await createForm.count() > 0) {
        // Fill out the create club form
        await this.page.fill('input[name="clubName"]', clubData.clubName);
        await this.page.selectOption('select[name="state"]', clubData.state);
        await this.page.fill('input[name="location"]', clubData.location);
        await this.page.fill('input[name="contactEmail"]', clubData.contactEmail || '');
        await this.page.fill('textarea[name="description"]', clubData.description || '');

        await this.page.click('button[type="submit"]');

        // Wait for success or error
        try {
          await this.page.waitForURL(/\/clubs\/manage/, { timeout: CONFIG.timeout });
          await this.page.waitForLoadState('networkidle');
          console.log('✅ Club creation successful');
          return true;
        } catch (urlError) {
          console.error('❌ Club creation failed - no redirect to manage page');
          return false;
        }
      } else {
        console.error('❌ Create club form not found');
        return false;
      }
    } catch (error) {
      console.error('❌ Club creation failed:', error.message);
      return false;
    }
  }

  async logout() {
    try {
      await this.page.goto(`${CONFIG.baseURL}/auth/logout`);
      await this.page.waitForURL(/\//, { timeout: CONFIG.timeout });
      console.log('✅ Logout successful');
    } catch (error) {
      console.log('⚠️ Logout may have failed, continuing...');
    }
  }

  async takeScreenshot(name, selector = null, options = {}) {
    try {
      const subfolder = options.subfolder || 'unauthenticated';
      const screenshotPath = join(CONFIG.screenshotDir, subfolder, `${name}.png`);

      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(1000);

      if (selector) {
        const element = await this.page.locator(selector);
        await element.waitFor({ state: 'visible' });
        await element.screenshot({ path: screenshotPath });
      } else {
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
      }

      console.log(`📸 Screenshot saved: ${name}.png`);
      return name;
    } catch (error) {
      console.error(`❌ Failed to take screenshot ${name}:`, error.message);
      return null;
    }
  }

  async captureRouteScreenshot(route, authLevel) {
    try {
      console.log(`📸 Taking ${authLevel} screenshot: ${route.name}`);
      console.log(`   📝 ${route.description}`);

      if (route.navigateFromListing && route.path === '/carnivals') {
        // Special handling for carnival navigation
        await this.page.goto(`${CONFIG.baseURL}/carnivals`);
        await this.page.waitForSelector('.carnival-card, .no-carnivals-message');

        // Try to navigate to first carnival if available
        const viewButton = await this.page.locator('.carnival-card a[href*="/carnivals/"]').first();
        if (await viewButton.count() > 0) {
          await viewButton.click();
          await this.page.waitForSelector('.carnival-detail, .register-interest, .btn-primary');
          return await this.takeScreenshot(route.name, null, { subfolder: authLevel });
        } else {
          console.log('⚠️ No carnivals available for navigation');
          return null;
        }
      } else {
        // Standard navigation
        await this.page.goto(`${CONFIG.baseURL}${route.path}`, { waitUntil: 'networkidle', timeout: CONFIG.timeout });
        await this.page.waitForSelector('body', { timeout: CONFIG.timeout });
        return await this.takeScreenshot(route.name, null, { subfolder: authLevel });
      }
    } catch (error) {
      console.error(`❌ Failed to capture ${route.name}:`, error.message);
      return null;
    }
  }

  async generateScreenshotsForAuthLevel(authLevel, routes) {
    console.log(`\n👤 Generating ${authLevel.toUpperCase()} Screenshots...`);
    console.log(`📝 ${routes.description}`);

    const results = [];

    for (const route of routes.routes) {
      const result = await this.captureRouteScreenshot(route, authLevel);
      results.push({
        route: route.path,
        name: route.name,
        success: result !== null,
        description: route.description
      });
    }

    return results;
  }

  async generateAllScreenshots() {
    console.log('\n🎬 COMPREHENSIVE SCREENSHOT GENERATOR');
    console.log('=====================================');

    let freshCredentials = null;

    try {
      await this.initialize();

      const allResults = {
        unauthenticated: [],
        authenticated: [],
        admin: []
      };

      // 1. Unauthenticated screenshots
      allResults.unauthenticated = await this.generateScreenshotsForAuthLevel(
        'unauthenticated',
        ROUTE_DEFINITIONS.unauthenticated
      );

      // 2. Authenticated screenshots (fresh user registration and club creation)
      console.log('\n� Starting fresh user registration and club creation...');

      // Generate fresh credentials for this run
      freshCredentials = CONFIG.testCredentials.generateDelegateCredentials();
      console.log(`🔧 Generated credentials for: ${freshCredentials.email}`);

      // Register new user
      if (await this.registerUser(freshCredentials)) {
        console.log('✅ Fresh user registered successfully');

        // Take screenshot of club management page with no club
        console.log('📸 Capturing club management page (no club state)...');
        await this.page.goto(`${CONFIG.baseURL}/clubs/manage`);
        await this.page.waitForSelector('body', { timeout: CONFIG.timeout });
        await this.takeScreenshot('club-management-no-club', null, { subfolder: 'authenticated' });

        // Create a club
        if (await this.createClub(CONFIG.testClubData)) {
          console.log('✅ Club created successfully');

          // Now capture all authenticated screenshots with club
          allResults.authenticated = await this.generateScreenshotsForAuthLevel(
            'authenticated',
            ROUTE_DEFINITIONS.authenticated
          );
        } else {
          console.error('❌ Club creation failed, capturing limited authenticated screenshots');
          // Still try to capture some authenticated screenshots even without club
          allResults.authenticated = await this.generateScreenshotsForAuthLevel(
            'authenticated',
            ROUTE_DEFINITIONS.authenticated
          );
        }

        await this.logout();
      } else {
        console.error('❌ Could not register fresh user, skipping authenticated screenshots');
      }

      // 3. Admin screenshots
      console.log('\n🔐 Starting admin session...');
      if (await this.login(CONFIG.testCredentials.admin)) {
        allResults.admin = await this.generateScreenshotsForAuthLevel(
          'admin',
          ROUTE_DEFINITIONS.admin
        );
        await this.logout();
      } else {
        console.error('❌ Could not establish admin session');
      }

      // Summary
      console.log('\n📊 SCREENSHOT GENERATION SUMMARY');
      console.log('================================');

      let totalScreenshots = 0;
      let successfulScreenshots = 0;

      Object.entries(allResults).forEach(([level, results]) => {
        console.log(`\n${level.toUpperCase()} (${results.length} routes):`);
        results.forEach(result => {
          totalScreenshots++;
          if (result.success) {
            successfulScreenshots++;
            console.log(`  ✅ ${result.name} - ${result.description}`);
          } else {
            console.log(`  ❌ ${result.name} - ${result.description} (FAILED)`);
          }
        });
      });

      console.log(`\n🎯 Total: ${successfulScreenshots}/${totalScreenshots} screenshots successful`);
      console.log(`📁 Screenshots saved to: ${CONFIG.screenshotDir}`);

    } catch (error) {
      console.error('❌ Error generating screenshots:', error);
    } finally {
      // Clean up test data if we created any
      if (freshCredentials !== null) {
        await this.cleanupTestData(freshCredentials);
      }
      await this.cleanup();
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔄 Browser closed');
    }
  }

  async cleanupTestData(credentials) {
    try {
      console.log('🧹 Cleaning up test data...');
      // Note: In a real implementation, you might want to add API endpoints for cleanup
      // For now, we'll just log that cleanup would happen here
      console.log(`   📝 Would clean up user: ${credentials.email}`);
      console.log(`   🏟️ Would clean up club: ${CONFIG.testClubData.clubName}`);
      console.log('✅ Test data cleanup completed (manual cleanup may be required)');
    } catch (error) {
      console.log('⚠️ Test data cleanup failed, but continuing...');
    }
  }
}

// Main execution
async function main() {
  console.log('🎯 Starting comprehensive screenshot generation...');
  const generator = new ComprehensiveScreenshotGenerator();
  await generator.generateAllScreenshots();
  console.log('🏁 Comprehensive screenshot generation completed');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⚠️ Interrupted by user');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log('🔍 Checking execution condition...');
const currentFile = fileURLToPath(import.meta.url);
const runFile = process.argv[1];

console.log('Current file:', currentFile);
console.log('Run file:', runFile);
console.log('Files match:', currentFile === runFile);

if (currentFile === runFile) {
  console.log('🚀 Script is being run directly, starting main function...');
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
} else {
  console.log('❌ Script execution condition not met');
}

export default ComprehensiveScreenshotGenerator;
