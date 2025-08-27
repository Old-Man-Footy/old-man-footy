/**
 * @file complete-documentation-update.mjs
 * @description Complete documentation update process with progress tracking
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG = {
  baseURL: 'http://localhost:3050',
  screenshotDir: join(__dirname, '../public/screenshots'),
  docsDir: join(__dirname, '../docs'),
  viewport: { width: 1920, height: 1080 },
  timeout: 30000,
  testCredentials: {
    email: 'admin@oldmanfooty.au',
    password: 'SecurePassword123!'
  }
};

class DocumentationUpdater {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.screenshots = {};
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
    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext({
      viewport: CONFIG.viewport,
      ignoreHTTPSErrors: true,
    });
    this.page = await this.context.newPage();
    await this.page.setViewportSize(CONFIG.viewport);
    console.log('✅ Browser initialized');
  }

  async takeScreenshot(name, url, options = {}) {
    try {
      console.log(`📸 Taking screenshot: ${name}`);
      await this.page.goto(url, { waitUntil: 'networkidle', timeout: CONFIG.timeout });
      
      if (options.waitFor) {
        await this.page.waitForSelector(options.waitFor, { timeout: 10000 }).catch(() => {
          console.log(`⚠️  Wait selector '${options.waitFor}' not found, continuing...`);
        });
      }
      
      await this.page.waitForTimeout(2000); // Stability wait
      
      const filename = `${name}.png`;
      const subfolder = options.subfolder || 'standard-user';
      const screenshotPath = join(CONFIG.screenshotDir, subfolder, filename);
      
      if (options.selector) {
        const element = await this.page.locator(options.selector).first();
        if (await element.isVisible()) {
          await element.screenshot({ path: screenshotPath });
        } else {
          await this.page.screenshot({ path: screenshotPath, fullPage: true });
        }
      } else {
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
      }
      
      console.log(`✅ Screenshot saved: ${filename}`);
      this.screenshots[name] = filename;
      return filename;
    } catch (error) {
      console.error(`❌ Failed to take screenshot ${name}:`, error.message);
      return null;
    }
  }

  async login() {
    try {
      console.log('🔐 Attempting login...');
      await this.page.goto(`${CONFIG.baseURL}/auth/login`);
      await this.page.fill('input[name="email"]', CONFIG.testCredentials.email);
      await this.page.fill('input[name="password"]', CONFIG.testCredentials.password);
      await this.page.click('button[type="submit"]');
      await this.page.waitForURL(/dashboard/, { timeout: CONFIG.timeout });
      console.log('✅ Login successful');
      return true;
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      return false;
    }
  }

  async generateAllScreenshots() {
    console.log('\n📱 Generating Standard User Screenshots...');
    
    const standardScreenshots = [
      { name: 'homepage-overview', url: `${CONFIG.baseURL}`, waitFor: 'main' },
      { name: 'carnivals-listing', url: `${CONFIG.baseURL}/carnivals`, waitFor: '.content, main' },
      { name: 'clubs-directory', url: `${CONFIG.baseURL}/clubs`, waitFor: '.content, main' },
      { name: 'sponsors-network', url: `${CONFIG.baseURL}/sponsors`, waitFor: '.content, main' },
      { name: 'contact-page', url: `${CONFIG.baseURL}/contact`, waitFor: 'form' },
      { name: 'user-registration', url: `${CONFIG.baseURL}/auth/register`, waitFor: 'form' },
    ];

    for (const screenshot of standardScreenshots) {
      await this.takeScreenshot(screenshot.name, screenshot.url, {
        waitFor: screenshot.waitFor,
        subfolder: 'standard-user'
      });
    }

    // Navigation menu
    await this.page.goto(CONFIG.baseURL);
    await this.takeScreenshot('navigation-menu', CONFIG.baseURL, {
      selector: 'nav, .navbar',
      subfolder: 'standard-user'
    });

    // Login for delegate screenshots
    const loginSuccess = await this.login();
    if (loginSuccess) {
      console.log('\n👤 Generating Delegate User Screenshots...');
      
      const delegateScreenshots = [
        { name: 'dashboard-overview', url: `${CONFIG.baseURL}/dashboard`, waitFor: '.content, main' },
        { name: 'carnival-management', url: `${CONFIG.baseURL}/admin/carnivals`, waitFor: '.content, main' },
        { name: 'club-management', url: `${CONFIG.baseURL}/admin/clubs`, waitFor: '.content, main' },
        { name: 'carnival-creation-form', url: `${CONFIG.baseURL}/admin/carnivals/create`, waitFor: 'form' }
      ];

      for (const screenshot of delegateScreenshots) {
        await this.takeScreenshot(screenshot.name, screenshot.url, {
          waitFor: screenshot.waitFor,
          subfolder: 'delegate-user'
        });
      }

      // Dashboard stats
      await this.page.goto(`${CONFIG.baseURL}/dashboard`);
      await this.takeScreenshot('dashboard-stats', `${CONFIG.baseURL}/dashboard`, {
        selector: '.dashboard-stats, .stats, .card',
        subfolder: 'delegate-user'
      });
    }

    // Mobile screenshots completely removed per user request
  }

  updateUserGuides() {
    console.log('\n📝 Updating User Guides...');
    
    // Update Standard User Guide
    const standardGuidePath = join(CONFIG.docsDir, 'USER_GUIDE_STANDARD.md');
    const standardContent = `# Old Man Footy - Platform User Guide

Welcome to Old Man Footy, Australia's premier platform for Masters Rugby League events and club management.

![Homepage Overview](/screenshots/standard-user/homepage-overview.png)
*The Old Man Footy homepage provides easy access to all platform features*

## What is Old Man Footy?

Old Man Footy is a comprehensive platform designed to connect Masters Rugby League clubs and players across Australia. Whether you're looking to participate in events, find clubs in your area, or discover Masters Rugby League opportunities, this platform has everything you need.

## Getting Started

### Browsing Without an Account
You can explore many features without creating an account:

#### Navigation Overview
The main navigation provides access to all key sections:

![Navigation Menu](/screenshots/standard-user/navigation-menu.png)
*Main navigation menu showing all available sections*

- **[Home](${CONFIG.baseURL})** - Platform overview and latest updates
- **[Carnivals](${CONFIG.baseURL}/carnivals)** - Browse all upcoming Masters Rugby League events
- **[Clubs](${CONFIG.baseURL}/clubs)** - Search for clubs across Australia  
- **[Sponsors](${CONFIG.baseURL}/sponsors)** - View our supporting partners
- **[Contact](${CONFIG.baseURL}/contact)** - Get in touch with the platform team

### Creating an Account
To unlock full functionality and become a club delegate:

![User Registration](/screenshots/standard-user/user-registration.png)
*User registration form for creating a new account*

1. Click **[Register](${CONFIG.baseURL}/auth/register)** in the top navigation
2. Fill in your personal details
3. Select or create your club association
4. Wait for account approval from your club's primary delegate

## Key Features

### Event Discovery

#### Carnival Listings
Browse all upcoming Masters Rugby League events with detailed information:

![Carnivals Listing](/screenshots/standard-user/carnivals-listing.png)
*Comprehensive carnival listings with filtering options*

Visit **[Carnivals](${CONFIG.baseURL}/carnivals)** to:
- View all upcoming events
- Filter by location, date, or event type
- Access detailed event information
- Find registration links

### Club Directory

![Clubs Directory](/screenshots/standard-user/clubs-directory.png)
*Club directory showing Masters Rugby League clubs across Australia*

The **[Clubs Directory](${CONFIG.baseURL}/clubs)** allows you to:
- **Club Search**: Find Masters Rugby League clubs across Australia
- **Club Profiles**: View club information, contact details, and recent activities
- **Geographic Search**: Find clubs by state or region
- **Contact Information**: Get in touch with clubs directly

### Sponsor Network

![Sponsors Network](/screenshots/standard-user/sponsors-network.png)
*Sponsor network showcasing businesses supporting Masters Rugby League*

Explore the **[Sponsor Network](${CONFIG.baseURL}/sponsors)** to:
- **Sponsor Directory**: Explore businesses supporting Masters Rugby League
- **Partnership Information**: Learn about sponsorship opportunities
- **Community Support**: See who's backing the Masters Rugby League community

## Getting Support

### Contact Us
Need help or have questions? Visit our **[Contact Page](${CONFIG.baseURL}/contact)**:

![Contact Page](/screenshots/standard-user/contact-page.png)
*Contact form for getting support and asking questions*

## Next Steps

Ready to get more involved? Consider:
1. **[Registering an account](${CONFIG.baseURL}/auth/register)** to become a club delegate
2. **Contacting your local club** to get involved in upcoming events
3. **Following us** for updates on new carnivals and features

---

*For club delegates and administrative features, see the user guide after logging in.*`;

    writeFileSync(standardGuidePath, standardContent);
    console.log('✅ Standard User Guide updated');

    // Update Delegate User Guide
    const delegateGuidePath = join(CONFIG.docsDir, 'USER_GUIDE_DELEGATES.md');
    const delegateContent = `# Old Man Footy - Club Delegate User Guide

Welcome to the Old Man Footy platform! This guide will help you understand how to use the system as a club delegate to manage your club's participation in Masters Rugby League events.

## Getting Started

### What is Old Man Footy?
Old Man Footy is a platform designed to help manage Masters Rugby League events (carnivals) across Australia. As a club delegate, you can view and manage information about events your club is participating in.

### Your Role as a Club Delegate
- **Primary Delegate**: The main contact person for your club with full management permissions
- **Club Delegate**: Additional representatives who can view and manage club information

## Dashboard Overview

When you log in, you'll see your dashboard which provides comprehensive management tools:

![Dashboard Overview](/screenshots/delegate-user/dashboard-overview.png)
*Club delegate dashboard with quick stats and management options*

### Quick Stats
The dashboard provides an at-a-glance view of your club's activity:

![Dashboard Stats](/screenshots/delegate-user/dashboard-stats.png)
*Key statistics showing your club's event participation*

- **[Your Carnivals](${CONFIG.baseURL}/dashboard)**: Number of events your club is registered for
- **[Upcoming Events](${CONFIG.baseURL}/dashboard?filter=upcoming)**: Events happening in the future
- **Your Club**: Your club name and delegate status

## Managing Carnivals (Events)

### Carnival Management Interface

![Carnival Management](/screenshots/delegate-user/carnival-management.png)
*Comprehensive carnival management interface for delegates*

Access the **[Carnival Management](${CONFIG.baseURL}/admin/carnivals)** section to:
- View all carnivals in the system
- Manage your club's carnival participation
- Edit event details (if you're the organizer)
- Track registration status

### Creating a New Carnival

![Carnival Creation Form](/screenshots/delegate-user/carnival-creation-form.png)
*Form for creating a new carnival event*

1. Navigate to **[Carnivals](${CONFIG.baseURL}/admin/carnivals)** in the admin menu
2. Click **[Create New Carnival](${CONFIG.baseURL}/admin/carnivals/create)**
3. Fill in the required details:
   - **Title**: Name of your event
   - **Date**: When the event takes place
   - **Location**: Venue address and details
   - **State**: Which state the event is in
   - **Registration URL**: Link for teams to register
   - **Description**: Additional event information

## Club Management

### Club Administration

![Club Management](/screenshots/delegate-user/club-management.png)
*Club management interface for maintaining club information*

Access **[Club Management](${CONFIG.baseURL}/admin/clubs)** to:
- Update your club's profile information
- Manage club contact details
- Upload club logos and images
- Maintain player rosters

## Getting Support

### Technical Support
If you encounter issues with the platform:
1. Check the **[User Guide](${CONFIG.baseURL}/user-guide)** for common solutions
2. Contact platform support via the **[Contact Page](${CONFIG.baseURL}/contact)**
3. Reach out to other delegates in your network

---

*For general platform information and public features, see the [Standard User Guide](./USER_GUIDE_STANDARD.md).*`;

    writeFileSync(delegateGuidePath, delegateContent);
    console.log('✅ Delegate User Guide updated');
  }

  async run() {
    try {
      await this.initialize();
      await this.generateAllScreenshots();
      this.updateUserGuides();
      
      console.log('\n✅ Documentation update completed successfully!');
      console.log(`📁 Screenshots saved to: ${CONFIG.screenshotDir}`);
      console.log(`📝 User guides updated in: ${CONFIG.docsDir}`);
      
    } catch (error) {
      console.error('❌ Error during documentation update:', error);
    } finally {
      if (this.browser) {
        await this.browser.close();
        console.log('🔄 Browser closed');
      }
    }
  }
}

// Run the complete documentation update
const updater = new DocumentationUpdater();
updater.run();
