## **8. Client-Side Scripting**

  * **Principle:** You **MUST NOT** embed client-side application logic directly within `<script>` tags in `.ejs` or other view files. All client-side JavaScript **MUST** be placed in external `.js` files within the `/public/js/` directory. This enforces a clean separation between server-rendered templates and client-side behaviour, improving maintainability and security.

  * **Public JavaScript: The Manager Object Pattern:** All public JavaScript files **MUST** use the `export const descriptiveManager = { ... }` pattern to encapsulate functionality. This pattern allows for better organisation, modularity, and testability of client-side code.

    ### Key Principles:

      * **Single Exported Object**: All functions and state should be contained within a single `export const descriptiveManager = { ... };`.
      * **`initialize` Method**: The object must have an `initialize()` method that serves as the main entry point. This method is responsible for setting up the entire module.
      * **Cache DOM Elements**: The `initialize()` method should first call a `cacheElements()` method. This method finds all necessary DOM elements and stores them on a `this.elements` object for easy and efficient access.
      * **Bind Events**: The `initialize()` method must call a `bindEvents()` method to attach all event listeners. Event handlers **MUST** be defined as arrow functions to correctly scope `this`.
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
            this.elements.button.addEventListener('click', this.handleButtonClick);
          },

          handleButtonClick: (event) => {
            console.log('Button clicked:', event);
            // 'this' correctly refers to exampleManager
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

    <script type="module" src="/js/user-profile.js"></script>
    ```


  ### Refactoring an Existing JavaScript File

  This guide outlines how to restructure an existing `.js` file to conform to the **Manager Object Pattern**. The goal is to reorganise the code into the new standard without losing functionality.

  #### Refactoring Process

  1.  **Introduce the Manager Structure**: Open the existing `.js` file. At the top, create the `export const managerName = { ... }` object. Move all existing code from the file *inside* this object.

  2.  **Organise Properties and Elements**:

        * Move any global variables into the top of the manager object as **properties**.
        * Move all DOM element selections (e.g., `document.getElementById`) into the `cacheElements()` method and assign them to `this.elements`.

  3.  **Convert Functions to Methods**:

        * Create `initialize()` and `bindEvents()` methods.
        * Move existing event listener attachments (`.addEventListener()`) into the `bindEvents()` method.
        * Convert all standalone functions into **methods** of the manager object.
        * Rewrite event handler functions as **arrow functions** to correctly scope `this`.

  4.  **Update References**:

        * Perform a find-and-replace to update calls between old functions to use the `this` keyword (e.g., if `validateInput()` is now a method, call it with `this.validateInput()`).
        * Update all code that references DOM elements to use the cached versions (e.g., `this.elements.submitButton`).

  5.  **Finalise and Clean Up**:

        * Add the `DOMContentLoaded` listener to the bottom of the file to call `managerName.initialize()`.
        * In the corresponding `.ejs` view, ensure the `<script>` tag includes `type="module"`.
        * Delete any old, duplicate functions or global variables that have been successfully integrated into the manager object.

  -----

  ### Refactoring Example

  Here’s how to refactor an existing `edit-post.js` file that doesn't follow the pattern.

  #### Before Refactoring

  **`public/js/edit-post.js` (Old Structure)**

  ```javascript
  // Global variables
  const form = document.getElementById('edit-post-form');
  const postId = form.dataset.postId;

  // Event listener in the global scope
  form.addEventListener('submit', handleFormSubmit);

  // Standalone function
  function handleFormSubmit(event) {
    event.preventDefault();
    const formData = new FormData(form);
    const title = formData.get('title');

    // Another standalone function call
    updatePost(title);
  }

  // Another standalone function
  function updatePost(title) {
    fetch(`/api/posts/${postId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title })
    })
    .then(res => res.json())
    .then(data => console.log('Post updated:', data))
    .catch(err => console.error('Update failed:', err));
  }
  ```

  #### After Refactoring

  **`public/js/edit-post.js` (New Manager Structure)**

  ```javascript
  export const editPostManager = {
    elements: {},
    postId: null,

    initialize() {
      this.cacheElements();
      this.bindEvents();
      this.postId = this.elements.form.dataset.postId;
    },

    cacheElements() {
      this.elements.form = document.getElementById('edit-post-form');
    },

    bindEvents() {
      this.elements.form.addEventListener('submit', this.handleFormSubmit);
    },

    handleFormSubmit: (event) => {
      event.preventDefault();
      const formData = new FormData(editPostManager.elements.form);
      const title = formData.get('title');

      // Call is now a method of the object
      editPostManager.updatePost(title);
    },

    updatePost(title) {
      fetch(`/api/posts/${this.postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title })
      })
      .then(res => res.json())
      .then(data => console.log('Post updated:', data))
      .catch(err => console.error('Update failed:', err));
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    editPostManager.initialize();
  });
  ```