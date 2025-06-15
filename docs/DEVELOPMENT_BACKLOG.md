### **Development Backlog: Old Man Footy Platform**

| User Story | Status |
| :--- | :--- |
| **Authentication & User Management** | |
| As a club delegate, I want to register for an account and associate with my club so that I can manage our carnivals. | ✅ Completed |
| As a user, I want to log in and out securely to access and protect my account. | ✅ Completed |
| As a primary delegate, I want to invite other delegates from my club via a secure token so that they can help manage our events. | ✅ Completed |
| As a new user, I want to accept an email invitation to create an account and join my designated club. | ✅ Completed |
| As a primary delegate, I want to manage the other delegates associated with my club. | ✅ Completed |
| **Carnival & Club Management** | |
| As a club delegate, I want to create a new carnival event with a title, date, location, fees, and contact details. | ✅ Completed |
| As a club delegate, I want to view all the carnivals I manage on a central dashboard. | ✅ Completed |
| As a club delegate, I want to edit the details of an existing carnival to keep information current. | ✅ Completed |
| As a club delegate, I want to deactivate or delete a carnival to remove it from public view. | ✅ Completed |
| As a club delegate, I want to upload files (club logos, promotional images, draw documents) to a carnival listing. | ✅ Completed |
| **Public User Features** | |
| As a public user, I want to view a list of upcoming carnivals on the home page to find events. | ✅ Completed |
| As a public user, I want to view the full details of a specific carnival. | ✅ Completed |
| As a public user, I want to subscribe to email notifications for new carnivals in a specific state. | ✅ Completed |
| As a subscriber, I want to easily unsubscribe from email notifications. | ✅ Completed |
| **Email & Notifications** | |
| As a subscriber, I want to receive an email notification when a new carnival is created or updated in my state. | ✅ Completed |
| As a subscriber, I want to receive a weekly roundup email of upcoming carnivals. | ✅ Completed |
| **MySideline Integration** | |
| As an administrator, I want the system to automatically sync with MySideline daily to discover and import new events. | ✅ Completed |
| As a club delegate, I want to claim ownership of an event that was automatically imported from MySideline. | ✅ Completed |
| As an administrator, I want to trigger a manual data synchronisation with MySideline on demand. | ✅ Completed |
| As a developer, I want a local database which I can populate my development website with from MySideline and manual entry to test against. | ✅ Completed |
| **User Interface & Experience** | |
| As a user, I want to experience a professional and responsive "Green and Gold" theme on both desktop and mobile devices. | ✅ Completed |
| As a club delegate, I want to see a dashboard with statistics and filtering options to manage my carnivals effectively. | ✅ Completed |
| As an administrator, I want to view a panel with comprehensive metrics on platform usage and events. | ✅ Completed |
| As a developer, I want to ensure there are no references to MongoDB/Mongoose instead we should be using SQLite/Sequelize. | ✅ Completed |
| As a developer, I want to ensure my site follows all best practices outlined in .github/copilot-instructions.md | ✅ Completed |
| As a developer, I want all buttons and links on the website to have a purpose and a destination. Ensure they all have a function. | ✅ Completed |
| As a club delegate, I want to ensure any carnivals I create on this website are merged with data synched from MySideline. We should not end up with duplicates. | ✅ Completed |
| As a club delegate, I want to be able to list our club on the site, so local players without affiliation can find a Masters team. This should include name, location and contact details, as well as ability to link to social media pages.  | ✅ Completed |
| As a user, when I want to be able to uncheck the 'Upcoming events only' checkbox on All Carnivals page. | ✅ Completed |
| As a developer, I want puppeteer calls to be headless when in production mode only so I can see what is happening during development. | ✅ Completed |
| As a club delegate, I want Our Carnivals to be linked to our Club pages, and vice versa. | ✅ Completed |
| As a developer, I want to ensure images (icons/images) which are uploaded by delegates or sub delegates remain linked to that club and/or carnival. This requires a complex naming standard be added to uploaded and renamed images | ✅ Completed |
| As a club delegate, I want to be able to transfer the role of delegate to another user. | ✅ Completed |
| As a user, I want to use advanced search and filtering options to find specific carnivals easily. | ✅ Completed |
| As a club delegate, I want to display social media links and feeds in Contact information on carnival pages. | ✅ Completed |
| As a developer, I want to be able to store sponsor information, including logo, name, location, description of business, contacts and social media information. Sponsors can be linked to by multiple clubs. | ✅ Completed |
| As a club delegate, I want to be able to add sponsors and link them to my Club, and Carnivals. | ✅ Completed |
| As a user, I want to be able to see sponsors on Club and Carnival pages | ✅ Completed |
| As a club delegate, I want my sponsors sorted by most important at the top on my club and carnival pages. | ✅ Completed |
| As a user, when I click on a sponsor, it should open a sponsor page with full details about the sponsor, logo, name, location, description etc.  All the information in the sponsor model should be on this screen. | ✅ Completed |
| As a club delegate, I want to add 1:N alternate names to my club which are used when searching. | ✅ Completed |
| As a user, I don't want links to be underlined on hover if they already move or change colour. | ✅ Completed |
| As a club delegate, I want to see a list of my sponsors on my club page with prominent Logo, Name, Location (and optional socials and contact details) and be able to order them by priority | ✅ Completed |
| As a developer, I want to be able to link other clubs to Carnivals as attendees. Creating a new route CarnivalClub for 1:N relationships. | ✅ Completed |
| As a club delegate, I want to be able to mark my club as attending a Carnival run by another club. | ✅ Completed |
| As a club delegate, I want clubs who have marked as coming to a carnival to be displayed on the Carnival information page in a list, with links to their club page. | ✅ Completed |
| As a club delegate, I want to be able to upload a Draw for a Carnival and have it displayed on the Carnival page. | ✅ Completed |
| As a club delegate, I want to be able to email information on the carnival to attendee clubs directly from the Carnival page when logged in, email should have a link back to the carnival page. | ✅ Completed |
| As a club delegate, when I log in, I want to be able to access a Markdown user guide that helps me understand how the site works. | ✅ Completed |
| As a club delegate, The user guide should explain the process of creating carnivals. | ✅ Completed |
| As a club delegate, The user guide should explain the process of creating clubs on behalf of other clubs. | ✅ Completed |
| As a club delegate, The user guide should explain the process of claiming imported carnivals from MySideline. | ✅ Completed |
| As a club delegate, The user guide should explain the process of how imported carnivals will merge with my created ones later. | ✅ Completed |
| As a club delegate, The user guide should explain the process of how to update the club profile including logo. | ✅ Completed |
| As a club delegate, The user guide should explain the process of how to add images to my club profile. | ✅ Completed |
| As a club delegate, The user guide should explain the process of how to upload images to my carnival. | ✅ Completed |
| As a club delegate, The user guide should explain the process of sending correspondence to carnival attendees. | ✅ Completed |
| As a developer, I want to create a dedicated Contact Us page with a contact form to replace the contact details on the About page. | ✅ Completed |
| As a club delegate, When I mark my club as inactive, it should be removed from the "Find Clubs" interface (it can show up on historical pages but should clearly show the club is no longer active). | ✅ Completed |
| As a developer, I want random images uploaded by users (not icons) to be used in the home page carousel. Prioritising recent images. | ✅ Completed |
| As a developer, I want to store the MySideline title in a separate hidden field that never changes, for use when matching MySideline carnivals.<br>It should:<br>- Populate on create from MySideline<br>- Be used for matching Carnival records instead of using `title` | ✅ Completed |
| As a developer, MySideline Sync should only update 'Active' carnivals | ✅ Completed |
| As an administrator, I want to be able to edit all clubs, Carnivals or users, and issue password resets or close accounts from my dashboard. The Administrator Dashboard will look different to Delegates. | ✅ Completed |
| As a user, I should not see inactive Carnivals on the front or 'All Carnivals' pages. | ✅ Completed |
| As a user, I would like addresses on Carnivals to be clickable, opening a link to a Google Maps location. `https://maps.google.com/maps?q=<locationAddress>` and have it rendered neatly using locationAddressPart1-4 fields. | ✅ Completed |
| As a developer, I want the Go Back button on error screens to navigate 'back' to the previous page. | ✅ Completed |
| As a delegate, I should see a warning about deactivating a Carnival, or Club stating they will "no longer be visible on the site" before I can save it. | ✅ Completed |
| As a delegate, if I deactivate my Club, I expect the Club will remain visible only for historical carnivals, but the link to the club page itself will no longer open, and the link will look disabled. | ✅ Completed |
| As a delegate, when signing up and I start typing the name of my club, deactivated clubs are able to be chosen from. If I select a club which is deactivated, an option to reactivate is offered. If reactivated, the new user will be added as a Primary Delegate. The original delegate will be notified via email, with a link to respond if believed fraudulent. | ✅ Completed |
| As a user, I want to be able to select dark/light mode from a toggle in the top right corner next to Register button. This should replace white backgrounds with black/dark grey, black writing with white and, and dark grey writing with light grey. This setting should also be remembered by the browser. | ⭕ Not Started |
| As a delegate, I want to be able to merge (unclaimed) carnivals with one I own if for some reason a duplicate is imported and does not match an already created carnival. The option to select which carnival to merge with, defaulting to the latest.<br>Merging will:<br>- Populate all MySideline related fields.<br>- Set only empty fields from the 'source' carnival<br>- Deactivate the old Carnival. | ⭕ Not Started |
| As a delegate, when I claim a carnival and I already have at least one carnival created, i should get the option to merge it with that/or another carnival. | ⭕ Not Started |
| As a developer, I want the README.md to fully reflect current Project Structure state  | ⭕ Not Started |
| As a developer, I want to add a "Buy me a coffee" link in the footer. This is to help fund hosting of the site. It links to a this link: `paypal.me/pfproductions/5`  | ⭕ Not Started |
| As an administrator, I want to manage advanced user roles and permissions. Like creating new Administrators, or Delegates on behalf of others. | ⭕ Not Started |
| As a delegate, I want to be able to bulk remove or update contact information from clubs or carnivals from my dashboard. | ⭕ Not Started |
| **Script Extraction Implementation** | |
| As a developer, I want to re-enable Express Layouts script extraction in app.js to optimize script loading performance. | ⭕ Not Started |
| As a developer, I want to update the main layout template (views/layout.ejs) to properly handle extracted scripts using <%- script %> placeholder. | ⭕ Not Started |
| As a developer, I want to update admin user management view (views/admin/users.ejs) to use script extraction blocks instead of direct script tags. | ⭕ Not Started |
| As a developer, I want to update admin edit user view (views/admin/edit-user.ejs) to use script extraction blocks instead of direct script tags. | ⭕ Not Started |
| As a developer, I want to update admin dashboard view (views/admin/dashboard.ejs) to use script extraction blocks for any page-specific scripts. | ⭕ Not Started |
| As a developer, I want to update admin reports view (views/admin/reports.ejs) to use script extraction blocks for any page-specific scripts. | ⭕ Not Started |
| As a developer, I want to update admin carnivals view (views/admin/carnivals.ejs) to use script extraction blocks for any page-specific scripts. | ⭕ Not Started |
| As a developer, I want to update admin edit carnival view (views/admin/edit-carnival.ejs) to use script extraction blocks for any page-specific scripts. | ⭕ Not Started |
| As a developer, I want to update main dashboard view (views/dashboard.ejs) to use script extraction blocks for dashboard-specific scripts. | ⭕ Not Started |
| As a developer, I want to update carnival show view (views/carnivals/show.ejs) to use script extraction blocks for carnival-specific scripts. | ⭕ Not Started |
| As a developer, I want to update carnival management views (views/carnivals/edit.ejs, views/carnivals/new.ejs) to use script extraction blocks. | ⭕ Not Started |
| As a developer, I want to update club show view (views/clubs/show.ejs) to use script extraction blocks for club-specific scripts. | ⭕ Not Started |
| As a developer, I want to update club management views (views/clubs/manage.ejs, views/clubs/sponsors.ejs, views/clubs/add-sponsor.ejs) to use script extraction blocks. | ⭕ Not Started |
| As a developer, I want to update sponsor management views (views/sponsors/*.ejs) to use script extraction blocks for sponsor-specific scripts. | ⭕ Not Started |
| As a developer, I want to update authentication views (views/auth/*.ejs) to use script extraction blocks for auth-specific scripts. | ⭕ Not Started |
| As a developer, I want to test all admin functionality after script extraction implementation to ensure user management buttons still work correctly. | ⭕ Not Started |
| As a developer, I want to test all carnival management functionality after script extraction implementation to ensure all interactive features work correctly. | ⭕ Not Started |
| As a developer, I want to test all club management functionality after script extraction implementation to ensure all interactive features work correctly. | ⭕ Not Started |
| As a developer, I want to test all sponsor management functionality after script extraction implementation to ensure all interactive features work correctly. | ⭕ Not Started |
| As a developer, I want to verify that script loading order is maintained correctly after implementing script extraction across all pages. | ⭕ Not Started |
| As a developer, I want to ensure Content Security Policy (CSP) compatibility is maintained after implementing script extraction. | ⭕ Not Started |
| As a developer, I want to create comprehensive documentation for the script extraction pattern for future development reference. | ⭕ Not Started |
| **Testing** | |
| As a tester, I want comprehensive unit tests for, and limited to `models/Carnival.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `models/Club.js`  | ⭕ Not Started |
| As a developer, all test data (not seed data) should use `/icons/test-tube.svg` as a stand-in logo image. | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `models/User.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `models/CarnivalSponsor.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `models/ClubSponsor.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `models/Sponsor.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `models/Index.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `models/EmailSubscription.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `models/ClubAlternateName.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `models/SyncLog.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `services/emailService.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `services/mySidelineDataService.js` | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `services/mySidelineEventParserService.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `services/mySidelineScraperService.js` | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `services/mySidelineIntegrationService.js` | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `services/imageNamingService.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `controllers/auth.controller.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `controllers/carnival.controller.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `controllers/club.controller.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `controllers/main.controller.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `controllers/admin.controller.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `controllers/auth.controller.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `controllers/clubSponsor.controller.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `controllers/carnivalSponsor.controller.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `controllers/sponsor.controller.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `routes/admin.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `routes/auth.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `routes/carnivals.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `routes/clubs.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `routes/index.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `routes/sponsor.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/auth/accept-invitation.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/auth/login.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/auth/register.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/carnivals/add-club.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/carnivals/attendees.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/carnivals/edit.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/carnivals/edit-registration.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/carnivals/list.ejs`  | ⭕ Not Started | 
| As a tester, I want comprehensive unit tests for, and limited to `views/carnivals/new.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/carnivals/show.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/carnivals/sponsors.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/clubs/clubs.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/clubs/list.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/clubs/manage.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/clubs/show.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/clubs/sponsors.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/clubs/add-sponsor.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/clubs/club-options.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/about.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/admin/dashboard.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/admin/edit-user.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/admin/reports.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/admin/stats.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/admin/carnivals.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/admin/edit-carnivals.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/dashboard.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/error.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/index.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/layout.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/user-guide.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/contact.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `views/partials/carnival-address.ejs`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `public/js/admin-carnival.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `public/js/admin-user-management.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `public/js/admin-reports.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `public/js/auth.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `public/js/common-utils.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `public/js/carnival-management.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `public/js/dashboard.js`  | ⭕ Not Started |
| As a tester, I want comprehensive unit tests for, and limited to `public/js/sponsor-management.js`  | ⭕ Not Started |
| **Enhancements** | |
| As an administrator, I want to view an analytics dashboard to understand carnival trends and platform usage. | ⭕ Not Started |
| As an administrator, I want the system to create audit logs for key user and system actions. | ⭕ Not Started |
| As an administrator, I want to generate and export custom reports on platform activity. | ⭕ Not Started |
| As a mobile user, I want the site to function as a Progressive Web App (PWA) for an improved, near-native experience. | ⭕ Not Started |
| **Production & Infrastructure** | |
| As a developer, I want to ensure my entire site is vigorously tested and confirmed working 100% and all unit tests have been executed and passing. | ⭕ Not Started |
| As a developer, I want to configure the production environment (SQLite database, email, SSL) for the application to go live. | 🔄 In Progress |
| As a developer, I want to set up a CI/CD pipeline for automated testing and deployment. | 🔄 In Progress |
| As an administrator, I want automated SQLite database backups and a disaster recovery plan to protect platform data. | ⭕ Not Started |
| As an administrator, I want the production environment to use load balancing and a CDN to ensure performance and availability. | ⭕ Not Started |
