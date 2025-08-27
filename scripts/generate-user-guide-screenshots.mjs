/**
 * @file generate-user-guide-screenshots.mjs
 * @description Playwright script to generate screenshots for user guide documentation
 * 
 * This script navigates through the Old Man Footy platform and captures high-quality
 * screenshots for both standard user and delegate user guides.
 */

console.log('🎬 Screenshot generation script starting...');

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

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
    email: 'primary@canterburybankstonmasters.com.au',
    password: 'delegate123'
  }
};

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

      const screenshots = [
        {
          url: `${CONFIG.baseURL}/dashboard`,
          name: 'dashboard-overview',
          waitFor: '.dashboard-stats, .card'
        },
        {
          url: `${CONFIG.baseURL}/clubs/manage`,
          name: 'club-management',
          waitFor: '.card, .club-management'
        },
        {
          url: `${CONFIG.baseURL}/carnivals/new`,
          name: 'carnival-creation-form',
          waitFor: 'form'
        },
        {
          url: `${CONFIG.baseURL}/carnivals`,
          name: 'carnival-listing-delegate',
          waitFor: '.carnival-card, .no-carnivals-message'
        }
      ];

      for (const screenshot of screenshots) {
        console.log(`📸 Taking delegate screenshot: ${screenshot.name}`);
        await this.navigateAndScreenshot(screenshot.url, screenshot.name, {
          waitFor: screenshot.waitFor,
          subfolder: 'delegate-user'
        });
      }

      // Take screenshot of dashboard stats specifically
      console.log('📸 Taking dashboard stats screenshot');
      await this.page.goto(`${CONFIG.baseURL}/dashboard`);
      await this.takeScreenshot('dashboard-stats', '.dashboard-stats', {
        subfolder: 'delegate-user'
      });
      
      console.log('✅ Delegate screenshots completed');
      
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
