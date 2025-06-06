# **GitHub Copilot Instructions for this Node.js Project**

This document provides rules and guidelines for GitHub Copilot to follow when assisting with development in this repository. The goal is to ensure consistency, maintain high-quality code, and follow established best practices for Node.js web applications.

## **General Principles**

* **Language:** All code should be written in modern JavaScript (ES2020+) or TypeScript, depending on the file's context.  
* **Style:** Code should be formatted consistently. Assume [Prettier](https://prettier.io/) is used for code formatting.  
* **Comments:** Use JSDoc-style comments for all public functions, classes, and complex logic blocks to ensure clarity.

## **1\. Documentation**

Maintaining up-to-date and accurate documentation is crucial. Copilot should assist in keeping both the project's README.md and the build progress logs in the /docs directory current.

### **1.1. Updating the README.md**

When changes are made to core configuration or setup, the README.md must be updated. Pay close attention to:

* **package.json:** If new dependencies, scripts (e.g., npm run dev), or Node.js version requirements are added, update the "Installation" or "Getting Started" sections of the README.  
* **Environment Variables:** If a new environment variable is added to .env.example or a configuration file (e.g., /config/config.js), ensure it is documented in the "Configuration" section of the README with a clear description of its purpose.  
* **API Endpoints:** If new routes are added or existing ones are modified in the /routes directory, update the "API Reference" table in the README to reflect the changes (HTTP method, path, and description).

**Example Prompt for Copilot:**

@workspace /copilot update the README.md file to include the new dependencies and environment variables I've just added.

### **1.2. Tracking Build Progress in /docs**

The /docs directory contains Markdown files (.md) that serve as a changelog or progress report for development sprints or major feature builds.

* After completing a feature or a set of significant commits, your task is to summarise the changes and append them to the relevant file in /docs.  
* The summary should be a bulleted list. Each item should clearly describe the change (e.g., "Feature: Added user authentication endpoint," "Fix: Resolved memory leak in data processing service," "Refactor: Simplified database query logic in user model.").  
* If a relevant progress file for the current version or sprint doesn't exist, create one (e.g., /docs/sprint-3-summary.md).

**Example Prompt for Copilot:**

@workspace /copilot based on my last 5 commits, update the /docs/changelog.md with a summary of the changes.

## **2\. MVC (Model-View-Controller) Architecture**

This project follows the MVC architectural pattern. Adhere strictly to the separation of concerns outlined below. All new features must be implemented following this structure.

### **2.1. Models (/models)**

* **Purpose:** Models are responsible exclusively for data structure, validation, and database interaction. They are the single source of truth for all data-related logic.  
* **Rules:**  
  * All database queries (e.g., using an ORM like Sequelize or Mongoose) must be contained within model files.  
  * Models must **not** interact directly with the request or response objects from the web server (e.g., Express).  
  * Business logic related to data manipulation (e.g., formatting user data, calculating values) belongs here.  
  * Files should be named after the data they represent (e.g., user.model.js, product.model.js).

### **2.2. Views (/views)**

* **Purpose:** Views are responsible for the presentation layer. For a traditional web application, these are the template files (e.g., EJS, Pug) that generate the HTML sent to the user.  
* **Rules:**  
  * For APIs, the "view" is the JSON response. The structure of this JSON response is determined by the controller but should be kept clean and predictable.  
  * Views must **not** contain any database queries or complex business logic. They should only receive data from controllers and render it.

### **2.3. Controllers (/controllers)**

* **Purpose:** Controllers act as the intermediary between Models and Views. They handle incoming HTTP requests, process user input, and orchestrate the application's response.  
* **Rules:**  
  * A controller's primary role is to handle req and res objects.  
  * They should call methods from the Models to fetch or update data.  
  * They are responsible for input validation and sanitisation before passing data to the models.  
  * They decide which view to render or what JSON data to send back as a response.  
  * Keep controllers "thin." Complex business logic should be delegated to service layers or models.  
  * Files should be named after the resource they manage (e.g., user.controller.js, product.controller.js).

## **3\. Static Assets & Styling**

Guidelines for managing static assets and styles to ensure a clean and efficient project structure.

### **3.1. Asset Storage Location**

* All static, publicly accessible assets **must** be stored in the /public directory at the root of the project.  
* Use subdirectories within /public to organize assets by type:  
  * /public/styles for all CSS files.  
  * /public/images for .jpg, .png, .svg files.  
  * /public/icons for favicons and feature-specific icons.  
  * /public/scripts for client-side JavaScript files.

### **3.2. Styling Implementation**

* **Centralized Stylesheets:** All CSS rules **must** be defined within .css files located in the /public/styles directory. This ensures a single source of truth for the application's appearance.  
* **No Inline Styles or CSS-in-JS:** Avoid using inline style attributes on HTML elements and refrain from using CSS-in-JS libraries. All styling logic must be handled by external stylesheets to maintain a strict separation of concerns.  
* **Linking:** Link the main stylesheet(s) in the \<head\> of the primary layout or view file (e.g., main.ejs or index.html) to make them globally available.

### **3.3. Referencing Assets**

* When referencing assets in view files (e.g., HTML, EJS), use root-relative paths. Assume the /public directory is being served as the static root.  
  * **Correct:** \<img src="/images/logo.png"\> or \<link rel="stylesheet" href="/styles/main.css"\>  
  * **Incorrect:** \<img src="../public/images/logo.png"\>

### **3.4. Asset Optimization**

* Before committing images, ensure they are optimized for the web to reduce file size.  
* Prefer modern, efficient formats like SVG for icons and WebP for photographic images where browser support allows.

## **4\. Unit Testing**

A robust test suite is essential for maintaining a stable and reliable application. We use the [Jest](https://jestjs.io/) testing framework.

### **4.1. Test File Location and Naming**

* All test files must be located alongside the files they are testing, within a \_\_tests\_\_ subdirectory, or have a .test.js or .spec.js suffix (e.g., user.controller.test.js).

### **4.2. Unit Testing Best Practices**

When writing unit tests, follow these standards:

* **Isolation:** Tests must be independent. The result of one test should never affect another. Use beforeEach or afterEach hooks to reset state and mocks.  
* **Mocking:** All external dependencies, especially database connections and external API calls, **must** be mocked using Jest's built-in mocking functionality (jest.mock()). A unit test for a controller should not make a real database call.  
* **Focus:** Test one piece of logic at a time. A single test case should verify a single outcome.  
* **AAA Pattern:** Structure tests using the Arrange, Act, Assert pattern.  
  1. **Arrange:** Set up the test, including mock data and mocked dependencies.  
  2. **Act:** Execute the function or method being tested.  
  3. **Assert:** Verify that the outcome is as expected using Jest's matchers (e.g., expect(result).toBe(true)).  
* **Coverage:** Aim to test all business logic within controllers and models. Pay special attention to edge cases, error handling paths, and validation logic.

**Example Prompt for Copilot:**

@workspace /copilot write unit tests for the 'createUser' function in user.controller.js. Make sure to mock the user model and test for both successful creation and error cases.