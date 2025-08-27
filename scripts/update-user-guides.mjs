/**
 * @file update-user-guides.mjs
 * @description Script to update user guide documentation with screenshots and links
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Handle path resolution when called from different contexts
const rootDir = __dirname.includes('scripts') ? join(__dirname, '..') : __dirname;

const CONFIG = {
  docsDir: join(rootDir, 'docs'),
  screenshotDir: join(rootDir, 'public/screenshots'),
  baseURL: process.env.APP_URL || 'http://localhost:3050'
};

class UserGuideUpdater {
  constructor(options = {}) {
    this.verbose = options.verbose !== false; // Default to verbose unless explicitly set to false
    this.screenshots = this.loadScreenshots();
  }

  loadScreenshots() {
    const screenshots = {
      'standard-user': [],
      'delegate-user': []
    };

    Object.keys(screenshots).forEach(folder => {
      const folderPath = join(CONFIG.screenshotDir, folder);
      if (existsSync(folderPath)) {
        screenshots[folder] = readdirSync(folderPath)
          .filter(file => file.endsWith('.png'))
          .map(file => ({
            filename: file,
            name: file.replace(/_\d{4}-\d{2}-\d{2}\.png$/, ''),
            path: `./screenshots/${folder}/${file}`
          }));
      }
    });

    return screenshots;
  }

  findScreenshot(name, category = 'standard-user') {
    return this.screenshots[category].find(shot => shot.name === name);
  }

  updateStandardUserGuide() {
    if (this.verbose) console.log('📝 Updating Standard User Guide...');
    
    const guidePath = join(CONFIG.docsDir, 'USER_GUIDE_STANDARD.md');
    let content = readFileSync(guidePath, 'utf8');

    // Updated content with screenshots and links
    const updatedContent = `# Old Man Footy - Platform User Guide

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

#### Event Features
- **Event Details**: View schedules, locations, participating clubs, and registration information
- **Filtering Options**: Search by location, date, or event type
- **Registration Links**: Direct access to event sign-up forms

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

## Finding Events

### Browse All Events
1. Visit the **[Carnivals](${CONFIG.baseURL}/carnivals)** section from the main menu
2. Use the search and filter options to narrow down events
3. Click on any event to view detailed information
4. Use the registration links to sign up your team

### Event Information
Each event listing includes:
- **Date and Time**: When the event takes place
- **Location**: Venue address and facilities information
- **Participating Clubs**: Which teams are already registered
- **Registration Status**: Whether registration is open
- **Contact Information**: How to get more details

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


    writeFileSync(guidePath, updatedContent);
    if (this.verbose) console.log('✅ Standard User Guide updated successfully');
  }

  updateDelegateUserGuide() {
    if (this.verbose) console.log('📝 Updating Delegate User Guide...');
    
    const guidePath = join(CONFIG.docsDir, 'USER_GUIDE_DELEGATES.md');
    
    const updatedContent = `# Old Man Footy - Club Delegate User Guide

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

### Event Management
- View all carnivals your club is participating in
- Filter events by All, Upcoming, or Past
- Quick actions for each event (View, Edit, Delete)

## Managing Carnivals (Events)

### Carnival Management Interface

![Carnival Management](/screenshots/delegate-user/carnival-management.png)
*Comprehensive carnival management interface for delegates*

Access the **[Carnival Management](${CONFIG.baseURL}/admin/carnivals)** section to:
- View all carnivals in the system
- Manage your club's carnival participation
- Edit event details (if you're the organizer)
- Track registration status

### Viewing Carnival Details
1. Click on any carnival card from your dashboard
2. Or use the "View Details" button
3. You'll see:
   - Event schedule and timing
   - Location and venue details
   - Participating clubs
   - Sponsor information
   - Registration links

### Creating a New Carnival
**Important**: To officially register a Masters event with the NRL, use the green "Register Event with NRL" button on your dashboard. This takes you to the official Rugby League registration form.

For managing event information on this platform:

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

### Editing Carnival Information
1. Go to the **[Carnival Management](${CONFIG.baseURL}/admin/carnivals)** page
2. Find your carnival in the list
3. Click "Edit" next to the carnival
4. Update the necessary information
5. Save your changes

**Note**: You can only edit carnivals that your club created or if you have special permissions.

## Club Management

### Club Administration

![Club Management](/screenshots/delegate-user/club-management.png)
*Club management interface for maintaining club information*

Access **[Club Management](${CONFIG.baseURL}/admin/clubs)** to:
- Update your club's profile information
- Manage club contact details
- Upload club logos and images
- Maintain player rosters

### Managing Club Information
1. Navigate to the **[Club Management](${CONFIG.baseURL}/admin/clubs)** section
2. Find your club in the list
3. Click "Edit" to update information
4. Save changes when complete

### Club Profile Updates
Keep your club information current by updating:
- **Contact Information**: Phone numbers and email addresses
- **Club Description**: Information about your club's history and values
- **Meeting Details**: When and where your club meets
- **Social Media Links**: Connect your online presence

## Player Management

### Managing Your Roster
As a club delegate, you can:
- Add new players to your club roster
- Update existing player information
- Remove players who are no longer active
- Track player participation in events

### Player Registration Process
1. Access the player management section
2. Click "Add New Player"
3. Fill in player details:
   - Name and contact information
   - Playing position
   - Medical information (if required)
   - Emergency contacts

## Event Participation

### Registering for Carnivals
1. Browse available carnivals in your area
2. Check event details and requirements
3. Register your club through the provided links
4. Confirm your participation in the platform

### Managing Team Lists
For each carnival your club participates in:
- Submit your team roster
- Update player availability
- Coordinate with event organizers
- Track registration deadlines

## Administrative Features

### Dashboard Quick Actions
From your dashboard, you can quickly:
- **[Create New Carnival](${CONFIG.baseURL}/admin/carnivals/create)**: Start organizing a new event
- **[Register Event with NRL](https://www.playnrl.com)**: Official event registration
- **[Manage Club Profile](${CONFIG.baseURL}/admin/clubs)**: Update club information
- **[View All Carnivals](${CONFIG.baseURL}/admin/carnivals)**: Browse all events

### Reporting and Analytics
Access reports on:
- Your club's event participation history
- Player engagement metrics
- Event success metrics
- Community growth statistics

## Getting Support

### Technical Support
If you encounter issues with the platform:
1. Check the **[User Guide](${CONFIG.baseURL}/user-guide)** for common solutions
2. Contact platform support via the **[Contact Page](${CONFIG.baseURL}/contact)**
3. Reach out to other delegates in your network

### Training Resources
- Platform tutorial videos
- Step-by-step guides for common tasks
- Best practices for event management
- Community forums for delegates

## Best Practices

### Event Management
- **Plan Ahead**: Create carnivals well in advance to allow for proper promotion
- **Clear Communication**: Provide detailed event information and regular updates
- **Regular Updates**: Keep event information current as details change
- **Follow Up**: Confirm participation and coordinate with attending clubs

### Club Management
- **Keep Information Current**: Regularly update contact details and club information
- **Engage Members**: Use the platform to keep your club members informed
- **Network**: Connect with other clubs through the platform
- **Document Activities**: Use the platform to track your club's participation history

---

*For general platform information and public features, see the [Standard User Guide](./USER_GUIDE_STANDARD.md).*`;

    writeFileSync(guidePath, updatedContent);
    if (this.verbose) console.log('✅ Delegate User Guide updated successfully');
  }

  getCurrentDate() {
    return new Date().toISOString().split('T')[0];
  }

  updateAllGuides() {
    if (this.verbose) console.log('🚀 Updating all user guides...');
    this.updateStandardUserGuide();
    this.updateDelegateUserGuide();
    if (this.verbose) {
      console.log('✅ All user guides updated successfully!');
      console.log(`📁 Updated guides available at: ${CONFIG.docsDir}`);
    }
  }
}

// Main execution
async function main() {
  const updater = new UserGuideUpdater();
  updater.updateAllGuides();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default UserGuideUpdater;
