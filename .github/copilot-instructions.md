# **Project Development Guidelines**

This document provides guiding principles and strict rules for developing this project. Your primary goal is to act as an expert Node.js developer who is familiar with this codebase. Adhere to these instructions to ensure all contributions are consistent, secure, high-quality, and follow the established patterns of this repository.

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

## **1. Project Stack**

* **Language:** TypeScript / JavaScript (ES2020+)  
* **Framework:** Node.js with Express.js  
* **Module System:** ES Modules (ESM) over CommonJS. We use the modern import/export syntax as it is the official standard for JavaScript and the modern approach for Node.js. This enables features like top-level await for cleaner asynchronous code and allows for static analysis, which can improve optimisation. This supersedes the legacy CommonJS (require/module.exports) system.  
* **Architecture:** Model-View-Controller (MVC)  
* **Database:** SQLite3 with Sequelize ORM  
* **Testing:** Vitest

## **2. Security (High Priority)**

* **Input Sanitisation:** All incoming data from request bodies (req.body), query parameters (req.query), or route parameters (req.params) MUST be sanitised and validated before use. Use a library like express-validator.  
* **SQL Injection:** You MUST NOT use raw string interpolation to build database queries. Use only Sequelize's built-in methods, which automatically sanitise inputs.  
* **Cross-Site Scripting (XSS):** When rendering data in views, ensure it is properly escaped to prevent XSS attacks. Template engines like EJS often have mechanisms for this (e.g., using -%> for unescaped output is forbidden unless explicitly required and sanitised).  
* **Secret Management:** Secrets (API keys, database passwords) MUST NOT be hardcoded. They must only be accessed via environment variables (e.g., process.env.API_KEY).  
* **Dependency Security:** Do not suggest adding dependencies with known vulnerabilities.

## **3. Error Handling**

* **Consistent Error Responses:** All API error responses MUST follow a consistent JSON format: { "error": { "status": <HTTP_STATUS_CODE>, "message": "<DESCRIPTIVE_MESSAGE>" } }.  
* **Centralised Error Handler:** Use a centralised Express error-handling middleware. Controllers should use next(error) to pass errors to this handler.  
* **Avoid try-catch in Controllers:** For asynchronous route handlers, use a wrapper function or a library like express-async-errors to automatically catch and forward promise rejections to the central error handler.

## **4. MVC (Model-View-Controller) Architecture**

This project enforces a strict separation of concerns.

### **4.1. Models (/models)**

* **Purpose:** Define data structure, validation, and all database interactions.  
* **Rules:**  
  * MUST contain all database query logic (using Sequelize).  
  * MUST NOT interact directly with the Express req or res objects.  
  * SHOULD contain business logic related to data manipulation and validation (e.g., password hashing, data formatting).  
  * File Naming:[resource-name].model.js (e.g., user.model.js).

### **4.2. Views (/views)**

* **Purpose:** The presentation layer (HTML templates) or JSON response structure.  
* **Rules:**  
  * MUST NOT contain any database queries or complex business logic.  
  * MUST only render data provided to it by a controller.  
  * For APIs, the "view" is the JSON response sent by the controller. This response MUST be structured cleanly and predictably.

### **4.3. Controllers (/controllers)**

* **Purpose:** Handle HTTP requests, orchestrate interactions between models and views.  
* **Rules:**  
  * MUST handle the Express req and res objects.  
  * MUST call methods from the models to fetch or persist data.  
  * MUST perform input validation before passing data to models or services.  
  * MUST decide which view to render or what JSON data to send as a response.  
  * MUST delegate complex business logic to a service layer or the model; controllers should remain "thin".  
  * File Naming: [resource-name].controller.js (e.g., user.controller.js).

## **5. Unit Testing (/tests)**

*(Note: Specific instructions for unit testing were not provided, but are governed by the TDD directive in "Core Directives & Priorities".)*

* All new business logic in models or controllers MUST be accompanied by corresponding unit tests using Vitest.  
* Tests should be placed in the /tests directory, mirroring the structure of the source code.

## **6. Database & Migrations**

* **ORM:** Use Sequelize with SQLite.  
* **Schema Changes:** ALL schema changes MUST be done through Sequelize migrations. Do not alter the database schema manually.  
  * To create a new migration: npx sequelize-cli migration:generate --name <change-description>  
  * To run pending migrations: npx sequelize-cli db:migrate  
  * To undo the last migration: npx sequelize-cli db:migrate:undo

## **7. Static Assets & Styling (/public)**

* **Location:** All public assets (CSS, client-side JS, images, icons) MUST be in the /public directory, organized into subdirectories (/styles, /scripts, /images, /icons).  
* **Styling:** All CSS rules MUST be in external .css files within /public/styles. You MUST NOT use inline style attributes or CSS-in-JS. Styles MUST be authored to support both **light and dark modes**, preferably using CSS custom properties (variables) for colours that can be toggled with a prefers-color-scheme media query.  
* **Asset Referencing:** In view files (HTML, EJS), all asset paths MUST be root-relative.  
  * **Correct:** <link rel="stylesheet" href="/styles/main.css">  
  * **Incorrect:** <link rel="stylesheet" href="/public/styles/main.css">

## **8. Client-Side Scripting**

* **Principle:** You **MUST NOT** embed client-side application logic directly within <script> tags in .ejs or other view files. All client-side JavaScript **MUST** be placed in external .js files within the /public/js/ directory. This enforces a clean separation between server-rendered templates and client-side behaviour, improving maintainability and security.

* ### **Public JavaScript: The Manager Object Pattern: All public JavaScript files MUST use the export const descriptiveManager = { ... } pattern to encapsulate functionality. This pattern allows for better organisation, modularity, and testability of client-side code. Key Principles:** 

  * **Single Exported Object**: All functions and state should be contained within a single export const descriptiveManager = { ... };.  
  * **initialize Method**: The object must have an initialize() method that serves as the main entry point. This method is responsible for setting up the entire module.  
  * **Cache DOM Elements**: The initialize() method should first call a cacheElements() method. This method finds all necessary DOM elements and stores them on a this.elements object for easy and efficient access.  
  * **Bind Events**: The initialize() method must call a bindEvents() method to attach all event listeners. Event handlers **MUST** be defined as arrow functions to correctly scope this.  
  * **Browser-Specific Code at the Bottom**: The DOMContentLoaded event listener, which kicks everything off in the browser, should be at the very bottom of the file, outside the manager object. Its only job is to call managerName.initialize().  
* **Passing Data to Scripts:** To pass dynamic data from a controller to a client-side script, attach it to the DOM using data-* attributes. The external script can then read these attributes.  
* **Refactoring Guide:** When refactoring an existing JavaScript file to the Manager Object Pattern, follow these steps:  
  1. Introduce the export const managerName = { ... } structure.  
  2. Move global variables to be properties of the manager.  
  3. Move DOM selections into a cacheElements() method.  
  4. Convert standalone functions into methods of the manager object.  
  5. Move event listener attachments into a bindEvents() method.  
  6. Rewrite event handlers as arrow functions.  
  7. Update all internal references to use this. (e.g., this.validateInput()).  
  8. Add the DOMContentLoaded listener at the end of the file.  
  9. Ensure the corresponding view's <script> tag has type="module".

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