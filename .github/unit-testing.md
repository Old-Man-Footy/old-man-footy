## **5. Unit Testing (/tests)**

  * **Framework:** Use **Vitest** for all tests.
  * **Location:** Test files MUST be located in the `/tests` directory in subdirectory of the type (e.g. `/middleware` or `/services`) and be named `[file-name].test.mjs` **IMPORTANT**.
  * **Best Practices For Server Side:**
      * **AAA Pattern:** Structure tests using Arrange, Act, Assert.
      * **Isolation:** Tests MUST be independent. Use `beforeEach` and `afterEach` to reset state and mocks.
      * **Mocking:** External dependencies MUST be mocked using `vi.mock()` in Unit tests. End to End tests will utilise the test database `test-old-man-footy.db`.
      * **Test Order:** When generating a full test suite for a feature, create tests in this order: Model -> Service (if any) -> Controller.
      * **Running Tests:** The command to test a single component is `npm test -- "<file-name>.test.mjs"`.
      * **Test Coverage:** Aim for 100% coverage on all models and controllers. Use `vitest --coverage` to check coverage reports.
  * **Best Practices For Client Side:**
      * **Import the Manager:** Import the single manager object at the top of your test file: `import { exampleManager } from '...'`.
      * **Use a setupDOM Function:** Do not manually mock the `document` object. Instead, create a helper function `setupDOM()` that sets `document.body.innerHTML` to the exact HTML structure the script requires. This is the most robust and reliable way to test DOM interactions.
      * **Standard beforeEach / afterEach:** Use a beforeEach block to run `setupDOM()` and call `exampleManager.initialize()`. This ensures each test runs with a fresh, clean environment. Use `afterEach` to clean up mocks and the DOM.
      * **Test Methods Directly:** Your it blocks should call methods directly on the imported manager object (e.g., `exampleManager.handleAction()`).
      * **Spy on Methods for Interaction:** To test that one method correctly calls another, use `vi.spyOn(exampleManager, 'methodToSpyOn')`.
      * **Simulate User Events:** Use `element.dispatchEvent(new Event('click'))` to trigger event listeners that were set up in the `initialize` method.
      * **Example Test:**
      ```javascript
        import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
        // Import the manager object directly
        import { exampleManager } from '/public/js/example-manager.js';

        /**
        * @file example-manager.test.js
        * @description Unit tests for exampleManager.
        */

        // Helper function to set up the DOM for each test
        function setupDOM() {
            document.body.innerHTML = `
                <button id="actionButton">Click Me</button>
                <div id="statusMessage"></div>
            `;
        }

        describe('exampleManager', () => {
            beforeEach(() => {
                // Set up the DOM
                setupDOM();
                // Initialize the manager, which caches elements and sets up listeners
                exampleManager.initialize();
            });

            afterEach(() => {
                // Clean up mocks and the DOM
                vi.restoreAllMocks();
                document.body.innerHTML = '';
            });

            it('should update the status message when handleAction is called', () => {
                const statusMessage = document.getElementById('statusMessage');
                
                // Call the method directly
                exampleManager.handleAction();

                // Assert the result
                expect(statusMessage.textContent).toBe('Action Performed!');
            });

            it('should call handleAction when the action button is clicked', () => {
                // Spy on the method we expect to be called
                const handleActionSpy = vi.spyOn(exampleManager, 'handleAction');
                const actionButton = document.getElementById('actionButton');

                // Simulate the user event
                actionButton.dispatchEvent(new Event('click'));

                // Assert that the event handler called our method
                expect(handleActionSpy).toHaveBeenCalled();
            });

            it('should call logMessage from within handleAction', () => {
                // Spy on the internal helper method
                const logMessageSpy = vi.spyOn(exampleManager, 'logMessage').mockImplementation(() => {});

                // Call the public method
                exampleManager.handleAction();

                // Assert that the internal method was called
                expect(logMessageSpy).toHaveBeenCalledWith('Action was handled.');
            });
        });
      ```

  * **Important:** 
    * Do not generate tests that are not directly related to the business logic of the model or controller. Tests should not be generated for trivial getters/setters or simple data structures unless they contain significant logic.
    * Whenever changes are made to a test file, always execute after without asking for confirmation.
    * On test failures, if you have recommendations in Agent mode, always apply them without asking for confirmation.
    * Do not ask for confirmation of anything when in Agent mode where possible.