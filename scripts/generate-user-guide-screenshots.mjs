/**
 * @file generate-user-guide-screenshots.mjs
 * @description Playwright script to generate screenshots for user guide documentation
 * 
 * This script navigates through the Old Man Footy platform and captures high-quality
 * screenshots for both standard user and delegate user guides.
 */

console.log('🎬 Screenshot generation script starting...');

// Force development environment for this script
process.env.NODE_ENV = 'development';

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Load configuration using the same approach as the main app
import { setEnvironmentVariables } from '../config/config.mjs';

console.log('🔧 Loading environment configuration...');
await setEnvironmentVariables();
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);

console.log('📦 Imports loaded successfully');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('📁 Directory paths resolved');

// Configuration
const CONFIG = {
  baseURL: process.env.APP_URL || 'http://localhost:3050',
  screenshotDir: join(__dirname, '../public/screenshots'),
  viewport: { width: 1920, height: 1080 },
  timeout: 30000,
  // Test credentials for delegate screenshots
  testCredentials: {
    email: 'primary@canterburybankstownmasters.com.au',
    password: 'Delegate123!'
  }
};

// ID used for sponsor detail screenshot; override via env var if needed
CONFIG.screenshotSponsorId = process.env.SCREENSHOT_SPONSOR_ID || '51';

console.log('⚙️ Configuration loaded:', CONFIG);

class ScreenshotGenerator {
  constructor() {
    console.log('🏗️ ScreenshotGenerator constructor starting...');
    this.browser = null;
    this.context = null;
    this.page = null;
    this.setupDirectories();
    console.log('✅ ScreenshotGenerator constructor completed');
  }

  setupDirectories() {
    const directories = [
      CONFIG.screenshotDir,
      join(CONFIG.screenshotDir, 'standard-user'),
      join(CONFIG.screenshotDir, 'delegate-user'),
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
        headless: true, // Set to true for CI/CD - changed to headless for testing
        slowMo: 1000 // Slow down for better screenshots
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
      
      // Wait for page to be ready
      console.log(`🔗 Navigating to ${CONFIG.baseURL}...`);
      await this.page.goto(CONFIG.baseURL);
      await this.page.waitForLoadState('networkidle');
      console.log('✅ Browser initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing browser:', error.message);
      throw error;
    }
  }

  async takeScreenshot(name, selector = null, options = {}) {
    try {
      const filename = `${name}.png`;
      const subfolder = options.subfolder || 'standard-user';
      const screenshotPath = join(CONFIG.screenshotDir, subfolder, filename);
      
      // Wait for page to be stable
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(2000); // Additional stability wait
      
      if (selector) {
        // Screenshot specific element
        const element = await this.page.locator(selector);
        await element.waitFor({ state: 'visible' });
        await element.screenshot({ 
          path: screenshotPath,
          ...options.screenshotOptions 
        });
      } else {
        // Full page screenshot
        await this.page.screenshot({ 
          path: screenshotPath, 
          fullPage: true,
          ...options.screenshotOptions 
        });
      }
      
      console.log(`📸 Screenshot saved: ${filename}`);
      return filename;
    } catch (error) {
      console.error(`❌ Failed to take screenshot ${name}:`, error.message);
      return null;
    }
  }

  async navigateAndScreenshot(url, name, options = {}) {
    try {
      console.log(`🔗 Navigating to: ${url}`);
      await this.page.goto(url, { waitUntil: 'networkidle', timeout: CONFIG.timeout });
      console.log(`✅ Page loaded: ${url}`);
      
      // Wait for any dynamic content
      if (options.waitFor) {
        console.log(`⏳ Waiting for: ${options.waitFor}`);
        if (typeof options.waitFor === 'string') {
          await this.page.waitForSelector(options.waitFor, { timeout: CONFIG.timeout });
          console.log(`✅ Found selector: ${options.waitFor}`);
        } else if (typeof options.waitFor === 'number') {
          await this.page.waitForTimeout(options.waitFor);
          console.log(`✅ Waited for timeout: ${options.waitFor}ms`);
        }
      }
      
      return await this.takeScreenshot(name, options.selector, options);
    } catch (error) {
      console.error(`❌ Failed to navigate and screenshot ${name}:`, error.message);
      return null;
    }
  }

  async login() {
    try {
      console.log('🔐 Logging in...');
      console.log('🔍 Using credentials:');
      console.log(`   📧 Email: ${CONFIG.testCredentials.email}`);
      console.log(`   🔑 Password: ${CONFIG.testCredentials.password}`);
      console.log(`🔗 Navigating to login page: ${CONFIG.baseURL}/auth/login`);
      await this.page.goto(`${CONFIG.baseURL}/auth/login`);
      await this.page.waitForLoadState('networkidle');
      
      console.log('📝 Filling login form...');
      // Fill login form
      await this.page.fill('input[name="email"]', CONFIG.testCredentials.email);
      await this.page.fill('input[name="password"]', CONFIG.testCredentials.password);
      
      console.log('🖱️ Clicking submit button...');
      await this.page.click('button[type="submit"]');
      
      // Wait for redirect to dashboard
      console.log('⏳ Waiting for redirect to dashboard...');
      await this.page.waitForURL(/dashboard/, { timeout: CONFIG.timeout });
      await this.page.waitForLoadState('networkidle');
      
      console.log('✅ Login successful');
      return true;
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      console.error('Current URL:', await this.page.url());
      
      // Take screenshot of current page for debugging
      try {
        await this.page.screenshot({ 
          path: join(CONFIG.screenshotDir, 'debug-login-failure.png'),
          fullPage: true 
        });
        console.log('📸 Debug screenshot saved: debug-login-failure.png');
      } catch (screenshotError) {
        console.error('Failed to take debug screenshot:', screenshotError.message);
      }
      
      return false;
    }
  }

  async generateStandardUserScreenshots() {
    console.log('\n📱 Generating Standard User Screenshots...');
    
    const screenshots = [
      {
        url: CONFIG.baseURL,
        name: 'homepage-overview',
        waitFor: 'main'
      },
      {
        url: `${CONFIG.baseURL}/carnivals`,
        name: 'carnivals-listing',
        waitFor: '.carnival-card, .no-carnivals-message'
      },
      {
        url: `${CONFIG.baseURL}/clubs`,
        name: 'clubs-directory',
        waitFor: '.rugby-masters-card, .text-center.py-5'
      },
      {
        url: `${CONFIG.baseURL}/sponsors`,
        name: 'sponsors-network',
        waitFor: '.sponsor-card, .text-center.py-5'
      },
      {
        url: `${CONFIG.baseURL}/contact`,
        name: 'contact-page',
        waitFor: 'form'
      },
      {
        url: `${CONFIG.baseURL}/auth/register`,
        name: 'user-registration',
        waitFor: 'form'
      }
    ];

    for (const screenshot of screenshots) {
      await this.navigateAndScreenshot(screenshot.url, screenshot.name, {
        waitFor: screenshot.waitFor,
        subfolder: 'standard-user'
      });
    }

    // Navigation screenshot
    await this.page.goto(CONFIG.baseURL);
    await this.takeScreenshot('navigation-menu', 'nav, .navbar', {
      subfolder: 'standard-user'
    });
  }

  async generateDelegateUserScreenshots() {
    console.log('\n👤 Generating Delegate User Screenshots...');
    
    try {
      // Login first
      console.log('🔐 Attempting to log in for delegate screenshots...');
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        console.error('❌ Cannot generate delegate screenshots without login');
        return;
      }
      console.log('✅ Login successful, proceeding with delegate screenshots');

      // Delegate screenshots: capture the exact pages required for documentation.
      // Removed carnival-listing-delegate and dashboard-stats as they are not required.
      const screenshots = [
        { url: `${CONFIG.baseURL}/dashboard`, name: 'dashboard', waitFor: '.card, .dashboard-stats' },
        { url: `${CONFIG.baseURL}/clubs/players`, name: 'club-players', waitFor: '.club-player-card, .no-players-message, table' },
        { url: `${CONFIG.baseURL}/clubs/manage`, name: 'club-manage', waitFor: '.card, .club-management' },
        { url: `${CONFIG.baseURL}/clubs/manage/alternate-names`, name: 'club-manage-alternate-names', waitFor: '#addAlternateNameForm, #alternateNamesList, .alternate-name-card, #editAlternateNameModal' },
        { url: `${CONFIG.baseURL}/clubs/manage/sponsors`, name: 'club-manage-sponsors', waitFor: '.card, .sponsor-card, .no-sponsors-message' },
        { url: `${CONFIG.baseURL}/sponsors/${CONFIG.screenshotSponsorId}`, name: 'sponsor-detail', waitFor: '.sponsor-detail, .card, .sponsor-info' },
        { url: `${CONFIG.baseURL}/clubs/players/add`, name: 'club-players-add', waitFor: 'form[action="/clubs/players"], input[name="firstName"], input[name="lastName"]' },
        { url: `${CONFIG.baseURL}/admin/carnivals/create`, name: 'create-carnival', waitFor: 'form, input[name="title"], input[name="date"]', selector: 'form' },
        { url: `${CONFIG.baseURL}/teams/create`, name: 'create-team', waitFor: 'form, input[name="teamName"]', selector: 'form' },
        { url: `${CONFIG.baseURL}/admin/carnivals/claim`, name: 'claim-carnival', waitFor: 'form, #claim-carnival-form, input[name="evidence"]', selector: 'form' }
      ];

      for (const screenshot of screenshots) {
        console.log(`📸 Taking delegate screenshot: ${screenshot.name}`);
        await this.navigateAndScreenshot(screenshot.url, screenshot.name, {
          waitFor: screenshot.waitFor,
          subfolder: 'delegate-user'
        });
      }

      // Special case: CSV Import Modal
      console.log('📸 Taking delegate screenshot: player-csv-import');
      await this.page.goto(`${CONFIG.baseURL}/clubs/players`);
      await this.page.waitForSelector('.club-player-card, .no-players-message, table');
      // Trigger the CSV import modal
      await this.page.click('[data-bs-target="#csvImportModal"]');
      await this.page.waitForSelector('#csvImportModal', { state: 'visible' });
      await this.takeScreenshot('player-csv-import', '#csvImportModal', {
        subfolder: 'delegate-user'
      });

      // Special case: Player Medical Information Form
      console.log('📸 Taking delegate screenshot: player-medical-info');
      await this.page.goto(`${CONFIG.baseURL}/clubs/players/add`);
      await this.page.waitForSelector('form');
      // Scroll to the notes section to focus on medical information
      await this.page.locator('#notes').scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(1000); // Allow time for scroll
      await this.takeScreenshot('player-medical-info', '#notes', {
        subfolder: 'delegate-user'
      });

      // Special case: Player Bulk Operations Management
      console.log('📸 Taking delegate screenshot: player-bulk-operations');
      await this.page.goto(`${CONFIG.baseURL}/clubs/players`);
      await this.page.waitForSelector('.club-player-card, .no-players-message, table');
      await this.takeScreenshot('player-bulk-operations', null, {
        subfolder: 'delegate-user'
      });

      // Special case: Carnival Registration
      console.log('📸 Taking delegate screenshot: carnival-registration');
      await this.page.goto(`${CONFIG.baseURL}/carnivals`);
      await this.page.waitForSelector('.carnival-card, .no-carnivals-message, table');
      await this.takeScreenshot('carnival-registration', null, {
        subfolder: 'delegate-user'
      });

      // Special case: Carnival Team Management
      console.log('📸 Taking delegate screenshot: carnival-team-management');
      await this.page.goto(`${CONFIG.baseURL}/carnivals`);
      await this.page.waitForSelector('.carnival-card, .no-carnivals-message, table');
      await this.takeScreenshot('carnival-team-management', null, {
        subfolder: 'delegate-user'
      });

      // Special case: Carnival Attendee Management
      console.log('📸 Taking delegate screenshot: carnival-attendee-management');
      await this.page.goto(`${CONFIG.baseURL}/carnivals/create`);
      await this.page.waitForSelector('form, .carnival-form, .create-carnival-form');
      await this.takeScreenshot('carnival-attendee-management', null, {
        subfolder: 'delegate-user'
      });

      // Special case: Carnival Sponsor Management
      console.log('📸 Taking delegate screenshot: carnival-sponsor-management');
      await this.page.goto(`${CONFIG.baseURL}/carnivals/sponsor-management-guide`);
      await this.page.waitForSelector('.carnival-sponsors, [data-testid="carnival-sponsors"], .sponsor-management');
      await this.takeScreenshot('carnival-sponsor-management', null, {
        subfolder: 'delegate-user'
      });

      // Special case: Sponsor Visibility Settings
      console.log('📸 Taking delegate screenshot: sponsor-visibility-settings');
      await this.page.goto(`${CONFIG.baseURL}/carnivals/sponsor-visibility-guide`);
      await this.page.waitForSelector('.sponsor-visibility, [data-testid="sponsor-visibility"], .visibility-settings');
      await this.takeScreenshot('sponsor-visibility-settings', null, {
        subfolder: 'delegate-user'
      });

  async generateAdminUserScreenshots() {
    console.log('\n👑 Generating Admin User Screenshots...');
    
    // Create a separate browser context for admin screenshots
    const adminContext = await this.browser.newContext({
      viewport: CONFIG.viewport,
      ignoreHTTPSErrors: true,
    });
    const adminPage = await adminContext.newPage();
    await adminPage.setViewportSize(CONFIG.viewport);
    
    try {
      console.log('� Logging in as admin...');
      await adminPage.goto(`${CONFIG.baseURL}/auth/login`);
      await adminPage.waitForSelector('form[action="/auth/login"]');
      
      // Use the correct admin credentials from environment
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@oldmanfooty.au';
      const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
      
      console.log(`📧 Admin Email: ${adminEmail}`);
      await adminPage.fill('input[name="email"]', adminEmail);
      await adminPage.fill('input[name="password"]', adminPassword);
      await adminPage.click('button[type="submit"]');
      
      // Wait for successful login and redirect
      await adminPage.waitForURL(/admin/, { timeout: CONFIG.timeout });
      console.log('✅ Admin login successful');
      
      // Admin screenshots
      const adminScreenshots = [
        {
          url: `${CONFIG.baseURL}/admin/dashboard`,
          name: 'admin-dashboard',
          waitFor: '.card, [data-testid="admin-stats"], .admin-dashboard'
        },
        {
          url: `${CONFIG.baseURL}/admin/users`,
          name: 'admin-user-management',
          waitFor: 'table, [data-testid="user-table"], .user-management'
        },
        {
          url: `${CONFIG.baseURL}/admin/clubs`,
          name: 'admin-club-management',
          waitFor: 'table, [data-testid="club-table"], .club-management'
        },
        {
          url: `${CONFIG.baseURL}/admin/carnivals`,
          name: 'admin-carnival-management',
          waitFor: 'table, [data-testid="carnival-table"], .carnival-management'
        },
        {
          url: `${CONFIG.baseURL}/admin/audit-logs`,
          name: 'admin-audit-logs',
          waitFor: 'table, [data-testid="audit-table"], .audit-logs'
        },
        {
          url: `${CONFIG.baseURL}/admin/reports`,
          name: 'admin-reports',
          waitFor: 'form, [data-testid="reports-form"], .reports-interface'
        },
        {
          url: `${CONFIG.baseURL}/admin/mysideline-sync`,
          name: 'admin-mysideline-sync',
          waitFor: 'form, [data-testid="sync-form"], .sync-interface, .mysideline-sync'
        },
        {
          url: `${CONFIG.baseURL}/admin/system-health`,
          name: 'admin-system-health',
          waitFor: '.health-dashboard, [data-testid="health-dashboard"], .system-health, .health-metrics'
        }
      ];

      for (const screenshot of adminScreenshots) {
        console.log(`📸 Taking admin screenshot: ${screenshot.name}`);
        await adminPage.goto(screenshot.url, { waitUntil: 'networkidle', timeout: CONFIG.timeout });
        await adminPage.waitForSelector(screenshot.waitFor, { timeout: CONFIG.timeout });
        await this.takeScreenshot(screenshot.name, null, {
          subfolder: 'admin-user'
        });
      }

      console.log('✅ Admin screenshots completed');
      
    } catch (error) {
      console.error('❌ Error generating admin screenshots:', error.message);
      console.error('Stack trace:', error.stack);
    } finally {
      await adminContext.close();
      console.log('🔄 Admin browser context closed');
    }
  }
      
    } catch (error) {
      console.error('❌ Error generating delegate screenshots:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }

  async generateAllScreenshots() {
    try {
      await this.initialize();
      
      await this.generateStandardUserScreenshots();
      await this.generateDelegateUserScreenshots();
      
      console.log('\n✅ All screenshots generated successfully!');
      console.log(`📁 Screenshots saved to: ${CONFIG.screenshotDir}`);
      
    } catch (error) {
      console.error('❌ Error generating screenshots:', error);
    } finally {
      await this.cleanup();
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔄 Browser closed');
    }
  }
}

// Main execution
async function main() {
  console.log('🎯 Main function starting...');
  const generator = new ScreenshotGenerator();
  await generator.generateAllScreenshots();
  console.log('🏁 Main function completed');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⚠️  Interrupted by user');
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

export default ScreenshotGenerator;
