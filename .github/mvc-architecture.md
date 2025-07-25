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