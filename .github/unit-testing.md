## **5. Unit Testing (/tests)**

  * **Framework:** Use **Vitest** for all tests.
  * **Location:** Test files MUST be located in the `/tests` directory in subdirectory of the type (e.g. `/middleware` or `/services`) and be named `[file-name].test.js` or `[file-name].spec.js`.
  * **Best Practices:**
      * **AAA Pattern:** Structure tests using Arrange, Act, Assert.
      * **Isolation:** Tests MUST be independent. Use `beforeEach` and `afterEach` to reset state and mocks.
      * **Mocking:** External dependencies MUST be mocked using `vi.mock()` in Unit tests. End to End tests will utilise the test database `test-old-man-footy.db`.
      * **Test Order:** When generating a full test suite for a feature, create tests in this order: Model -> Service (if any) -> Controller.
      * **Running Tests:** The command to test a single component is `npm test -- "<file-name>.test.js"`.
      * **Test Coverage:** Aim for 100% coverage on all models and controllers. Use `vitest --coverage` to check coverage reports.
  * **Important:** 
    * Do not generate tests that are not directly related to the business logic of the model or controller. Tests should not be generated for trivial getters/setters or simple data structures unless they contain significant logic.
    * Whenever changes are made to a test file, always execute after without asking for confirmation.
    * On test failures, if you have recommendations in Agent mode, always apply them without asking for confirmation.
    * Do not ask for confirmation of anything when in Agent mode where possible.