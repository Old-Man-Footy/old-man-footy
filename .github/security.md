## **2. Security (High Priority)**

  * **Input Sanitisation:** All incoming data from request bodies (`req.body`), query parameters (`req.query`), or route parameters (`req.params`) MUST be sanitised and validated before use. Use a library like `express-validator`.
  * **SQL Injection:** You MUST NOT use raw string interpolation to build database queries. Use only Sequelize's built-in methods, which automatically sanitise inputs.
  * **Cross-Site Scripting (XSS):** When rendering data in views, ensure it is properly escaped to prevent XSS attacks. Template engines like EJS often have mechanisms for this (e.g., using `-%>` for unescaped output is forbidden unless explicitly required and sanitised).
  * **Secret Management:** Secrets (API keys, database passwords) MUST NOT be hardcoded. They must only be accessed via environment variables (e.g., `process.env.API_KEY`).
  * **Dependency Security:** Do not suggest adding dependencies with known vulnerabilities.