# **Old Man Footy Development Guidelines**

This document provides guiding principles and strict rules for developing this rugby league carnival management platform. Your primary goal is to act as an expert Node.js developer who is familiar with this codebase. Adhere to these instructions to ensure all contributions are consistent, secure, high-quality, and follow the established patterns of this repository.

## **Fundamental Principle: Adherence to Scope**

You MUST NOT build, implement, or generate any feature, function, or component that was not explicitly requested in a given task. Your role is to fulfill the requirements as specified.

It is acceptable and encouraged to *suggest* potential enhancements, alternative approaches, or refactoring opportunities as part of your response, but these suggestions MUST NOT be implemented unless explicitly approved and requested in a follow-up instruction.

If an instruction is ambiguous or lacks sufficient detail, you MUST report back with your current understanding for review, then ask clarifying questions before proceeding. Never make assumptions about the requirements or the intended functionality.

## **Core Directives & Priorities**

1. **Security First:** All code you generate MUST be secure. Prioritise security best practices in all layers of the application.  
2. **Strict MVC Pattern:** Adhere strictly to the Model-View-Controller separation of concerns defined below. Never mix logic between these layers.  
3. **Test-Driven Development (TDD):** All new business logic in models or controllers MUST be accompanied by corresponding unit tests.  
4. **Clarity and Readability:** Code MUST be clear, well-commented (using JSDoc), and easy for human developers to understand.  
5. **Execution Command Constraint:** NEVER run the command `npm run dev` or `npm start` or any other request to start the site. If you need me to restart the site, ask me to do it instead.

## **1. Technology Stack & Architecture**

### **Core Technologies**
* **Language:** JavaScript (ES2020+) - No TypeScript in this project
* **Runtime:** Node.js v18+ with Express.js 5.x
* **Module System:** ES Modules (ESM) ONLY - `"type": "module"` in package.json
* **Architecture:** Strict Model-View-Controller (MVC) with Service Layer
* **Database:** SQLite3 with Sequelize ORM v6
* **Testing:** Vitest with comprehensive coverage requirements (70%+ thresholds)
* **Authentication:** Custom session-based auth (NOT Passport.js)
* **Templating:** EJS with express-ejs-layouts for layout inheritance
* **Frontend:** Bootstrap 5 with custom CSS, dark/light mode support
* **Web Scraping:** Playwright for MySideline integration

### **Project Context**
This is a **rugby league carnival management platform** that handles:
- Carnival registration and management
- Club and player data management  
- MySideline.com.au integration for live data
- Image upload and gallery management
- Email notification system
- Role-based access control (Admin, Delegate, Member)
- Comprehensive audit logging

## **2. Security Requirements (High Priority)**

### **Input Validation & Sanitisation**
* **Express-Validator:** ALL incoming data MUST be validated using express-validator
* **Request Data:** Validate req.body, req.query, and req.params before use
* **SQL Injection Prevention:** Use ONLY Sequelize ORM methods - NO raw queries
* **XSS Prevention:** EJS auto-escapes with `<%= %>`. Use `<%- %>` ONLY for pre-sanitised HTML
* **CSRF Protection:** All forms MUST include CSRF tokens

### **Authentication & Authorization**
* **Session-Based Auth:** Uses custom session auth middleware (NOT Passport.js)
* **Auth Methods:** `req.isAuthenticated()`, `req.login(user, callback)`, `req.logout(callback)`
* **Role Hierarchy:** Admin > Delegate > Member
* **Permission Checks:** Use `requiresRole('Admin')` middleware for protected routes
* **AJAX Detection:** Use `isAjaxRequest(req)` for proper JSON error responses

### **Environment & Secrets**
* **Environment Variables:** ALL secrets via process.env - NO hardcoding
* **Rate Limiting:** Configurable via `ENABLE_RATE_LIMITING` environment variable
* **Feature Flags:** Use environment variables for feature toggles (e.g., `FEATURE_COMING_SOON_MODE`)
* **Security Headers:** Helmet.js configured for HTTPS, CSP, and other protections

## **3. Error Handling**

* **Consistent Error Responses:** All API error responses MUST follow a consistent JSON format: { "error": { "status": <HTTP_STATUS_CODE>, "message": "<DESCRIPTIVE_MESSAGE>" } }.  
* **Centralised Error Handler:** Use a centralised Express error-handling middleware. Controllers should use next(error) to pass errors to this handler.  
* **Avoid try-catch in Controllers:** For asynchronous route handlers, use a wrapper function or a library like express-async-errors to automatically catch and forward promise rejections to the central error handler.

## **3. MVC Architecture Pattern (Strict Enforcement)**

### **3.1. Models (/models)**
* **Purpose:** Data structure, validation, database interactions, and business logic
* **Database Integration:** Sequelize ORM v6 with complex model associations
* **Model Structure:** Each model extends Sequelize DataTypes with proper associations
* **Key Models:** User, Club, Carnival, CarnivalClub, CarnivalClubPlayer, Sponsor, ImageUpload
* **Association Pattern:** All associations defined in `models/index.mjs`
* **File Naming:** `[ResourceName].mjs` (PascalCase, e.g., `CarnivalClub.mjs`)
* **Rules:**
  * MUST use Sequelize methods only - NO raw SQL
  * MUST define associations in `models/index.mjs`
  * MUST include proper validation and constraints
  * MUST use JSDoc comments for all methods

### **3.2. Controllers (/controllers)**
* **Purpose:** Handle HTTP requests, orchestrate between models/services/views
* **Request Handling:** Use `asyncHandler` middleware for automatic error handling
* **Input Validation:** Use express-validator with consistent error format
* **Response Pattern:** JSON for AJAX, redirect/render for HTML requests
* **File Naming:** `[resource].controller.mjs` (kebab-case, e.g., `carnival-club.controller.mjs`)
* **Rules:**
  * MUST remain "thin" - delegate complex logic to services
  * MUST use validation middleware before processing
  * MUST handle both AJAX and HTML requests appropriately
  * MUST use proper error handling with `next(error)`

### **3.3. Services (/services)**
* **Purpose:** Complex business logic, external integrations, data processing
* **Email Services:** Hierarchical email service structure with BaseEmailService
* **MySideline Integration:** Specialized services for web scraping and data parsing
* **File Structure:** Organized by domain (e.g., `email/`, individual services)
* **Key Services:** MySidelineIntegrationService, ImageUploadService, AuditService
* **Rules:**
  * MUST extend BaseEmailService for email functionality
  * MUST use proper error handling and logging
  * MUST be testable with proper dependency injection
  * MUST include comprehensive JSDoc documentation

### **3.4. Views (/views)**
* **Purpose:** Presentation layer using EJS templating
* **Layout System:** Uses express-ejs-layouts with `layout.ejs`
* **Component Structure:** Shared partials in dedicated directories
* **Data Binding:** ONLY render data provided by controllers
* **Rules:**
  * MUST NOT contain business logic
  * MUST use EJS escaping (`<%= %>`) for user data
  * MUST include proper meta tags and accessibility features
  * MUST support dark/light mode theming

## **4. Service Layer Architecture**

### **4.1. Email Services (/services/email/)**
* **Base Class:** All email services MUST extend `BaseEmailService`
* **Feature Flags:** Email sending controlled by `FEATURE_EMAIL_ENABLED` environment variable
* **Service Hierarchy:** Specialized services for different email types (CarnivalEmailService, etc.)
* **Template System:** Email templates with both HTML and text versions
* **Error Handling:** Comprehensive error logging with fallback mechanisms

### **4.2. Integration Services**
* **MySideline Integration:** `MySidelineIntegrationService` orchestrates web scraping
* **Cron Scheduling:** Daily sync at 3 AM via cron scheduling
* **Service Delegation:** Uses specialized scraper and parser services
* **Data Processing:** Comprehensive data transformation and validation

### **4.3. Utility Services**
* **Image Upload:** Standardized image upload handling with validation
* **Audit Logging:** Comprehensive audit trail for all user actions
* **Date Utilities:** Excel serial date parsing and timezone handling

## **5. Unit Testing (/tests)**

### **5.1. Testing Framework & Configuration**
* **Framework:** Vitest with comprehensive configuration
* **Coverage Requirements:** 70%+ thresholds (lines, functions, branches, statements)
* **Test Structure:** Organized to mirror source code structure
* **File Naming:** `[resource].test.mjs` pattern with ES modules

### **5.2. Testing Patterns**
* **Mocking Strategy:** Comprehensive mocking of Sequelize models and external services
* **Database Testing:** Uses test-specific database configuration
* **AJAX Testing:** Proper testing of both HTML and JSON responses
* **Service Testing:** Isolated testing with dependency injection patterns

### **5.3. Test Requirements**
* All new business logic in models or controllers MUST be accompanied by corresponding unit tests using Vitest
* Tests should be placed in the /tests directory, mirroring the structure of the source code
* Use Arrange-Act-Assert pattern for test structure
* Mock external dependencies to ensure isolated testing

## **6. Database & Migrations**

* **ORM:** Use Sequelize with SQLite
* **Schema Changes:** ALL schema changes MUST be done through Sequelize migrations. Do not alter the database schema manually
  * To create a new migration: `npx sequelize-cli migration:generate --name <change-description>`
  * To run pending migrations: `npx sequelize-cli db:migrate`  
  * To undo the last migration: `npx sequelize-cli db:migrate:undo`
* **Complex Associations:** All model relationships defined in `models/index.mjs` with proper foreign keys
* **Data Integrity:** Use constraints, validations, and proper indexes for performance

## **7. Static Assets & Styling (/public)**

* **Location:** All public assets (CSS, client-side JS, images, icons) MUST be in the /public directory, organized into subdirectories (/styles, /js, /uploads, /screenshots)
* **Styling:** All CSS rules MUST be in external .css files within /public/styles. You MUST NOT use inline style attributes or CSS-in-JS. Styles MUST be authored to support both **light and dark modes**, preferably using CSS custom properties (variables) for colours that can be toggled with a prefers-color-scheme media query
* **Asset Referencing:** In view files (HTML, EJS), all asset paths MUST be root-relative
  * **Correct:** `<link rel="stylesheet" href="/styles/main.css">`
  * **Incorrect:** `<link rel="stylesheet" href="/public/styles/main.css">`

## **8. Client-Side Scripting & Manager Object Pattern**

### **8.1. Code Organization**
* **Principle:** You **MUST NOT** embed client-side application logic directly within <script> tags in .ejs or other view files. All client-side JavaScript **MUST** be placed in external .js files within the /public/js/ directory. This enforces a clean separation between server-rendered templates and client-side behaviour, improving maintainability and security.
* **File Structure:** Organize client-side JS by feature/page (e.g., `dashboard.js`, `carnival-edit.js`, `club-manage.js`)
* **Module Loading:** All view templates MUST include script tags with `type="module"` for ES6 module support

### **8.2. Manager Object Pattern (MANDATORY)**
All public JavaScript files MUST use the `export const descriptiveManager = { ... }` pattern to encapsulate functionality. This pattern allows for better organisation, modularity, and testability of client-side code.

#### **Core Structure:**
```javascript
export const dashboardManager = {
    elements: {},
    state: {},
    
    initialize() {
        this.cacheElements();
        this.bindEvents();
        this.initializeState();
    },
    
    cacheElements() {
        this.elements = {
            container: document.querySelector('#dashboard-container'),
            buttons: document.querySelectorAll('.action-btn'),
            // ... more elements
        };
    },
    
    bindEvents() {
        this.elements.buttons?.forEach(btn => {
            btn.addEventListener('click', this.handleButtonClick);
        });
        // Event handlers MUST be arrow functions for proper 'this' binding
    },
    
    handleButtonClick: (event) => {
        // Handler implementation
    }
};

// Browser initialization at bottom of file
document.addEventListener('DOMContentLoaded', () => {
    dashboardManager.initialize();
});
```

#### **Key Requirements:**
* **Single Exported Object**: All functions and state contained within a single `export const descriptiveManager = { ... }`
* **initialize Method**: Main entry point that orchestrates setup (cacheElements → bindEvents → initializeState)
* **cacheElements Method**: Finds and stores DOM elements on `this.elements` object for efficient access
* **bindEvents Method**: Attaches all event listeners using event delegation where appropriate
* **Arrow Functions**: All event handlers MUST be arrow functions to maintain correct `this` scope
* **State Management**: Use `this.state` object for managing component state
* **Error Handling**: Include try-catch blocks in critical methods, especially async operations

### **8.3. Data Passing & Integration**
* **Server-to-Client Data:** Pass dynamic data from controllers using `data-*` attributes on DOM elements
* **CSRF Integration:** Include CSRF tokens in AJAX requests using meta tags or data attributes
* **Bootstrap Integration:** Work with Bootstrap 5 components (modals, tooltips, etc.) using proper lifecycle methods
* **Utility Functions:** Import shared utilities from `/public/js/utils/` (e.g., `ui-helpers.js`)

### **8.4. Refactoring Legacy Code**
When converting existing JavaScript to Manager Object Pattern:
1. Create `export const managerName = { ... }` structure
2. Move global variables to `this.state` properties
3. Move DOM selections into `cacheElements()` method
4. Convert standalone functions to manager methods
5. Move event listeners to `bindEvents()` method
6. Convert event handlers to arrow functions
7. Update internal references to use `this.` prefix
8. Add DOMContentLoaded listener at file bottom
9. Update view template script tag with `type="module"`

## **9. Documentation**

* **JSDoc:** All public functions, classes, and complex logic blocks MUST have JSDoc-style comments.  
* **README.md:** When assisting in adding new features, update the README if necessary:  
  * **Dependencies/Scripts:** If package.json changes, update the "Installation" section.  
  * **Environment Variables:** If new variables are added, document them in the "Configuration" section.  
  * **API Endpoints:** If routes are added/changed, update the "API Reference" table.  
* **Changelog (/docs):** Based on recent commits, provide a bulleted list of changes for the changelog files in the /docs directory.

### **9.1. Test & Development Plans**

When asked to create a test or development plan, it MUST be created as a simple markdown file within the /docs/plans/ directory.

* **Format:** Use markdown checklists.  
* **Content:** The plan should be a list of tasks to be completed. It is a static checklist and SHOULD NOT be updated with progress reports.  
* **Test Progress:** It is acceptable to note the number of passing tests next to a checklist item.

#### **Example Plan (/docs/plans/feature-x-test-plan.md):**

# Test Plan: Feature X

- [ ] Model: `featureX.model.js` tests (5/7)  
- [ ] Controller: `featureX.controller.js` endpoint tests  
  - [ ] `GET /api/featureX`  
  - [ ] `POST /api/featureX`  
- [ ] Security: Input validation for `POST` endpoint  
- [ ] Documentation: Update README with new API endpoints  