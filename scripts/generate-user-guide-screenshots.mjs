/**
 * @file generate-user-guide-screenshots.mjs
 * @description Playwright script to generate screenshots for user guide documentation
 * 
 * This script navigates through the Old Man Footy platform and captures high-quality
 * screenshots for both standard user and delegate user guides.
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
  baseURL: process.env.BASE_URL || 'http://localhost:3050',
  screenshotDir: join(__dirname, '../public/screenshots'),
  viewport: { width: 1920, height: 1080 },
  timeout: 30000,
  // Test credentials for delegate screenshots
  testCredentials: {
    email: 'admin@oldmanfooty.au',
    password: 'Admin123!'
  }
};

class ScreenshotGenerator {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.setupDirectories();
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
    this.browser = await chromium.launch({ 
      headless: false, // Set to true for CI/CD
      slowMo: 1000 // Slow down for better screenshots
    });
    
    this.context = await this.browser.newContext({
      viewport: CONFIG.viewport,
      ignoreHTTPSErrors: true,
    });
    
    this.page = await this.context.newPage();
    await this.page.setViewportSize(CONFIG.viewport);
    
    // Wait for page to be ready
    await this.page.goto(CONFIG.baseURL);
    await this.page.waitForLoadState('networkidle');
    console.log('✅ Browser initialized successfully');
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
      
      // Wait for any dynamic content
      if (options.waitFor) {
        if (typeof options.waitFor === 'string') {
          await this.page.waitForSelector(options.waitFor, { timeout: CONFIG.timeout });
        } else if (typeof options.waitFor === 'number') {
          await this.page.waitForTimeout(options.waitFor);
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
      await this.page.goto(`${CONFIG.baseURL}/auth/login`);
      
      // Fill login form
      await this.page.fill('input[name="email"]', CONFIG.testCredentials.email);
      await this.page.fill('input[name="password"]', CONFIG.testCredentials.password);
      await this.page.click('button[type="submit"]');
      
      // Wait for redirect to dashboard
      await this.page.waitForURL(/dashboard/, { timeout: CONFIG.timeout });
      await this.page.waitForLoadState('networkidle');
      
      console.log('✅ Login successful');
      return true;
    } catch (error) {
      console.error('❌ Login failed:', error.message);
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
        waitFor: '.club-card, .no-clubs-message'
      },
      {
        url: `${CONFIG.baseURL}/sponsors`,
        name: 'sponsors-network',
        waitFor: '.sponsor-card, .no-sponsors-message'
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
      },
      {
        url: `${CONFIG.baseURL}/user-guide`,
        name: 'user-guide-page',
        waitFor: 'main'
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
    
    // Login first
    const loginSuccess = await this.login();
    if (!loginSuccess) {
      console.error('❌ Cannot generate delegate screenshots without login');
      return;
    }

    const screenshots = [
      {
        url: `${CONFIG.baseURL}/dashboard`,
        name: 'dashboard-overview',
        waitFor: '.dashboard-stats, .card'
      },
      {
        url: `${CONFIG.baseURL}/admin/carnivals`,
        name: 'carnival-management',
        waitFor: '.carnival-list, .admin-content'
      },
      {
        url: `${CONFIG.baseURL}/admin/clubs`,
        name: 'club-management',
        waitFor: '.club-list, .admin-content'
      },
      {
        url: `${CONFIG.baseURL}/admin/carnivals/create`,
        name: 'carnival-creation-form',
        waitFor: 'form'
      }
    ];

    for (const screenshot of screenshots) {
      await this.navigateAndScreenshot(screenshot.url, screenshot.name, {
        waitFor: screenshot.waitFor,
        subfolder: 'delegate-user'
      });
    }

    // Take screenshot of dashboard stats specifically
    await this.page.goto(`${CONFIG.baseURL}/dashboard`);
    await this.takeScreenshot('dashboard-stats', '.dashboard-stats', {
      subfolder: 'delegate-user'
    });
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
  const generator = new ScreenshotGenerator();
  await generator.generateAllScreenshots();
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

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default ScreenshotGenerator;
