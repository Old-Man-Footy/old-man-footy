## **3. Error Handling**

  * **Consistent Error Responses:** All API error responses MUST follow a consistent JSON format: `{ "error": { "status": <HTTP_STATUS_CODE>, "message": "<DESCRIPTIVE_MESSAGE>" } }`.
  * **Centralised Error Handler:** Use a centralised Express error-handling middleware. Controllers should use `next(error)` to pass errors to this handler.
  * **Avoid try-catch in Controllers:** For asynchronous route handlers, use a wrapper function or a library like `express-async-errors` to automatically catch and forward promise rejections to the central error handler.