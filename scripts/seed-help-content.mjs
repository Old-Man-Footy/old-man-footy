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

Need more help? Click the links in the navigation or contact us!`
  },
  {
    pageIdentifier: 'about',
    title: 'About Page Help',
    content: `# About Old Man Footy

Welcome to the About page! Here you can learn what Old Man Footy does and how it works.

## Platform Purpose
Old Man Footy connects clubs, players, and fans, making Masters Rugby League events discoverable and accessible across Australia.

## How It Works
- **Browse Carnivals and Clubs**: Explore upcoming events and club profiles.
- **Register as a Delegate**: Unlock management features for your club or carnival.
- **Stay Informed**: Get updates on new carnivals, club activities, and sponsor opportunities.

## Club Delegate Role
Delegates manage club profiles, organize carnivals, and promote events. They are the main point of contact for club administration and event coordination.

## Carnival Organization
Delegates can create and manage carnivals, add sponsors, and invite clubs to participate. All event details are available for participants and fans.

For more details, check the navigation links or contact support.`
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
- Subscribe for updates and news.`
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
- Use the menu to access different management areas.`
  },
  {
    pageIdentifier: 'club-show',
    title: 'Club Profile Help',
    content: `# Club Profile Help

View detailed information about a club.

## Features
- Club leadership and delegate structure.
- Club statistics and history.
- Contact options and social media links.`
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
- Editable fields can be updated by the delegate.`
  },
  {
    pageIdentifier: 'sponsors-list',
    title: 'Sponsors List Help',
    content: `# Sponsors List Help
  {
    pageIdentifier: 'clubs-list',
Find and explore Masters Rugby League clubs across Australia.

## Features
  {
    pageIdentifier: 'clubs-list',
    title: 'Clubs List Help',
    content: `# Clubs List Help

Find and explore Masters Rugby League clubs across Australia.

## Features
- **Club Search**: Use the search bar to find clubs by name or location.
- **State Filter**: Filter clubs by Australian state to narrow your results.
- **Club Cards**: Each card displays key club information, including name, location, and delegate contacts.
- **Contact Delegate**: Use the contact options to reach out and join a club.
- **Club Profiles**: Click on a club card to view detailed information, history, and social media links.

## Tips
- Use filters to find clubs near you or in your preferred state.
- Review club profiles for leadership structure and history.
- Contact delegates for membership or event participation.

For more help, contact support or check the navigation links.`
  },
- **Club Search**: Use the search bar to find clubs by name or location.
- **State Filter**: Filter clubs by Australian state to narrow your results.
- **Club Cards**: Each card displays key club information, including name, location, and delegate contacts.
- **Contact Delegate**: Use the contact options to reach out and join a club.
- **Club Profiles**: Click on a club card to view detailed information, history, and social media links.

## Tips
- Use filters to find clubs near you or in your preferred state.
- Review club profiles for leadership structure and history.
- Contact delegates for membership or event participation.

For more help, contact support or check the navigation links.`
  },
- Contact sponsors directly for partnership opportunities.

For more help, contact support or check the navigation links.`
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
- Contact support if the problem persists.`
  }
];

async function seedHelpContent() {
  for (const page of helpPages) {
    await HelpContent.upsert(page);
  }
  console.log('HelpContent table seeded with initial markdown help content.');
}

seedHelpContent().catch(console.error);
