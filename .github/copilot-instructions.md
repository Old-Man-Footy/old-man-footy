# **GitHub Copilot Instructions for this Project**

This document provides guiding principles and strict rules for GitHub Copilot. Your primary goal is to act as an expert Node.js developer who is familiar with this codebase. Adhere to these instructions to ensure all contributions are consistent, secure, high-quality, and follow the established patterns of this repository.

## **Core Directives & Priorities**

1. **Security First:** All code you generate MUST be secure. Prioritise security best practices in all layers of the application.
2. **Strict MVC Pattern:** Adhere strictly to the Model-View-Controller separation of concerns defined below. Never mix logic between these layers.
3. **Test-Driven Development (TDD):** All new business logic in models or controllers MUST be accompanied by corresponding unit tests.
4. **Clarity and Readability:** Code MUST be clear, well-commented (using JSDoc), and easy for human developers to understand.

## **1. Project Stack**

* **Language:** TypeScript / JavaScript (ES2020+)
* **Framework:** Node.js with Express.js
* **Module System:** ES Modules (ESM) over CommonJS. We use the modern import/export syntax as it is the official standard for JavaScript and the modern approach for Node.js. This enables features like top-level `await` for cleaner asynchronous code and allows for static analysis, which can improve optimisation. This supersedes the legacy CommonJS (`require`/`module.exports`) system.
* **Architecture:** Model-View-Controller (MVC)
* **Database:** SQLite3 with Sequelize ORM
* **Testing:** Vitest
* **Code Style:** Prettier (rules are defined in `.prettierrc`)

## **2. Security (High Priority)**

* **Input Sanitisation:** All incoming data from request bodies (`req.body`), query parameters (`req.query`), or route parameters (`req.params`) MUST be sanitised and validated before use. Use a library like express-validator.
* **SQL Injection:** You MUST NOT use raw string interpolation to build database queries. Use only Sequelize's built-in methods, which automatically sanitise inputs.
* **Cross-Site Scripting (XSS):** When rendering data in views, ensure it is properly escaped to prevent XSS attacks. Template engines like EJS often have mechanisms for this (e.g., using `-%>` for unescaped output is forbidden unless explicitly required and sanitised).
* **Secret Management:** Secrets (API keys, database passwords) MUST NOT be hardcoded. They must only be accessed via environment variables (e.g., `process.env.API_KEY`).
* **Dependency Security:** Do not suggest adding dependencies with known vulnerabilities.

## **3. Error Handling**

* **Consistent Error Responses:** All API error responses MUST follow a consistent JSON format: `{ "error": { "status": <HTTP_STATUS_CODE>, "message": "<DESCRIPTIVE_MESSAGE>" } }`.
* **Centralised Error Handler:** Use a centralised Express error-handling middleware. Controllers should use `next(error)` to pass errors to this handler.
* **Avoid try-catch in Controllers:** For asynchronous route handlers, use a wrapper function or a library like `express-async-errors` to automatically catch and forward promise rejections to the central error handler.

## **4. MVC (Model-View-Controller) Architecture**

This project enforces a strict separation of concerns.

### **4.1. Models (/models)**

* **Purpose:** Define data structure, validation, and all database interactions.
* **Rules:**
  * MUST contain all database query logic (using Sequelize).
  * MUST NOT interact directly with the Express `req` or `res` objects.
  * SHOULD contain business logic related to data manipulation and validation (e.g., password hashing, data formatting).
  * File Naming:`[resource-name].model.js` (e.g., `user.model.js`).

### **4.2. Views (/views)**

* **Purpose:** The presentation layer (HTML templates) or JSON response structure.
* **Rules:**
  * MUST NOT contain any database queries or complex business logic.
  * MUST only render data provided to it by a controller.
  * For APIs, the "view" is the JSON response sent by the controller. This response MUST be structured cleanly and predictably.

### **4.3. Controllers (/controllers)**

* **Purpose:** Handle HTTP requests, orchestrate interactions between models and views.
* **Rules:**
  * MUST handle the Express `req` and `res` objects.
  * MUST call methods from the models to fetch or persist data.
  * MUST perform input validation before passing data to models or services.
  * MUST decide which view to render or what JSON data to send as a response.
  * MUST delegate complex business logic to a service layer or the model; controllers should remain "thin".
  * File Naming: `[resource-name].controller.js` (e.g., `user.controller.js`).

## **5. Unit Testing (**tests**)**

* **Framework:** Use Vitest for all tests.
* **Location:** Test files MUST located and `/tests` director and be named `[file-name].test.js` or `[file-name].spec.js`.
* **Best Practices:**
  * **AAA Pattern:** Structure tests using Arrange, Act, Assert.
  * **Isolation:** Tests MUST be independent. Use `beforeEach` and `afterEach` to reset state and mocks.
  * **Mocking:** External dependencies (except database) MUST be mocked using `jest.mock()`. Unit tests should utilise the test database `test-old-man-footy.db`.
  * **Test Order:** When generating a full test suite for a feature, create tests in this order: Model -> Service (if any) -> Controller.
  * **Running Tests:** The command to test a single component is `npm test -- "<file-name>.test.js"`.

## **6. Database & Migrations**

* **ORM:** Use Sequelize with SQLite.
* **Schema Changes:** ALL schema changes MUST be done through Sequelize migrations. Do not alter the database schema manually.
  * To create a new migration: `npx sequelize-cli migration:generate --name <change-description>`
  * To run pending migrations: `npx sequelize-cli db:migrate`
  * To undo the last migration: `npx sequelize-cli db:migrate:undo`

## **7. Static Assets & Styling (/public)**

* **Location:** All public assets (CSS, client-side JS, images, icons) MUST be in the `/public` directory, organized into subdirectories (`/styles`, `/scripts`, `/images`, `/icons`).
* **Styling:** All CSS rules MUST be in external `.css` files within `/public/styles`. You MUST NOT use inline `style` attributes or CSS-in-JS. Styles MUST be authored to support both **light and dark modes**, preferably using CSS custom properties (variables) for colours that can be toggled with a `prefers-color-scheme` media query.
* **Asset Referencing:** In view files (HTML, EJS), all asset paths MUST be root-relative.
  * **Correct:** `<link rel="stylesheet" href="/styles/main.css">`
  * **Incorrect:** `<link rel="stylesheet" href="../public/styles/main.css">`

## **8. Client-Side Scripting**

* **Principle:** You MUST NOT embed client-side application logic directly within `<script>` tags in `.ejs` or other view files. All client-side JavaScript MUST be placed in external `.js` files within the `/public/js/` directory. This enforces a clean separation between server-rendered templates and client-side behaviour, improving maintainability and security.
* **Passing Data to Scripts:** To pass dynamic data from a controller to a client-side script, attach it to the DOM using `data-*` attributes. The external script can then read these attributes.

* **Incorrect Example (Logic embedded in EJS):**

    ```html
    <h2>Welcome, <%= user.name %></h2>
    <script>
      // Bad: Business logic and data access are mixed directly into the template.
      const userId = <%= user.id %>;
      console.log('User ID is:', userId);
      if (userId) {
        fetch(`/api/users/${userId}/activity`)
          .then(res => res.json())
          .then(data => console.log(data));
      }
    </script>
    ```

* **Correct Example (Logic separated into a .js file):**

    ```html
    <div id="user-profile" data-user-id="<%= user.id %>">
      <h2>Welcome, <%= user.name %></h2>
    </div>

    <script src="/js/user-profile.js"></script>
    ```

    ```javascript
    // public/js/user-profile.js - CORRECT
    document.addEventListener('DOMContentLoaded', () => {
      const profileElement = document.getElementById('user-profile');
      if (profileElement) {
        // Data is cleanly read from the DOM
        const userId = profileElement.dataset.userId;

        console.log(`Setting up profile script for user ID: ${userId}`);

        // All client-side logic is cleanly separated here
        fetch(`/api/users/${userId}/activity`)
          .then(res => res.json())
          .then(data => {
            // e.g., update the DOM with activity data
          })
          .catch(err => console.error('Failed to fetch user activity:', err));
      }
    });
    ```

## **9. Documentation**

* **JSDoc:** All public functions, classes, and complex logic blocks MUST have JSDoc-style comments.
* **README.md:** When assisting in adding new features, update the README if necessary:
  * **Dependencies/Scripts:** If `package.json` changes, update the "Installation" section.
  * **Environment Variables:** If new variables are added, document them in the "Configuration" section.
  * **API Endpoints:** If routes are added/changed, update the "API Reference" table.
* **Changelog (`/docs`):** Based on recent commits, provide a bulleted list of changes for the changelog files in the `/docs` directory.

### **Example Prompts for Copilot**

`@workspace /copilot Based on my last 3 commits, please generate a summary for the /docs/changelog.md file`.

`@workspace /copilot I've added a new API_KEY to the config. Please update the "Configuration" section in the README.md to document it`.

`@workspace /copilot Generate a Jest unit test for the createUser method in user.controller.js. Remember to mock the user.model.js dependency.`
