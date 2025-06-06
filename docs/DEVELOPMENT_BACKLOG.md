Of course. Here is a simplified backlog of user stories with their current development status, presented in a logical order.

### **Development Backlog: Rugby League Masters Platform**

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
| As a developer, I want to ensure all user interfaces, views and models are vigorously unit tested aiming for 100% coverage. | 🔄 In Progress |
| **Enhancements** | |
| As a delegate, I want to be able to list our club on the site, so local players without affiliation can find a Masters team. This should include name, location and contact details, as well as ability to link to social media pages. | ⭕ Not Started |
| As a developer, I want to have a route for potential players to search for clubs and view them in their state | ⭕ Not Started |
| As a user, I want to view carnivals on a calendar to visualise event dates. | ⭕ Not Started |
| As a user, I want to use advanced search and filtering options to find specific carnivals easily. | ⭕ Not Started |
| As an administrator, I want to view an analytics dashboard to understand carnival trends and platform usage. | ⭕ Not Started |
| As a club delegate, I want to display social media links and feeds on carnival pages. | ⭕ Not Started |
| As an administrator, I want to manage advanced user roles and permissions. | ⭕ Not Started |
| As an administrator, I want the system to create audit logs for key user and system actions. | ⭕ Not Started |
| As a club delegate, I want to use an in-app messaging system to communicate with other users and administrators. | ⭕ Not Started |
| As an administrator, I want to generate and export custom reports on platform activity. | ⭕ Not Started |
| As a mobile user, I want the site to function as a Progressive Web App (PWA) for an improved, near-native experience. | ⭕ Not Started |
| As a developer, I want to ensure my entire site is vigorously tested and confirmed working 100% and all unit tests are written and executed. | ⭕ Not Started |
| **Production & Infrastructure** | |
| As a developer, I want to configure the production environment (SQLite database, email, SSL) for the application to go live. | 🔄 In Progress |
| As a developer, I want to set up a CI/CD pipeline for automated testing and deployment. | 🔄 In Progress |
| As an administrator, I want automated SQLite database backups and a disaster recovery plan to protect platform data. | ⭕ Not Started |
| As an administrator, I want the production environment to use load balancing and a CDN to ensure performance and availability. | ⭕ Not Started |