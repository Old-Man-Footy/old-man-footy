/**
 * Seed script for HelpContent table
 * Populates initial markdown help content for key pages.
 */
import HelpContent from '../models/HelpContent.mjs';

const helpPages = [
  {
    pageIdentifier: 'homepage',
    title: 'Homepage Help',
    content: `# Welcome to Old Man Footy!

Old Man Footy is your central hub for Masters Rugby League carnivals and clubs across Australia.

## Features
- **Upcoming Carnivals**: View and register for upcoming events.
- **Quick Stats**: See club and carnival numbers at a glance.
- **Club Search**: Find clubs in your area.
- **Get Started**: Register as a club delegate to unlock management features.

Need more help? Click the links in the navigation or contact us!`,
  },
  {
    pageIdentifier: 'about',
    title: 'About Page Help',
    content: `# About Old Man Footy

Learn what Old Man Footy does and how it works.

## Platform Purpose
- Connects clubs, players, and fans.
- Makes Masters Rugby League events discoverable.

## How It Works
- Browse carnivals and clubs.
- Register as a delegate to manage events.

## Club Delegate Role
- Manage club profiles and carnivals.
- Organize and promote events.

## Carnival Organization
- Delegates create and manage carnivals.
- All details are available for participants.`,
  },
  {
    pageIdentifier: 'contact',
    title: 'Contact Page Help',
    content: `# Contact Us

Use the contact form to reach the Old Man Footy team.

## How to Submit Inquiries
- Fill out all required fields.
- Select the subject that best matches your inquiry.
- Provide your club name if relevant.

## Newsletter Signup
- Subscribe for updates and news.`,
  },
  {
    pageIdentifier: 'dashboard',
    title: 'Dashboard Help',
    content: `# Dashboard Help

Welcome to your dashboard!

## Features
- View your club and carnival stats.
- Access quick actions for management.
- See recent activity and updates.

## Navigation
- Use the menu to access different management areas.`,
  },
  {
    pageIdentifier: 'club-show',
    title: 'Club Profile Help',
    content: `# Club Profile Help

View detailed information about a club.

## Features
- Club leadership and delegate structure.
- Club statistics and history.
- Contact options and social media links.`,
  },
  {
    pageIdentifier: 'carnival-new',
    title: 'Add Carnival Help',
    content: `# Add New Carnival

Create a new Masters Rugby League carnival.

## Steps
- Fill out all required fields.
- Review imported MySideline data (if present).
- Add sponsors and club participants.

## Tips
- Fields marked as "Imported from MySideline" are read-only unless claimed.
- Editable fields can be updated by the delegate.`,
  },
  {
    pageIdentifier: 'sponsors-list',
    title: 'Sponsors List Help',
    content: `# Sponsors List Help

Find and manage sponsors for carnivals and clubs.

## Features
- Search and filter sponsors by state and level.
- View sponsor details and contact information.
- Understand Gold/Silver/Bronze levels.
- Stats bar shows sponsor counts.`,
  },
  {
    pageIdentifier: 'error',
    title: 'Error Page Help',
    content: `# Error Page Help

If you see this page, something went wrong.

## Common Issues
- 404: Page not found.
- 403: Access denied.
- 500: Internal server error.

## What to Do
- Check the URL and try again.
- Contact support if the problem persists.`,
  },
];

async function seedHelpContent() {
  for (const page of helpPages) {
    await HelpContent.upsert(page);
  }
  console.log('HelpContent table seeded with initial markdown help content.');
}

seedHelpContent().catch(console.error);
