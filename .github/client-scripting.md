## **8. Client-Side Scripting**

  * **Principle:** You MUST NOT embed client-side application logic directly within `<script>` tags in `.ejs` or other view files. All client-side JavaScript MUST be placed in external `.js` files within the `/public/js/` directory. This enforces a clean separation between server-rendered templates and client-side behaviour, improving maintainability and security.

  * **Public JavaScript: The Manager Object Pattern:** All public JavaScript files MUST use the `export const descriptiveManager = { ... }` pattern to encapsulate functionality. This pattern allows for better organization, modularity, and testability of client-side code.
    ### Key Principles:
      * **Single Exported Object**: All functions and state should be contained within a single `export const descriptiveManager = { ... };`.
      * **`initialize` Method**: The object must have an `initialize()` method that serves as the main entry point. This method is responsible for setting up the entire module.
      * **Cache DOM Elements**: The `initialize()` method should first call a `cacheElements()` method. This method finds all necessary DOM elements and stores them on a `this.elements` object for easy and efficient access.
      * **Event Listeners in `initialize`**: All event listeners should be attached within the `initialize()` method (or in helper methods called by `initialize`). Event handlers should call other methods on the object using `this` (e.g., `this.handleSubmit()`).
      * **Browser-Specific Code at the Bottom**: The `DOMContentLoaded` event listener, which kicks everything off in the browser, should be at the very bottom of the file, outside the manager object. Its only job is to call `managerName.initialize()`.
      * **Example:**
      ```javascript
      // public/js/example-manager.js
      export const exampleManager = {
        elements: {},

        initialize() {
          this.cacheElements();
          this.bindEvents();
          console.log('Example Manager initialized');
        },

        cacheElements() {
          this.elements.button = document.querySelector('#example-button');
          // Cache other elements as needed
        },

        bindEvents() {
          this.elements.button.addEventListener('click', this.handleButtonClick.bind(this));
        },

        handleButtonClick(event) {
          console.log('Button clicked:', event);
          // Handle button click logic
        }
      };
      // At the bottom of the file
      document.addEventListener('DOMContentLoaded', () => {
        exampleManager.initialize();
      });      
      ```

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