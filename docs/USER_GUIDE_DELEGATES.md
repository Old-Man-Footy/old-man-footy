# Old Man Footy - Club Delegate User Guide

Welcome to the Old Man Footy platform! This guide will help you understand how to use the system as a club delegate to manage your club's participation in Masters Rugby League events.

## Getting Started

### What is Old Man Footy?
Old Man Footy is a platform designed to help manage Masters Rugby League events (carnivals) across Australia. As a club delegate, you can view and manage information about events your club is participating in.

### Your Role as a Club Delegate
- **Primary Delegate**: The main contact person for your club with full management permissions
- **Club Delegate**: Additional representatives who can view and manage club information

## Dashboard Overview

When you log in, you'll see your dashboard which provides comprehensive management tools:

![Dashboard Overview](./screenshots/delegate-user/dashboard-overview.png)
*Club delegate dashboard with quick stats and management options*

### Quick Stats
The dashboard provides an at-a-glance view of your club's activity:

![Dashboard Stats](./screenshots/delegate-user/dashboard-stats.png)
*Key statistics showing your club's event participation*

- **[Your Carnivals](http://localhost:3050/dashboard)**: Number of events your club is registered for
- **[Upcoming Events](http://localhost:3050/dashboard?filter=upcoming)**: Events happening in the future
- **Your Club**: Your club name and delegate status

## Managing Carnivals (Events)

### Carnival Management Interface

![Carnival Management](./screenshots/delegate-user/carnival-management.png)
*Comprehensive carnival management interface for delegates*

Access the **[Carnival Management](http://localhost:3050/admin/carnivals)** section to:
- View all carnivals in the system
- Manage your club's carnival participation
- Edit event details (if you're the organizer)
- Track registration status

### Creating a New Carnival

![Carnival Creation Form](./screenshots/delegate-user/carnival-creation-form.png)
*Form for creating a new carnival event*

1. Navigate to **[Carnivals](http://localhost:3050/admin/carnivals)** in the admin menu
2. Click **[Create New Carnival](http://localhost:3050/admin/carnivals/create)**
3. Fill in the required details:
   - **Title**: Name of your event
   - **Date**: When the event takes place
   - **Location**: Venue address and details
   - **State**: Which state the event is in
   - **Registration URL**: Link for teams to register
   - **Description**: Additional event information

## Club Management

### Club Administration

![Club Management](./screenshots/delegate-user/club-management.png)
*Club management interface for maintaining club information*

Access **[Club Management](http://localhost:3050/admin/clubs)** to:
- Update your club's profile information
- Manage club contact details
- Upload club logos and images
- Maintain player rosters

## Getting Support

### Technical Support
If you encounter issues with the platform:
1. Check the **[User Guide](http://localhost:3050/user-guide)** for common solutions
2. Contact platform support via the **[Contact Page](http://localhost:3050/contact)**
3. Reach out to other delegates in your network

---

*For general platform information and public features, see the [Standard User Guide](./USER_GUIDE_STANDARD.md).*